import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
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
import { asListTableHeaders, formatListDate } from "../../utils/constants";
import {
	useGetAssetUploadsQuery,
	useRetryUploadMutation,
	useDeleteAssetSourceMutation,
	useCloneAssetSourceMutation,
} from "../../store/services/assetUpload";
import { useGetCopyMatricesQuery } from "../../store/services/copyMatrix";
import { useGetMeQuery } from "../../store/services/userAuthApi";
import AddAssetSourceFromCopyMatrixModal from "../../components/modals/AddAssetSourceFromCopyMatrixModal";
import CloneNameModal from "../../components/modals/CloneNameModal";
import ConfirmDialog from "../../components/modals/ConfirmDialog";
import { showSuccess, showError } from "../../utils/toastMsg";
import { downloadFromApi } from "../../utils/downloadCsv";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import {
	readEditDraft,
	clearEditDraft,
} from "../../utils/editDraftStorage";
import IconTooltip from "../../components/common/IconTooltip";
import {
	buildMappedCopyMatrixByUploadId,
	mergeMappedCopyMatrices,
} from "../../utils/copyMatrixHelpers";

function getMappedCmNames(row) {
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

	for (const matrix of row.mappedCopyMatrices || []) {
		if (!matrix?.name) continue;
		if (matrix.status === "draft") {
			addName(`${matrix.name} (draft)`);
		} else if (
			matrix.status === "completed" ||
			matrix.status === "partial_success" ||
			matrix.status === "Active"
		) {
			addName(matrix.name);
		} else if (
			matrix.status === "processing" ||
			matrix.status === "pending"
		) {
			addName(`${matrix.name} (processing)`);
		} else {
			addName(matrix.name);
		}
	}

	return names;
}

function formatMappedCmTooltip(names) {
	if (!names.length) {
		return "No mapped copy matrix for this asset source.";
	}
	return `Mapped CM:\n${names.map((name) => `• ${name}`).join("\n")}`;
}

