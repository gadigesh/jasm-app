import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import AssetAccountHeader from "../../components/navigation/AssetAccountHeader";
import {
	SortAction,
	FilterAction,
	AddButton,
	ImportButton,
	ExportButton,
} from "../../components/navigation/HeaderActions";
import ListTable from "../../components/common/ListTable";
import RowPerPage from "../../components/common/RowPerPage";
import Pagination from "../../components/common/Pagination";
import useBreadcrumbs from "../../hooks/useBreadCrumbs";
import { copyMatrixListHeaders, formatListDate } from "../../utils/constants";
import { useGetMeQuery } from "../../store/services/userAuthApi";
import {
	useGetCopyMatricesQuery,
	useDeleteCopyMatrixMutation,
	useCloneCopyMatrixMutation,
} from "../../store/services/copyMatrix";
import AddCopyMatrixUploadModal from "../../components/modals/AddCopyMatrixUploadModal";
import CloneNameModal from "../../components/modals/CloneNameModal";
import ConfirmDialog from "../../components/modals/ConfirmDialog";
import { showSuccess, showError } from "../../utils/toastMsg";
import { downloadFromApi } from "../../utils/downloadCsv";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { resolveCopyMatrixEditPath } from "../../utils/copyMatrixHelpers";
import IconTooltip from "../../components/common/IconTooltip";

function getSyncedAsNames(row) {
	const names = [];
	const seen = new Set();

	const addName = (value) => {
		const trimmed = String(value || "").trim();
		if (!trimmed) return;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) return;
		seen.add(key);
		names.push(trimmed);
	};

	for (const source of row.mappedAssetSources || []) {
		if (!source?.name) continue;
		if (source.status === "draft") {
			addName(`${source.name} (draft)`);
		} else if (source.status === "completed") {
			addName(source.name);
		}
	}

	return names;
}

function formatSyncedAsTooltip(names) {
	if (!names.length) {
		return "No synced asset sources for this copy matrix.";
	}
	return `Synced AS:\n${names.map((name) => `• ${name}`).join("\n")}`;
}

