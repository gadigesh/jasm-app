import React, { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import AssetAccountHeader from "../../components/navigation/AssetAccountHeader";
import {
	BackButton,
	SaveButton,
	ExportButton,
} from "../../components/navigation/HeaderActions";
import { downloadFromApi } from "../../utils/downloadCsv";
import EditableSheetTable from "../../components/common/EditableSheetTable";
import useBreadcrumbs from "../../hooks/useBreadCrumbs";
import {
	useGetCopyMatrixQuery,
	useGetCopyMatrixRowsQuery,
	useSaveAndContinueCopyMatrixMutation,
} from "../../store/services/copyMatrix";
import api from "../../store/services/api";
import { showSuccess, showError } from "../../utils/toastMsg";

const normalizeId = (value) => {
	if (!value) return null;
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		return String(value._id || value.id || "");
	}
	return String(value);
};

const CopyMatrixWorkflow = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const readOnly = searchParams.get("mode") === "view";
	const dispatch = useDispatch();
	const breadcrumbs = useBreadcrumbs();
	const [page, setPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [pendingEdits, setPendingEdits] = useState({});
	const tableRef = useRef(null);

	const { data: matrix, isLoading: isMatrixLoading } =
		useGetCopyMatrixQuery(id, {
			refetchOnMountOrArgChange: true,
		});
	const { data: rowsData, isLoading: isRowsLoading } =
		useGetCopyMatrixRowsQuery(
			{ id, page, limit: rowsPerPage },
			{ skip: !id }
		);

	const [saveAndContinue, { isLoading: isSaving }] =
		useSaveAndContinueCopyMatrixMutation();

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

	const loading = isMatrixLoading || isRowsLoading;

	const handleCellChange = useCallback((rowId, rowData) => {
		setPendingEdits((prev) => ({
			...prev,
			[rowId]: { ...prev[rowId], ...rowData },
		}));
	}, []);

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

	const handleDownload = async () => {
		try {
			const name = matrix?.name || "copy-matrix";
			if (matrix?.assetUploadId) {
				await downloadFromApi(
					`/source/${matrix.assetUploadId}/export`,
					name
				);
			} else {
				await downloadFromApi(`/copy-matrix/${id}/export`, name);
			}
			showSuccess("Download started");
		} catch (error) {
			showError(error?.message || "Failed to download");
		}
	};

	const handleSave = async () => {
		const edits = collectEdits();

		try {
			const result = await saveAndContinue({
				id,
				rows: edits,
			}).unwrap();

			setPendingEdits({});

			const assetUploadId = normalizeId(result?.data?.assetUploadId);

			if (!assetUploadId) {
				showError("No linked asset source found");
				return;
			}

			dispatch(
				api.util.invalidateTags([
					{ type: "AssetUploads", id: assetUploadId },
					{ type: "AssetSourceRows", id: assetUploadId },
				])
			);

			showSuccess(result?.message || "Changes saved");
			navigate(`/asset-sources/${assetUploadId}/preview`, {
				replace: true,
				state: {
					refreshFromCopyMatrix: true,
					copyMatrixId: normalizeId(result?.data?.copyMatrixId) || id,
					syncedAt: result?.data?.syncedAt || Date.now(),
				},
			});
		} catch (error) {
			showError(
				error?.data?.message || "Failed to save changes"
			);
		}
	};

	return (
		<div className="bg-white min-h-full">
			<AssetAccountHeader
				breadcrumbs={breadcrumbs}
				actions={[
					<BackButton
						key="back"
						label="Back to list"
						onClick={() => navigate("/copy-matrix")}
					/>,
					<ExportButton key="export" onClick={handleDownload} />,
					!readOnly && (
						<SaveButton
							key="save"
							label={isSaving ? "Saving..." : "Save & continue"}
							onClick={handleSave}
							disabled={isSaving}
						/>
					),
				].filter(Boolean)}
			/>

			<div className="px-8 py-4 border-b bg-gray-50">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h2 className="text-xl font-bold text-[#413d42]">
							{matrix?.name || "Copy Matrix"}
						</h2>
						<p className="text-sm text-gray-500 mt-1">
							{readOnly
								? "View only"
								: "Click any cell to edit"}{" "}
							·{" "}
							{matrix?.processedRows != null &&
								`${matrix.processedRows} rows`}
						</p>
					</div>
					{matrix?.status && (
						<span
							className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
								matrix.status === "completed"
									? "bg-green-50 text-green-700"
									: matrix.status === "failed"
									? "bg-red-50 text-red-700"
									: "bg-blue-50 text-blue-700"
							}`}
						>
							{matrix.status}
						</span>
					)}
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
				/>
			</div>
		</div>
	);
};

export default CopyMatrixWorkflow;
