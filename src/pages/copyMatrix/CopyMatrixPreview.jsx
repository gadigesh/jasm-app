import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
	BackButton,
	SaveButton,
	CancelButton,
	ExportButton,
} from "../../components/navigation/HeaderActions";
import { downloadFromApi } from "../../utils/downloadCsv";
import EditableSheetTable from "../../components/common/EditableSheetTable";
import OperationProgressOverlay from "../../components/common/OperationProgressOverlay";
import {
	useGetCopyMatrixQuery,
	useGetCopyMatrixRowsQuery,
	useDeleteCopyMatrixMutation,
} from "../../store/services/copyMatrix";
import api from "../../store/services/api";
import { showSuccess, showError, showWarning } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { runJsonStepsWithProgress } from "../../utils/uploadWithProgress";
import { AUTO_ROW_ID_COLUMN } from "../../utils/constants";
import {
	formInputClass,
	formSelectClass,
} from "../../utils/formStyles";

const CopyMatrixPreview = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const [page, setPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [name, setName] = useState("");
	const [uniqueColumn, setUniqueColumn] = useState("");
	const [pendingEdits, setPendingEdits] = useState({});
	const [isSavingOp, setIsSavingOp] = useState(false);
	const [saveProgress, setSaveProgress] = useState(0);
	const [savePhase, setSavePhase] = useState("saving");
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
				"CopyMatrices",
				{ type: "CopyMatrices", id },
				"CopyMatrixRows",
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

	const { data: matrix, isLoading: isMatrixLoading } =
		useGetCopyMatrixQuery(id);
	const { data: rowsData, isLoading: isRowsLoading } =
		useGetCopyMatrixRowsQuery(
			{ id, page, limit: rowsPerPage },
			{ skip: !id }
		);

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

	const displayName = name || matrix?.name || "";
	const loading = isMatrixLoading || isRowsLoading;
	const isDraft = matrix?.status === "draft";
	const canContinue = Boolean(matrix?.assetUploadId);

	useEffect(() => {
		if (matrix?.name && !name) setName(matrix.name);
		if (columns.length && !uniqueColumn) {
			setUniqueColumn(
				columns.includes(AUTO_ROW_ID_COLUMN)
					? AUTO_ROW_ID_COLUMN
					: matrix?.defaultUniqueColumn || AUTO_ROW_ID_COLUMN
			);
		}
	}, [matrix?.name, matrix?.defaultUniqueColumn, name, columns, uniqueColumn]);

	const handleCellChange = useCallback((rowId, rowData) => {
		setPendingEdits((prev) => ({
			...prev,
			[rowId]: { ...prev[rowId], ...rowData },
		}));
	}, []);

	const goToAssetSourceEdit = (assetUploadId, copyMatrixId = id) => {
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
			},
		});
	};

	const handleBack = async () => {
		if (isSavingOp) return;
		if (matrix?.status === "draft") {
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
			const exportName = displayName.trim() || matrix?.name || "copy-matrix";
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

	const handleContinue = async () => {
		if (isSavingOp) return;

		setIsSavingOp(true);
		setSaveProgress(0);
		setSavePhase("saving");

		try {
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
				invalidateAfterSave(result?.data?.assetUploadId);

				if (result?.data?.uniqueColumnNotice) {
					showWarning(result.data.uniqueColumnNotice);
				} else {
					showSuccess(result?.message || "Copy matrix saved");
				}

				goToAssetSourceEdit(result?.data?.assetUploadId);
				return;
			}

			const edits = collectEdits();
			if (edits.length === 0) {
				goToAssetSourceEdit(matrix?.assetUploadId);
				return;
			}

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
			invalidateAfterSave(
				result?.data?.assetUploadId || matrix?.assetUploadId
			);
			showSuccess("Changes saved");
			goToAssetSourceEdit(
				result?.data?.assetUploadId || matrix?.assetUploadId
			);
		} catch (error) {
			showError(
				getApiErrorMessage(error, "Could not save the copy matrix.")
			);
		} finally {
			setIsSavingOp(false);
			setSaveProgress(0);
			setSavePhase("saving");
		}
	};

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
						<p className="text-sm text-gray-500 mt-1">
							{isDraft
								? "Click any cell to edit before finishing"
								: canContinue
								? "This copy matrix is already saved — continue to asset source"
								: "This copy matrix has already been finalized"}
						</p>
					</div>
					<div className="flex gap-3 items-center">
						<BackButton label="Back" onClick={handleBack} />
						<ExportButton onClick={handleDownload} />
						<CancelButton onClick={handleBack} />
						<SaveButton
							label={
								isSavingOp
									? "Saving..."
									: isDraft
									? "Finish"
									: canContinue
									? "Continue to asset source"
									: "Finish"
							}
							onClick={handleContinue}
							disabled={
								isSavingOp ||
								(!isDraft && !canContinue)
							}
						/>
					</div>
				</div>
			</div>

			<div className="px-8 py-4 border-b bg-gray-50">
				<div className="flex flex-wrap items-end gap-6">
					<div className="min-w-[200px]">
						<label className="block text-sm font-semibold text-gray-700 mb-1">
							Matrix Name
						</label>
						<input
							type="text"
							value={displayName}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. AMR_PRSP"
							className={`${formInputClass} max-w-md`}
						/>
					</div>
					{columns.length > 0 && (
						<div className="min-w-[180px]">
							<label className="block text-sm font-semibold text-gray-700 mb-1">
								Unique Column
							</label>
							<select
								value={uniqueColumn}
								onChange={(e) => setUniqueColumn(e.target.value)}
								className={formSelectClass}
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
					onCellChange={handleCellChange}
					readOnlyColumns={[AUTO_ROW_ID_COLUMN]}
				/>
			</div>
		</div>
	);
};

export default CopyMatrixPreview;
