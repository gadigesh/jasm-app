import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AssetAccountHeader from "../../components/navigation/AssetAccountHeader";
import {
	SortAction,
	FilterAction,
	AddButton,
} from "../../components/navigation/HeaderActions";
import ListTable from "../../components/common/ListTable";
import RowPerPage from "../../components/common/RowPerPage";
import Pagination from "../../components/common/Pagination";
import useBreadcrumbs from "../../hooks/useBreadCrumbs";
import { asListTableHeaders } from "../../utils/constants";
import {
	useGetAssetUploadsQuery,
	useRetryUploadMutation,
	useDeleteAssetSourceMutation,
} from "../../store/services/assetUpload";
import { useGetMeQuery } from "../../store/services/userAuthApi";
import AssetSourceUploadModal from "../../components/modals/AddASUploadModal";
import ConfirmDialog from "../../components/modals/ConfirmDialog";
import { showSuccess, showError } from "../../utils/toastMsg";
import { downloadFromApi } from "../../utils/downloadCsv";

const AssetSourceList = () => {
	const navigate = useNavigate();
	const breadcrumbs = useBreadcrumbs();

	// Local State
	const [sortBy, setSortBy] = useState("recent");
	const [filterStatus, setFilterStatus] = useState("all");
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const { data: meData } = useGetMeQuery();
	const activeAccountId = meData?.activeAccount?._id;

	// 1. FETCH DATA (skip until we have an accountId)
	const {
		data: uploads = [],
		isLoading,
		isFetching,
	} = useGetAssetUploadsQuery(activeAccountId, {
		skip: !activeAccountId,
	});

	// 2. MUTATION (Retry Upload)
	const [retryUpload, { isLoading: isRetrying }] = useRetryUploadMutation();
	const [deleteAssetSource, { isLoading: isDeleting }] =
		useDeleteAssetSourceMutation();

	const confirmDelete = async () => {
		if (!deleteTarget) return;
		try {
			await deleteAssetSource(deleteTarget._id).unwrap();
			showSuccess("Asset source deleted");
			setDeleteTarget(null);
		} catch (error) {
			showError(error?.data?.message || "Failed to delete");
		}
	};

	// 3. HANDLE FILE REPLACEMENT
	const handleReplaceFile = async (e, uploadId) => {
		const file = e.target.files[0];
		if (!file) return;

		// Optional: Confirm with user
		// if (!window.confirm("This will replace the existing data. Continue?")) return;

		const formData = new FormData();
		formData.append("file", file);

		try {
			// .unwrap() allows catching the error here
			await retryUpload({ id: uploadId, formData }).unwrap();
			// Toast success is handled by your API interceptor, or add alert here
		} catch (err) {
			console.error("Retry failed", err);
			// Toast error handled by interceptor
		} finally {
			e.target.value = null; // Reset input to allow selecting same file again
		}
	};

	// 4. TRANSFORM & SORT DATA
	const filteredAndSortedData = useMemo(() => {
		if (!uploads) return [];

		// Map Backend Data to UI Structure
		let result = uploads.map((item) => ({
			_id: item._id,
			name: item.name || item.fileName?.replace(/\.[^.]+$/, "") || "Untitled",
			updatedAt: item.updatedAt,
			displayDate: new Date(item.updatedAt).toLocaleString(), // Formatted for UI
			updatedBy: item.updatedBy || item.uploadedBy || "Unknown",
			status: item.status, // pending, processing, completed, failed, partial_success
			errorLog: item.errorLog,
			validationErrors: item.validationErrors,
		}));

		// Filter
		if (filterStatus !== "all") {
			// Map filter "Active" to backend "completed", etc. logic if needed
			// Or just filter by exact status string
			result = result.filter((item) =>
				item.status.toLowerCase().includes(filterStatus.toLowerCase())
			);
		}

		// Sort
		result.sort((a, b) => {
			if (sortBy === "az") {
				return a.name.localeCompare(b.name);
			} else if (sortBy === "za") {
				return b.name.localeCompare(a.name);
			}
			// Default: Recent first
			return new Date(b.updatedAt) - new Date(a.updatedAt);
		});

		return result;
	}, [uploads, sortBy, filterStatus]);

	// 5. DEFINE COLUMNS
	const columns = useMemo(() => {
		return asListTableHeaders.map((col) => {
			// --- STATUS COLUMN ---
			if (col.key === "status") {
				return {
					...col,
					render: (status, row) => {
						// Style Mapping
						const styles = {
							completed: {
								bg: "bg-green-50",
								text: "text-green-700",
								dot: "bg-green-600",
								label: "Active",
							},
							processing: {
								bg: "bg-blue-50",
								text: "text-blue-700",
								dot: "bg-blue-600",
								label: "Processing",
							},
							pending: {
								bg: "bg-gray-50",
								text: "text-gray-700",
								dot: "bg-gray-600",
								label: "Pending",
							},
							failed: {
								bg: "bg-red-50",
								text: "text-red-700",
								dot: "bg-red-600",
								label: "Failed",
							},
							partial_success: {
								bg: "bg-yellow-50",
								text: "text-yellow-700",
								dot: "bg-yellow-600",
								label: "Partial",
							},
						};

						const config = styles[status] || styles.pending;

						return (
							<div className="flex flex-col items-center justify-center">
								<span
									className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium w-fit ${config.bg} ${config.text}`}
								>
									<span
										className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
									/>
									{config.label}
								</span>
								{/* Show Error Count if Failed/Partial */}
								{(status === "failed" ||
									status === "partial_success") && (
									<span
										className="text-[10px] text-red-500 mt-1 cursor-help"
										title={
											row.errorLog ||
											JSON.stringify(row.validationErrors)
										}
									>
										{row.validationErrors?.length
											? `${row.validationErrors.length} Errors`
											: "Error"}
									</span>
								)}
							</div>
						);
					},
				};
			}

			// --- UPDATED AT COLUMN (Use Formatted Date) ---
			if (col.key === "updatedAt") {
				return {
					...col,
					render: (_, row) => <span>{row.displayDate}</span>,
				};
			}

			// --- OPTIONS / UPDATE COLUMN ---
			// Ensure your 'asListTableHeaders' has a key 'options' or 'action'
			if (col.key === "options" || col.key === "action") {
				return {
					...col,
					render: (_, row) => (
						<div className="flex justify-center">
							<label
								className={`cursor-pointer text-sm font-medium ${
									isRetrying
										? "text-gray-400"
										: "text-indigo-600 hover:text-indigo-900"
								}`}
							>
								<span>{isRetrying ? "..." : "Update"}</span>
								<input
									type="file"
									className="hidden"
									accept=".csv, .xlsx"
									disabled={isRetrying}
									onChange={(e) =>
										handleReplaceFile(e, row._id)
									}
								/>
							</label>
						</div>
					),
				};
			}

			return col;
		});
	}, [isRetrying]);

	return (
		<div className="bg-white">
			<AssetAccountHeader
				breadcrumbs={breadcrumbs}
				actions={[
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
						label="Add New"
						onClick={() => setIsUploadModalOpen(true)}
					/>,
				]}
			/>

			<div className="min-h-0 flex-1 flex flex-col">
				<ListTable
					columns={columns}
					rows={filteredAndSortedData}
					loading={isLoading && !isFetching && uploads.length === 0}
					onEdit={(row) =>
						navigate(`/asset-sources/${row._id}/preview`)
					}
					onView={(row) =>
						navigate(
							`/asset-sources/${row._id}/preview?mode=view`
						)
					}
					onDownload={async (row) => {
						try {
							await downloadFromApi(
								`/source/${row._id}/export`,
								row.name
							);
							showSuccess("Download started");
						} catch (error) {
							showError(
								error?.message || "Failed to download"
							);
						}
					}}
					onDelete={(row) => setDeleteTarget(row)}
				/>
				<div className="px-6">
					<div className="flex items-center justify-between">
						<RowPerPage value={5} onChange={() => {}} />
						<Pagination
							currentPage={1}
							totalPages={1} // You can map this from API meta if available
							onPageChange={() => {}}
						/>
					</div>
				</div>
			</div>
			<AssetSourceUploadModal
				isOpen={isUploadModalOpen}
				onClose={() => setIsUploadModalOpen(false)}
				accountId={activeAccountId}
			/>

			<ConfirmDialog
				isOpen={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={confirmDelete}
				isLoading={isDeleting}
				title="Delete asset source?"
				message={`Are you sure you want to delete "${deleteTarget?.name}"? This will permanently remove the asset source and all its data.`}
				confirmLabel="Delete"
			/>
		</div>
	);
};

export default AssetSourceList;
