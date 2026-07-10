import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useStore } from "react-redux";
import {
	BackButton,
	SaveButton,
	CancelButton,
	ExportButton,
} from "../../components/navigation/HeaderActions";
import { downloadFromApi } from "../../utils/downloadCsv";
import EditableSheetTable from "../../components/common/EditableSheetTable";
import OperationProgressOverlay from "../../components/common/OperationProgressOverlay";
import ValidatedNameInput from "../../components/common/ValidatedNameInput";
import {
	useGetCopyMatrixQuery,
	useGetCopyMatrixRowsQuery,
	useDeleteCopyMatrixMutation,
	applyCopyMatrixUpdateToCaches,
} from "../../store/services/copyMatrix";
import { useGetMeQuery } from "../../store/services/userAuthApi";
import api from "../../store/services/api";
import { showSuccess, showError, showWarning } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { runJsonStepsWithProgress } from "../../utils/uploadWithProgress";
import { AUTO_ROW_ID_COLUMN } from "../../utils/constants";
import { isCopyMatrixRecreateMode, isCopyMatrixSynced } from "../../utils/copyMatrixHelpers";
import { formSelectClass } from "../../utils/formStyles";

const CopyMatrixPreview = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const readOnly = searchParams.get("mode") === "view";
	const creatingNewAssetSource =
		searchParams.get("intent") === "create-as";
	const dispatch = useDispatch();
	const store = useStore();
	const [page, setPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [name, setName] = useState("");
	const [uniqueColumn, setUniqueColumn] = useState("");
	const [pendingEdits, setPendingEdits] = useState({});
	const [isSavingOp, setIsSavingOp] = useState(false);
	const [saveProgress, setSaveProgress] = useState(0);
	const [savePhase, setSavePhase] = useState("saving");
	const [nameValidation, setNameValidation] = useState({
		isDuplicate: false,
		isChecking: false,
	});
	const tableRef = useRef(null);

	const collectEdits = () => {
		const flushed = tableRef.current?.flushActiveEdit?.();
		const merged = { ...pendingEdits };
		if (flushed?.rowId) {
			merged[flushed.rowId] = {
				...merged[flushed.rowId],
				...flushed.rowData,
			};
		}
		return Object.entries(merged).map(([rowId, data]) => {
			const rowData = { ...data };
			delete rowData._id;
			delete rowData.rowIndex;
			return { _id: rowId, rowData };
		});
	};

	const invalidateAfterSave = (assetUploadId) => {
		dispatch(
			api.util.invalidateTags([
				{ type: "CopyMatrices", id },
				{ type: "CopyMatrixRows", id },
				"AssetUploads",
			])
		);

		if (assetUploadId) {
			dispatch(
				api.util.invalidateTags([
					{ type: "AssetUploads", id: assetUploadId },
					{ type: "AssetSourceRows", id: assetUploadId },
				])
			);
		}
	};

	const {
		data: matrix,
		isLoading: isMatrixLoading,
		isFetching: isMatrixFetching,
	} = useGetCopyMatrixQuery(id, { refetchOnMountOrArgChange: true });
	const { data: rowsData, isLoading: isRowsLoading } =
		useGetCopyMatrixRowsQuery(
			{ id, page, limit: rowsPerPage },
			{ skip: !id }
		);

	const { data: meData } = useGetMeQuery();
	const accountId = matrix?.accountId || meData?.activeAccount?._id;

	const [deleteCopyMatrix] = useDeleteCopyMatrixMutation();

	const columns = useMemo(
		() => rowsData?.columns || matrix?.columns || [],
		[rowsData, matrix]
	);

	const rows = useMemo(() => {
		const serverRows = rowsData?.rows || [];
		return serverRows.map((row) => {
			const edit = pendingEdits[row._id];
			if (!edit) return row;
			return { ...row, ...edit };
		});
	}, [rowsData, pendingEdits]);

	const pagination = rowsData?.pagination || {
		page: 1,
		totalPages: 1,
		total: 0,
	};

	const matrixReady =
		!isMatrixLoading && !isMatrixFetching && Boolean(matrix);
	const isDraft = matrix?.status === "draft";
	const isSynced = matrixReady && isCopyMatrixSynced(matrix);
	const canEditMatrixName =
		matrixReady && !readOnly && !isSynced && !creatingNewAssetSource;
	const isUnsyncedFinalized =
		matrixReady &&
		!isDraft &&
		!creatingNewAssetSource &&
		!isSynced;
	const isRecreate =
		matrixReady && isCopyMatrixRecreateMode(matrix) && !isUnsyncedFinalized;
	const hasLinkedAssetSource =
		matrixReady &&
		!isDraft &&
		!isRecreate &&
		Boolean(matrix?.assetUploadId) &&
		!creatingNewAssetSource;
	const displayName = name || matrix?.name || "";
	const loading = isMatrixLoading || isRowsLoading;
	const hasNameConflict =
		nameValidation.isDuplicate || nameValidation.isChecking;
	const canFinishDraft =
		isDraft &&
		displayName.trim().length > 0 &&
		!hasNameConflict;
	const canSaveUnsynced =
		!isUnsyncedFinalized ||
		((!canEditMatrixName || displayName.trim().length > 0) &&
			!hasNameConflict);
	const primaryLabel = isSavingOp
		? "Saving..."
		: isDraft || hasLinkedAssetSource || isUnsyncedFinalized
		? "Save"
		: "Finish";

	useEffect(() => {
		if ((isDraft || canEditMatrixName) && matrix?.name && !name) {
			setName(matrix.name);
		}
		if (columns.length && !uniqueColumn && (isDraft || isRecreate || creatingNewAssetSource)) {
			setUniqueColumn(
				columns.includes(AUTO_ROW_ID_COLUMN)
					? AUTO_ROW_ID_COLUMN
					: matrix?.defaultUniqueColumn || AUTO_ROW_ID_COLUMN
			);
		}
	}, [
		matrix?.name,
		matrix?.defaultUniqueColumn,
		name,
		columns,
		uniqueColumn,
		isDraft,
		canEditMatrixName,
		isRecreate,
		creatingNewAssetSource,
	]);

	const handleCellChange = useCallback((rowId, rowData) => {
		setPendingEdits((prev) => ({
			...prev,
			[rowId]: { ...prev[rowId], ...rowData },
		}));
	}, []);

	const goToAssetSourceEdit = (
		assetUploadId,
		copyMatrixId = id,
		{
			requireNewAssetSourceName = false,
			suggestedAssetSourceName = "",
		} = {}
	) => {
		if (!assetUploadId) return;
		dispatch(
			api.util.invalidateTags([
				{ type: "AssetUploads", id: assetUploadId },
				{ type: "AssetSourceRows", id: assetUploadId },
			])
		);
		navigate(`/asset-sources/${assetUploadId}/preview`, {
			replace: true,
			state: {
				refreshFromCopyMatrix: true,
				copyMatrixId,
				syncedAt: Date.now(),
				requireNewAssetSourceName,
				...(requireNewAssetSourceName
					? {
							returnPath: "/asset-sources",
							suggestedAssetSourceName:
								suggestedAssetSourceName ||
								matrix?.name ||
								"",
						}
					: {}),
			},
		});
	};

	const handleBack = async () => {
		if (isSavingOp) return;
		if (isDraft) {
			try {
				await deleteCopyMatrix(id).unwrap();
			} catch {
				// ignore
			}
		}
		navigate("/copy-matrix");
	};

	const handleDownload = async () => {
		try {
			const exportName =
				displayName.trim() || matrix?.name || "copy-matrix";
			if (matrix?.assetUploadId) {
				await downloadFromApi(
					`/source/${matrix.assetUploadId}/export`,
					exportName
				);
			} else {
				await downloadFromApi(`/copy-matrix/${id}/export`, exportName);
			}
			showSuccess("Download started");
		} catch (error) {
			showError(error?.message || "Failed to download");
		}
	};

	const goToCopyMatrixList = () => {
		dispatch(
			api.util.invalidateTags([
				{ type: "CopyMatrixRows", id },
			])
		);
		navigate("/copy-matrix", { replace: true });
	};

	const handlePrimaryAction = async () => {
		if (isSavingOp || readOnly) return;
		if (isDraft && !canFinishDraft) return;
		if (isUnsyncedFinalized && !canSaveUnsynced) return;

		setIsSavingOp(true);
		setSaveProgress(0);
		setSavePhase("saving");

		try {
			if (hasLinkedAssetSource) {
				const edits = collectEdits();

				if (edits.length > 0) {
					const result = await runJsonStepsWithProgress(
						[
							{
								path: `/copy-matrix/${id}/rows`,
								method: "PUT",
								body: { rows: edits },
								phase: "saving",
							},
						],
						({ percent, phase }) => {
							setSaveProgress(percent);
							setSavePhase(phase);
						}
					);

					setPendingEdits({});
					const assetUploadId =
						result?.data?.assetUploadId || matrix?.assetUploadId;
					invalidateAfterSave(assetUploadId);
					showSuccess(
						result?.message || "Copy matrix saved successfully"
					);
				} else {
					showSuccess("No changes to save");
				}

				goToCopyMatrixList();
				return;
			}

			if (isUnsyncedFinalized) {
				const steps = [];
				const edits = collectEdits();

				if (edits.length > 0) {
					steps.push({
						path: `/copy-matrix/${id}/rows`,
						method: "PUT",
						body: { rows: edits },
						phase: "saving",
					});
				}

				const trimmedName = displayName.trim();
				if (
					canEditMatrixName &&
					trimmedName &&
					trimmedName !== matrix?.name
				) {
					steps.push({
						path: `/copy-matrix/${id}`,
						method: "PUT",
						body: { name: trimmedName },
						phase: "saving",
					});
				}

				if (steps.length === 0) {
					showSuccess("No changes to save");
					goToCopyMatrixList();
					return;
				}

				const result = await runJsonStepsWithProgress(steps, ({
					percent,
					phase,
				}) => {
					setSaveProgress(percent);
					setSavePhase(phase);
				});

				setPendingEdits({});

				const updated =
					trimmedName && trimmedName !== matrix?.name
						? {
								name: trimmedName,
								updatedAt:
									result?.data?.updatedAt ||
									new Date().toISOString(),
							}
						: result?.data?.name != null
						? result.data
						: null;

				if (updated) {
					applyCopyMatrixUpdateToCaches(
						dispatch,
						store.getState,
						id,
						updated,
						accountId
					);
				}

				showSuccess("Copy matrix saved successfully");
				goToCopyMatrixList();
				return;
			}

			if (isDraft) {
				const steps = [];
				const edits = collectEdits();

				if (edits.length > 0) {
					steps.push({
						path: `/copy-matrix/${id}/rows`,
						method: "PUT",
						body: { rows: edits },
						phase: "saving",
					});
				}

				steps.push({
					path: `/copy-matrix/${id}/finish`,
					method: "POST",
					body: {
						name: displayName.trim() || matrix?.name,
						uniqueColumn: uniqueColumn || AUTO_ROW_ID_COLUMN,
						finalizeOnly: true,
					},
					phase: "processing",
				});

				const result = await runJsonStepsWithProgress(steps, ({
					percent,
					phase,
				}) => {
					setSaveProgress(percent);
					setSavePhase(phase);
				});

				setPendingEdits({});
				showSuccess(result?.message || "Copy matrix saved");
				goToCopyMatrixList();
				return;
			}

			if (isRecreate || creatingNewAssetSource) {
				const steps = [];
				const edits = collectEdits();

				if (edits.length > 0) {
					steps.push({
						path: `/copy-matrix/${id}/rows`,
						method: "PUT",
						body: { rows: edits },
						phase: "saving",
					});
				}

				const useRecreateFinish =
					isRecreate || creatingNewAssetSource;

				steps.push({
					path: `/copy-matrix/${id}/finish`,
					method: "POST",
					body: useRecreateFinish
						? {
								uniqueColumn:
									uniqueColumn || AUTO_ROW_ID_COLUMN,
								...(creatingNewAssetSource
									? { forceNewAssetSource: true }
									: {}),
							}
						: {
								name: displayName.trim() || matrix?.name,
								uniqueColumn:
									uniqueColumn || AUTO_ROW_ID_COLUMN,
							},
					phase: "processing",
				});

				const result = await runJsonStepsWithProgress(steps, ({
					percent,
					phase,
				}) => {
					setSaveProgress(percent);
					setSavePhase(phase);
				});

				setPendingEdits({});
				const assetUploadId = result?.data?.assetUploadId;
				invalidateAfterSave(assetUploadId);

				if (!assetUploadId) {
					showError(
						"Asset source was not created. Please try again."
					);
					return;
				}

				if (result?.data?.uniqueColumnNotice) {
					showWarning(result.data.uniqueColumnNotice);
				} else {
					showSuccess(result?.message || "Copy matrix saved");
				}

				goToAssetSourceEdit(assetUploadId, id, {
					requireNewAssetSourceName: creatingNewAssetSource,
				});
			}
		} catch (error) {
			showError(getApiErrorMessage(error));
		} finally {
			setIsSavingOp(false);
			setSaveProgress(0);
			setSavePhase("saving");
		}
	};

	const subtitle = readOnly
		? "View only"
		: isDraft
		? "Edit the copy matrix, then Save to return to the list"
		: creatingNewAssetSource
		? "Edit if needed, then Finish to create a new asset source"
		: hasLinkedAssetSource
		? "Edit the copy matrix, then Save to return to the list"
		: isUnsyncedFinalized
		? "Edit the copy matrix, then Save to return to the list"
		: isRecreate
		? "Edit if needed, then Finish — set the asset source name on the next screen"
		: "Click any cell to edit before finishing";

	if (!matrixReady && loading) {
		return (
			<div className="bg-white min-h-full flex items-center justify-center">
				<span className="loading loading-spinner loading-lg text-primary" />
			</div>
		);
	}

	return (
		<div className="bg-white min-h-full">
			<OperationProgressOverlay
				visible={isSavingOp}
				percent={saveProgress}
				phase={savePhase}
				mode="save"
				title="Saving copy matrix"
			/>
			<div className="bg-white px-8 py-4 border-b sticky top-0 z-50">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-2xl font-bold text-[#413d42]">
							Copy Matrix Preview
						</h1>
						<p className="text-sm text-gray-500 mt-1">{subtitle}</p>
					</div>
					<div className="flex gap-3 items-center">
						<BackButton label="Back" onClick={handleBack} />
						{/* <ExportButton onClick={handleDownload} /> */}
						{!readOnly && (
							<>
								<CancelButton onClick={handleBack} />
								<SaveButton
									label={primaryLabel}
									onClick={handlePrimaryAction}
									disabled={
										isSavingOp ||
										(isDraft && !canFinishDraft) ||
										(isUnsyncedFinalized && !canSaveUnsynced)
									}
								/>
							</>
						)}
					</div>
				</div>
			</div>

			<div className="px-8 py-4 border-b bg-gray-50">
				<div className="flex flex-wrap items-start gap-6">
					<div className="min-w-[200px]">
						{isDraft || canEditMatrixName ? (
							<ValidatedNameInput
								label="Matrix Name"
								value={displayName}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. AMR_PRSP"
								accountId={accountId}
								type="copyMatrix"
								excludeId={id}
								enabled={Boolean(accountId) && !readOnly}
								className="max-w-md"
								onValidationChange={setNameValidation}
							/>
						) : (
							<>
								<label className="block text-sm font-semibold text-gray-700 mb-1">
									Matrix Name
								</label>
								<div className="w-full max-w-md px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800">
									{matrix?.name || "—"}
								</div>
							</>
						)}
					</div>
					{(isDraft || isRecreate || creatingNewAssetSource) &&
						columns.length > 0 && (
						<div className="min-w-[180px]">
							<label className="block text-sm font-semibold text-gray-700 mb-1">
								Unique Column
							</label>
							<select
								value={uniqueColumn}
								onChange={(e) => setUniqueColumn(e.target.value)}
								className={formSelectClass}
								disabled={readOnly}
							>
								{columns.map((col) => (
									<option key={col} value={col}>
										{col === AUTO_ROW_ID_COLUMN
											? `${col} (default — always unique)`
											: col}
									</option>
								))}
							</select>
							<p className="text-xs text-gray-500 mt-1">
								Default is {AUTO_ROW_ID_COLUMN}. If your
								selection is not unique,{" "}
								{AUTO_ROW_ID_COLUMN} will be used automatically.
							</p>
						</div>
					)}
					<div className="text-sm text-gray-500">
						{matrix?.fileName && (
							<span className="mr-4">{matrix.fileName}</span>
						)}
						{matrix?.processedRows != null && (
							<span>{matrix.processedRows} rows</span>
						)}
					</div>
				</div>
			</div>

			<div className="px-6 py-4">
				<EditableSheetTable
					ref={tableRef}
					columns={columns}
					rows={rows}
					loading={loading}
					page={page}
					rowsPerPage={rowsPerPage}
					pagination={pagination}
					onPageChange={setPage}
					onRowsPerPageChange={(val) => {
						setRowsPerPage(val);
						setPage(1);
					}}
					onCellChange={readOnly ? undefined : handleCellChange}
					readOnly={readOnly}
					readOnlyColumns={[AUTO_ROW_ID_COLUMN]}
				/>
			</div>
		</div>
	);
};

export default CopyMatrixPreview;
