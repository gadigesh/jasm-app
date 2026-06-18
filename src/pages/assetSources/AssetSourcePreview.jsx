import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import AssetAccountHeader from "../../components/navigation/AssetAccountHeader";
import {
	BackButton,
	SaveButton,
	CancelButton,
	ExportButton,
} from "../../components/navigation/HeaderActions";
import { downloadFromApi } from "../../utils/downloadCsv";
import EditableSheetTable from "../../components/common/EditableSheetTable";
import useBreadcrumbs from "../../hooks/useBreadCrumbs";
import {
	useGetAssetSourceQuery,
	useGetAssetSourceRowsQuery,
	useUpdateAssetSourceRowsMutation,
	useFinishAssetSourceMutation,
} from "../../store/services/assetUpload";
import { showSuccess, showError } from "../../utils/toastMsg";

const AssetSourcePreview = ({ readOnly = false }) => {
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const breadcrumbs = useBreadcrumbs();
	const [page, setPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [name, setName] = useState("");
	const [pendingEdits, setPendingEdits] = useState({});

	const { data: asset, isLoading: isAssetLoading, refetch: refetchAsset } =
		useGetAssetSourceQuery(id, { refetchOnMountOrArgChange: true });
	const {
		data: rowsData,
		isLoading: isRowsLoading,
		refetch: refetchRows,
	} = useGetAssetSourceRowsQuery(
		{ id, page, limit: rowsPerPage },
		{ skip: !id, refetchOnMountOrArgChange: true }
	);

	const [updateRows, { isLoading: isSaving }] =
		useUpdateAssetSourceRowsMutation();
	const [finishAssetSource, { isLoading: isFinishing }] =
		useFinishAssetSourceMutation();

	const isDraft = asset?.status === "draft";

	const columns = useMemo(
		() => rowsData?.columns || asset?.columns || [],
		[rowsData, asset]
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

	const savedName = asset?.name || "";
	const displayName = name || savedName;
	const loading = isAssetLoading || isRowsLoading;
	const isBusy = isFinishing || isSaving;

	useEffect(() => {
		if (asset?.name) setName(asset.name);
	}, [asset?.name]);

	useEffect(() => {
		setPendingEdits({});
		setPage(1);
	}, [id]);

	useEffect(() => {
		if (!location.state?.refreshFromCopyMatrix) return;

		const refresh = async () => {
			await Promise.all([refetchAsset(), refetchRows()]);
		};
		refresh();
	}, [
		id,
		location.state?.syncedAt,
		location.state?.refreshFromCopyMatrix,
		refetchAsset,
		refetchRows,
	]);

	const handleCellChange = useCallback((rowId, rowData) => {
		setPendingEdits((prev) => ({
			...prev,
			[rowId]: { ...prev[rowId], ...rowData },
		}));
	}, []);

	const savePendingEdits = async () => {
		const edits = Object.entries(pendingEdits).map(([rowId, data]) => {
			const rowData = { ...data };
			delete rowData._id;
			delete rowData.rowIndex;
			delete rowData.primaryKey;
			return { _id: rowId, rowData };
		});
		if (edits.length === 0) return false;
		await updateRows({ id, rows: edits }).unwrap();
		setPendingEdits({});
		return true;
	};

	const handleSaveChanges = async () => {
		try {
			const saved = await savePendingEdits();
			if (saved) {
				await refetchAsset();
				await refetchRows();
				showSuccess("Changes saved");
			} else {
				showError("No changes to save");
			}
		} catch (error) {
			showError(error?.data?.message || "Failed to save changes");
		}
	};

	const handleDownload = async () => {
		try {
			await downloadFromApi(
				`/source/${id}/export`,
				displayName || "asset-source"
			);
			showSuccess("Download started");
		} catch (error) {
			showError(error?.message || "Failed to download");
		}
	};

	const handleFinish = async () => {
		if (!isDraft) return;
		const assetSourceName = displayName.trim();
		if (!assetSourceName) {
			showError("Asset source name is required");
			return;
		}
		try {
			await savePendingEdits();
			const result = await finishAssetSource({
				id,
				assetName: assetSourceName,
			}).unwrap();

			const finalName = result?.data?.name || assetSourceName;
			setName(finalName);
			await refetchAsset();
			await refetchRows();
			showSuccess("Asset source saved — you can continue editing");
		} catch (error) {
			showError(error?.data?.message || "Failed to save asset source");
		}
	};

	return (
		<div className="bg-white min-h-full">
			<AssetAccountHeader
				breadcrumbs={breadcrumbs}
				actions={
					readOnly
						? [
								<BackButton
									key="back"
									label="Back to list"
									onClick={() =>
										navigate("/asset-sources")
									}
								/>,
								<ExportButton
									key="export"
									onClick={handleDownload}
								/>,
						  ]
						: [
								<BackButton
									key="back"
									label="Back"
									onClick={() => navigate("/copy-matrix")}
								/>,
								<ExportButton
									key="export"
									onClick={handleDownload}
								/>,
								<CancelButton
									key="cancel"
									onClick={() =>
										navigate("/asset-sources")
									}
								/>,
								<SaveButton
									key="save"
									label={
										isDraft
											? isBusy
												? "Saving..."
												: "Finish"
											: isSaving
											? "Saving..."
											: "Save changes"
									}
									onClick={
										isDraft
											? handleFinish
											: handleSaveChanges
									}
									disabled={isBusy}
								/>,
						  ]
				}
			/>

			<div className="px-8 py-4 border-b">
				<h1 className="text-2xl font-bold text-[#413d42]">
					{displayName ||
						(readOnly ? "Asset Source View" : "Asset Source Edit")}
				</h1>
				<p className="text-sm text-gray-500 mt-1">
					{readOnly
						? "View only — use the pencil icon on the list to edit"
						: isDraft
						? "Set the asset source name, edit cells, then Finish"
						: "Click any cell to edit · Save changes when done"}
				</p>
			</div>

			<div className="px-8 py-4 border-b bg-gray-50">
				<div className="flex flex-wrap items-end gap-6">
					<div className="min-w-[200px]">
						<label className="block text-sm font-semibold text-gray-700 mb-1">
							Asset Source Name
						</label>
						{!readOnly && isDraft ? (
							<input
								type="text"
								value={displayName}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Summer Campaign"
								className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B600C9]/20 focus:border-[#B600C9]"
							/>
						) : (
							<div className="w-full max-w-md px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium text-gray-800">
								{displayName}
							</div>
						)}
					</div>
					{asset?.uniqueColumn && (
						<div className="text-sm text-gray-500">
							Unique column:{" "}
							<span className="font-medium text-gray-700">
								{asset.uniqueColumn}
							</span>
						</div>
					)}
					{asset?.processedRows != null && (
						<div className="text-sm text-gray-500">
							{asset.processedRows} rows
						</div>
					)}
				</div>
			</div>

			<div className="px-6 py-4">
				<EditableSheetTable
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

export default AssetSourcePreview;
