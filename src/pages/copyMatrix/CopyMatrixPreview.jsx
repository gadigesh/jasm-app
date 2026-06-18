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
import {
	useGetCopyMatrixQuery,
	useGetCopyMatrixRowsQuery,
	useFinishCopyMatrixMutation,
	useDeleteCopyMatrixMutation,
	useUpdateCopyMatrixRowsMutation,
} from "../../store/services/copyMatrix";
import api from "../../store/services/api";
import { showSuccess, showError } from "../../utils/toastMsg";

const CopyMatrixPreview = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const [page, setPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [name, setName] = useState("");
	const [uniqueColumn, setUniqueColumn] = useState("");
	const [pendingEdits, setPendingEdits] = useState({});
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

	const savePendingEdits = async () => {
		const edits = collectEdits();
		if (edits.length === 0) return { saved: false };
		const result = await updateRows({ id, rows: edits }).unwrap();
		setPendingEdits({});
		return {
			saved: true,
			assetUploadId: result?.data?.assetUploadId || null,
		};
	};

	const { data: matrix, isLoading: isMatrixLoading } =
		useGetCopyMatrixQuery(id);
	const { data: rowsData, isLoading: isRowsLoading } =
		useGetCopyMatrixRowsQuery(
			{ id, page, limit: rowsPerPage },
			{ skip: !id }
		);

	const [updateRows, { isLoading: isSaving }] =
		useUpdateCopyMatrixRowsMutation();
	const [finishCopyMatrix, { isLoading: isFinishing }] =
		useFinishCopyMatrixMutation();
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
		if (columns.length && !uniqueColumn) setUniqueColumn(columns[0]);
	}, [matrix?.name, name, columns, uniqueColumn]);

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
		try {
			if (isDraft) {
				await savePendingEdits();
				const result = await finishCopyMatrix({
					id,
					name: displayName.trim() || matrix?.name,
					uniqueColumn: uniqueColumn || columns[0],
				}).unwrap();
				showSuccess(result?.message || "Copy matrix saved");
				goToAssetSourceEdit(result?.data?.assetUploadId);
				return;
			}

			const { saved, assetUploadId: syncedId } = await savePendingEdits();
			if (saved) showSuccess("Changes saved");
			goToAssetSourceEdit(syncedId || matrix?.assetUploadId);
		} catch (error) {
			showError(error?.data?.message || "Failed to save copy matrix");
		}
	};

	return (
		<div className="bg-white min-h-full">
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
								isFinishing || isSaving
									? "Saving..."
									: isDraft
									? "Finish"
									: canContinue
									? "Continue to asset source"
									: "Finish"
							}
							onClick={handleContinue}
							disabled={
								isFinishing ||
								isSaving ||
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
							className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B600C9]/20 focus:border-[#B600C9]"
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
								className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
							>
								{columns.map((col) => (
									<option key={col} value={col}>
										{col}
									</option>
								))}
							</select>
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
				/>
			</div>
		</div>
	);
};

export default CopyMatrixPreview;