const AssetSourceList = () => {
	const navigate = useNavigate();
	const breadcrumbs = useBreadcrumbs();

	// Local State
	const [sortBy, setSortBy] = useState("recent");
	const [filterStatus, setFilterStatus] = useState("all");
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [cloneTarget, setCloneTarget] = useState(null);
	const [draftPrompt, setDraftPrompt] = useState(null);
	const [isResolvingDraft, setIsResolvingDraft] = useState(false);
	const { data: meData } = useGetMeQuery();
	const activeAccountId = meData?.activeAccount?._id;

	// 1. FETCH DATA (skip until we have an accountId)
	const {
		data: uploads = [],
		isLoading,
		isFetching,
	} = useGetAssetUploadsQuery(activeAccountId, {
		skip: !activeAccountId,
		refetchOnMountOrArgChange: true,
	});

	const { data: copyMatrices = [] } = useGetCopyMatricesQuery(activeAccountId, {
		skip: !activeAccountId,
		refetchOnMountOrArgChange: true,
	});

	const mappedCmByUploadId = useMemo(
		() => buildMappedCopyMatrixByUploadId(copyMatrices),
		[copyMatrices]
	);

	// 2. MUTATION (Retry Upload)
	const [retryUpload, { isLoading: isRetrying }] = useRetryUploadMutation();
	const [deleteAssetSource, { isLoading: isDeleting }] =
		useDeleteAssetSourceMutation();
	const [cloneAssetSource, { isLoading: isCloning }] =
		useCloneAssetSourceMutation();

	const openDraft = (draft) => {
		if (!draft?._id) return;
		navigate(`/asset-sources/${draft._id}/preview`);
	};

	const openAddFlow = () => setIsUploadModalOpen(true);

	const openEditFlow = (row, { skipEditDraft = false } = {}) => {
		navigate(`/asset-sources/${row._id}/preview`, {
			state: skipEditDraft ? { skipEditDraft: true } : undefined,
		});
	};

	const getStoredDraft = () => readEditDraft("as", activeAccountId);

	const handleAddClick = () => {
		const draft = getStoredDraft();
		if (draft?._id) {
			setDraftPrompt({ mode: "add", draft });
			return;
		}
		openAddFlow();
	};

	const handleEditClick = (row) => {
		const draft = getStoredDraft();
		if (draft?._id) {
			setDraftPrompt({ mode: "edit", draft, row });
			return;
		}
		openEditFlow(row);
	};

	const confirmLoadDraft = () => {
		const draft = draftPrompt?.draft;
		setDraftPrompt(null);
		openDraft(draft);
	};

	const confirmDraftSecondary = async () => {
		if (!draftPrompt) return;
		setIsResolvingDraft(true);
		try {
			if (draftPrompt.mode === "add") {
				const draft = draftPrompt.draft;
				if (draft?.isCreateDraft && draft?._id) {
					await deleteAssetSource(draft._id).unwrap();
				}
				clearEditDraft("as", activeAccountId);
				setDraftPrompt(null);
				openAddFlow();
				return;
			}
			// Discard & edit: open original for this session, but keep draft until Save.
			const row = draftPrompt.row;
			setDraftPrompt(null);
			openEditFlow(row, { skipEditDraft: true });
		} catch (error) {
			showError(
				getApiErrorMessage(error, "Failed to discard draft")
			);
		} finally {
			setIsResolvingDraft(false);
		}
	};

	const suggestCloneName = (name) => {
		const base = String(name || "Untitled").trim();
		return `${base} (Copy)`;
	};

	const confirmClone = async (name) => {
		if (!cloneTarget) return;
		try {
			await cloneAssetSource({ id: cloneTarget._id, name }).unwrap();
			showSuccess("Asset source cloned");
			setCloneTarget(null);
		} catch (error) {
			showError(
				getApiErrorMessage(error, "Failed to clone asset source")
			);
		}
	};

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
		let result = uploads.map((item) => {
			const mappedCopyMatrices = mergeMappedCopyMatrices(
				item._id,
				item.mappedCopyMatrices,
				mappedCmByUploadId
			);

			return {
				_id: item._id,
				name:
					item.name ||
					item.fileName?.replace(/\.[^.]+$/, "") ||
					"Untitled",
				copyMatrixId: item.copyMatrixId || null,
				mappedCopyMatrix: mappedCopyMatrices[0] || null,
				mappedCopyMatrices,
				updatedAt: item.updatedAt,
				displayDate: formatListDate(item.updatedAt),
				updatedBy: item.updatedBy || item.uploadedBy || "Unknown",
				status: item.status,
				errorLog: item.errorLog,
				validationErrors: item.validationErrors,
			};
		});

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
	}, [uploads, sortBy, filterStatus, mappedCmByUploadId]);

	// 5. DEFINE COLUMNS
	const columns = useMemo(() => {
		return asListTableHeaders.map((col) => {
			if (col.key === "mappedCm") {
				return {
					...col,
					headerRender: () => (
						<span className="inline-flex items-center justify-center gap-1.5">
							<span>Mapped CM</span>
							<IconTooltip
								label="Hover to see mapped copy matrix names for this asset source."
								position="bottom"
								className="cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors"
							>
								<Info size={18} />
							</IconTooltip>
						</span>
					),
					render: (_, row) => {
						const mappedNames = getMappedCmNames(row);
						const tooltipLabel = formatMappedCmTooltip(mappedNames);

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
						tooltip="Create asset source from copy matrix"
						onClick={handleAddClick}
					/>,
				]}
			/>

			<div className="min-h-0 flex-1 flex flex-col">
				<ListTable
					columns={columns}
					rows={filteredAndSortedData}
					loading={isLoading && !isFetching && uploads.length === 0}
					onEdit={handleEditClick}
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
					onClone={(row) => setCloneTarget(row)}
					tooltips={{
						edit: "Edit asset source",
						view: "View asset source",
						download: "Download CSV",
						delete: "Delete asset source",
						clone: "Clone asset source",
					}}
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
			<AddAssetSourceFromCopyMatrixModal
				isOpen={isUploadModalOpen}
				onClose={() => setIsUploadModalOpen(false)}
				accountId={activeAccountId}
			/>

			<CloneNameModal
				isOpen={!!cloneTarget}
				onClose={() => setCloneTarget(null)}
				onConfirm={confirmClone}
				isLoading={isCloning}
				title="Clone asset source"
				description={`Create a copy of "${cloneTarget?.name}" with a new name.`}
				defaultName={
					cloneTarget ? suggestCloneName(cloneTarget.name) : ""
				}
				accountId={activeAccountId}
				nameType="assetSource"
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

			<ConfirmDialog
				isOpen={!!draftPrompt}
				onClose={() => setDraftPrompt(null)}
				onConfirm={confirmLoadDraft}
				onCancel={confirmDraftSecondary}
				isLoading={isResolvingDraft}
				variant="primary"
				title="Load saved draft?"
				message={
					draftPrompt?.mode === "add"
						? `You have a saved draft "${draftPrompt?.draft?.name || "Untitled"}". Load it, or discard it and start a new asset source?`
						: `You have a saved draft "${draftPrompt?.draft?.name || "Untitled"}". Load the draft, or discard it and edit "${draftPrompt?.row?.name || "this item"}"?`
				}
				confirmLabel="Load draft"
				cancelLabel={
					draftPrompt?.mode === "add"
						? "Discard & start new"
						: "Discard & edit"
				}
			/>
		</div>
	);
};

export default AssetSourceList;