const CopyMatrixList = () => {
	const navigate = useNavigate();
	const breadcrumbs = useBreadcrumbs();
	const [sortBy, setSortBy] = useState("recent");
	const [filterStatus, setFilterStatus] = useState("all");
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [cloneTarget, setCloneTarget] = useState(null);

	const { data: meData } = useGetMeQuery();
	const activeAccountId = meData?.activeAccount?._id
		? String(meData.activeAccount._id)
		: undefined;

	const {
		data: matrices = [],
		isLoading,
		isFetching,
	} = useGetCopyMatricesQuery(activeAccountId, {
		skip: !activeAccountId,
		refetchOnMountOrArgChange: true,
	});

	const [deleteCopyMatrix, { isLoading: isDeleting }] =
		useDeleteCopyMatrixMutation();
	const [cloneCopyMatrix, { isLoading: isCloning }] =
		useCloneCopyMatrixMutation();

	const filteredAndSortedData = useMemo(() => {
		if (!matrices) return [];

		let result = matrices.map((item) => ({
			_id: item._id,
			name: item.name,
			assetUploadId: item.assetUploadId || null,
			mappedAssetSource: item.mappedAssetSource || null,
			mappedAssetSources: item.mappedAssetSources || [],
			historicalMappedAssetSourceNames:
				item.historicalMappedAssetSourceNames || [],
			canRecreateAssetSource: Boolean(item.canRecreateAssetSource),
			rawStatus: item.rawStatus || null,
			updatedAt: item.updatedAt,
			displayDate: formatListDate(item.updatedAt),
			createdBy: item.createdBy || item.updatedBy || "Unknown",
			status: item.status,
		}));

		if (filterStatus !== "all") {
			result = result.filter(
				(item) =>
					item.status.toLowerCase() === filterStatus.toLowerCase()
			);
		}

		result.sort((a, b) => {
			if (sortBy === "az") return a.name.localeCompare(b.name);
			if (sortBy === "za") return b.name.localeCompare(a.name);
			return new Date(b.updatedAt) - new Date(a.updatedAt);
		});

		return result;
	}, [matrices, sortBy, filterStatus]);

	const handleExport = () => {
		if (!filteredAndSortedData.length) {
			showError("No data to export");
			return;
		}
		const headers = ["Name", "Last updated", "Created by", "Status"];
		const csvRows = [
			headers.join(","),
			...filteredAndSortedData.map((row) =>
				[
					`"${row.name}"`,
					`"${row.displayDate}"`,
					`"${row.createdBy}"`,
					`"${row.status}"`,
				].join(",")
			),
		];
		const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "copy-matrices.csv";
		link.click();
		URL.revokeObjectURL(url);
		showSuccess("Export downloaded");
	};

	const goToView = (row) => {
		const path = resolveCopyMatrixEditPath(row);
		if (path) navigate(`${path}?mode=view`);
	};

	const goToEdit = (row) => {
		const path = resolveCopyMatrixEditPath(row);
		if (path) navigate(path);
	};

	const suggestCloneName = (name) => {
		const base = String(name || "Untitled").trim();
		return `${base} (Copy)`;
	};

	const confirmClone = async (name) => {
		if (!cloneTarget) return;
		try {
			await cloneCopyMatrix({ id: cloneTarget._id, name }).unwrap();
			showSuccess("Copy matrix cloned");
			setCloneTarget(null);
		} catch (error) {
			showError(
				getApiErrorMessage(error, "Failed to clone copy matrix")
			);
		}
	};

	const handleDownload = async (row) => {
		try {
			if (row.assetUploadId) {
				await downloadFromApi(
					`/source/${row.assetUploadId}/export`,
					row.name
				);
			} else {
				await downloadFromApi(
					`/copy-matrix/${row._id}/export`,
					row.name
				);
			}
			showSuccess("Download started");
		} catch (error) {
			showError(error?.message || "Failed to download");
		}
	};

	const confirmDelete = async () => {
		if (!deleteTarget) return;
		try {
			await deleteCopyMatrix(deleteTarget._id).unwrap();
			showSuccess("Copy matrix deleted");
			setDeleteTarget(null);
		} catch (error) {
			showError(error?.data?.message || "Failed to delete");
		}
	};

	const columns = useMemo(() => {
		return copyMatrixListHeaders.map((col) => {
			if (col.key === "mappedAs") {
				return {
					...col,
					headerRender: () => (
						<span className="inline-flex items-center justify-center gap-1.5">
							<span>Mapped AS</span>
							<IconTooltip
								label="Hover to see synced asset source names for this copy matrix."
								position="bottom"
								className="cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors"
							>
								<Info size={18} />
							</IconTooltip>
						</span>
					),
					render: (_, row) => {
						const syncedNames = getSyncedAsNames(row);
						const tooltipLabel = formatSyncedAsTooltip(syncedNames);

						return (
							<IconTooltip
								label={tooltipLabel}
								position="bottom"
								className="cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors"
							>
								<Info size={18} />
							</IconTooltip>
						);
					},
				};
			}

			if (col.key === "status") {
				return {
					...col,
					render: (status) => {
						const styles = {
							Active: {
								bg: "bg-green-50",
								text: "text-green-700",
								dot: "bg-green-600",
							},
							Inactive: {
								bg: "bg-red-50",
								text: "text-red-700",
								dot: "bg-red-600",
							},
							Processing: {
								bg: "bg-blue-50",
								text: "text-blue-700",
								dot: "bg-blue-600",
							},
						};
						const config = styles[status] || styles.Processing;

						return (
							<span
								className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium w-fit ${config.bg} ${config.text}`}
							>
								<span
									className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
								/>
								{status}
							</span>
						);
					},
				};
			}

			if (col.key === "updatedAt") {
				return {
					...col,
					render: (_, row) => <span>{row.displayDate}</span>,
				};
			}

			return col;
		});
	}, []);

	return (
		<div className="bg-white">
			<AssetAccountHeader
				breadcrumbs={breadcrumbs}
				actions={[
					// <ImportButton
					// 	key="Import"
					// 	onClick={() => setIsUploadModalOpen(true)}
					// />,
					// <ExportButton key="Export" onClick={handleExport} />,
					<SortAction
						key="SortAction"
						currentSort={sortBy}
						onSort={setSortBy}
					/>,
					<FilterAction
						key="FilterAction"
						currentFilter={filterStatus}
						onFilter={setFilterStatus}
					/>,
					<AddButton
						key="AddButton"
						label="Add Matrix"
						tooltip="Upload new copy matrix"
						onClick={() => setIsUploadModalOpen(true)}
					/>,
				]}
			/>

			<div className="min-h-0 flex-1 flex flex-col">
				<ListTable
					columns={columns}
					rows={filteredAndSortedData}
					loading={
						isLoading && !isFetching && matrices.length === 0
					}
					onEdit={goToEdit}
					onView={goToView}
					onDownload={handleDownload}
					onDelete={(row) => setDeleteTarget(row)}
					onClone={(row) => setCloneTarget(row)}
					tooltips={{
						edit: "Edit copy matrix",
						view: "View copy matrix",
						download: "Download CSV",
						delete: "Delete copy matrix",
						clone: "Clone copy matrix",
					}}
				/>
				<div className="px-6">
					<div className="flex items-center justify-between">
						<RowPerPage value={10} onChange={() => {}} />
						<Pagination
							currentPage={1}
							totalPages={1}
							onPageChange={() => {}}
						/>
					</div>
				</div>
			</div>

			<AddCopyMatrixUploadModal
				isOpen={isUploadModalOpen}
				onClose={() => setIsUploadModalOpen(false)}
				accountId={activeAccountId}
			/>

			<CloneNameModal
				isOpen={!!cloneTarget}
				onClose={() => setCloneTarget(null)}
				onConfirm={confirmClone}
				isLoading={isCloning}
				title="Clone copy matrix"
				description={`Create a copy of "${cloneTarget?.name}" with a new name.`}
				defaultName={
					cloneTarget ? suggestCloneName(cloneTarget.name) : ""
				}
				accountId={activeAccountId}
				nameType="copyMatrix"
			/>

			<ConfirmDialog
				isOpen={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={confirmDelete}
				isLoading={isDeleting}
				title="Delete copy matrix?"
				message={`Are you sure you want to delete "${deleteTarget?.name}"? This will permanently remove the matrix and all its data.`}
				confirmLabel="Delete"
			/>
		</div>
	);
};

export default CopyMatrixList;
