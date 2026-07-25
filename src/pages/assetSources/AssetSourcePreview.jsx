import React, {
	useState,
	useMemo,
	useEffect,
	useCallback,
	useRef,
} from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import AssetAccountHeader from "../../components/navigation/AssetAccountHeader";
import {
	BackButton,
	SaveButton,
	CancelButton,
} from "../../components/navigation/HeaderActions";
import EditableSheetTable from "../../components/common/EditableSheetTable";
import useBreadcrumbs from "../../hooks/useBreadCrumbs";
import {
	useGetAssetSourceQuery,
	useGetAssetSourceRowsQuery,
	useUpdateAssetSourceRowsMutation,
	useCheckAssetSourceUniqueColumnMutation,
	useFinishAssetSourceMutation,
	useDeleteAssetSourceMutation,
	useFillAssetSourceColumnSequenceMutation,
	useCopyAssetSourceColumnFromMutation,
	useGenerateAssetSourceColumnTextMutation,
	useUploadAssetSourceColumnImagesMutation,
	useSetAssetSourceColumnCdnUrlMutation,
	useApplyAssetSourceColumnImagesMutation,
	useFillAssetSourceColumnDateMutation,
	useReplaceAssetSourceColumnMutation,
	useApplyAssetSourceColumnChangesMutation,
	useRenameAssetSourceColumnMutation,
	useDeleteAssetSourceColumnMutation,
	useCloneAssetSourceColumnMutation,
	useAddAssetSourceRowMutation,
	useDeleteAssetSourceRowMutation,
	useAddAssetSourceColumnMutation,
	useCloneAssetSourceRowMutation,
} from "../../store/services/assetUpload";
import api from "../../store/services/api";
import { useDispatch } from "react-redux";
import { showSuccess, showError, showWarning } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import ValidatedNameInput from "../../components/common/ValidatedNameInput";
import { useGetMeQuery } from "../../store/services/userAuthApi";
import { useGetMindshareFoldersQuery } from "../../store/services/accounts";
import { getDeletedAssetSourceNames } from "../../utils/copyMatrixHelpers";
import { writeEditDraft, clearEditDraft, readEditDraft, capturePendingEditsMap } from "../../utils/editDraftStorage";
import {
	applyRowPatches,
	fillSequenceLocal,
	fillDateLocal,
	fillColumnValueLocal,
	generateTextLocal,
	copyFromColumnLocal,
	replaceInColumnLocal,
	cellText,
	selectTargetRows,
} from "../../utils/localSheetEdits";
import { normalizeCellText } from "../../utils/normalizeCellText";
import { suggestCloneColumnName } from "../../utils/copyMatrixColumnHelpers";
import { AUTO_ROW_ID_COLUMN } from "../../utils/constants";
import CopyMatrixSheetToolbar from "../../components/copyMatrix/preview/CopyMatrixSheetToolbar";
import AddCopyMatrixColumnModal from "../../components/modals/copyMatrix/AddCopyMatrixColumnModal";
import CloneCopyMatrixRowModal from "../../components/modals/copyMatrix/CloneCopyMatrixRowModal";
import CloneCopyMatrixColumnModal from "../../components/modals/copyMatrix/CloneCopyMatrixColumnModal";
import CopyMatrixFromColumnModal from "../../components/modals/copyMatrix/CopyMatrixFromColumnModal";
import EditSheetRowModal from "../../components/modals/copyMatrix/EditSheetRowModal";
import CopyMatrixGenerateTextModal from "../../components/modals/copyMatrix/CopyMatrixGenerateTextModal";
import CopyMatrixUpdateImagesModal from "../../components/modals/copyMatrix/CopyMatrixUpdateImagesModal";
import CopyMatrixSelectDateModal from "../../components/modals/copyMatrix/CopyMatrixSelectDateModal";
import CopyMatrixReplacePanel from "../../components/copyMatrix/preview/CopyMatrixReplacePanel";
import ConfirmDialog from "../../components/modals/ConfirmDialog";

const AssetSourcePreview = ({ readOnly = false }) => {
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useDispatch();
	const breadcrumbs = useBreadcrumbs();
	const skipEditDraft = Boolean(location.state?.skipEditDraft);
	const tableRef = useRef(null);
	const highlightTimeoutRef = useRef(null);
	const pendingFindFocusRef = useRef(null);

	const [page, setPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [name, setName] = useState("");
	const [pendingEdits, setPendingEdits] = useState({});
	const hasSavedChangesRef = useRef(false);
	const pendingEditsRef = useRef({});
	const [nameValidation, setNameValidation] = useState({
		isDuplicate: false,
		isChecking: false,
	});
	const [selectedRowIds, setSelectedRowIds] = useState([]);
	const [sheetModal, setSheetModal] = useState(null);
	const [editingRow, setEditingRow] = useState(null);
	const [deletingRow, setDeletingRow] = useState(null);
	const [columnModal, setColumnModal] = useState(null);
	const [renamingColumn, setRenamingColumn] = useState(null);
	const [localUnsyncedColumns, setLocalUnsyncedColumns] = useState(
		() => new Set()
	);
	const [highlightedColumn, setHighlightedColumn] = useState(null);
	const [highlightedRowId, setHighlightedRowId] = useState(null);
	const [duplicateHighlight, setDuplicateHighlight] = useState(null);
	const [replacePanel, setReplacePanel] = useState(null);
	const [replaceStatusMessage, setReplaceStatusMessage] = useState(null);
	const [findMatchIndex, setFindMatchIndex] = useState(0);
	const [findMatches, setFindMatches] = useState([]);
	const [findQuery, setFindQuery] = useState("");
	const [replaceUndoStack, setReplaceUndoStack] = useState([]);
	const [replaceRedoStack, setReplaceRedoStack] = useState([]);

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
	const { data: allRowsData } = useGetAssetSourceRowsQuery(
		{ id, page: 1, limit: 200 },
		{ skip: !id || sheetModal !== "cloneRow" }
	);

	const [updateRows, { isLoading: isSaving }] =
		useUpdateAssetSourceRowsMutation();
	const [checkUniqueColumn] =
		useCheckAssetSourceUniqueColumnMutation();
	const [finishAssetSource, { isLoading: isFinishing }] =
		useFinishAssetSourceMutation();
	const [deleteAssetSource] = useDeleteAssetSourceMutation();
	const [fillColumnSequence] = useFillAssetSourceColumnSequenceMutation();
	const [copyColumnFrom, { isLoading: isCopyingFromColumn }] =
		useCopyAssetSourceColumnFromMutation();
	const [generateColumnText, { isLoading: isGeneratingText }] =
		useGenerateAssetSourceColumnTextMutation();
	const [uploadColumnImages, { isLoading: isUploadingImages }] =
		useUploadAssetSourceColumnImagesMutation();
	const [setColumnCdnUrl, { isLoading: isSettingCdnUrl }] =
		useSetAssetSourceColumnCdnUrlMutation();
	const [applyColumnImages, { isLoading: isApplyingImages }] =
		useApplyAssetSourceColumnImagesMutation();
	const [fillColumnDate, { isLoading: isFillingDate }] =
		useFillAssetSourceColumnDateMutation();
	const [replaceColumn, { isLoading: isReplacingColumn }] =
		useReplaceAssetSourceColumnMutation();
	const [applyColumnChanges, { isLoading: isApplyingColumnChanges }] =
		useApplyAssetSourceColumnChangesMutation();
	const [renameColumn] = useRenameAssetSourceColumnMutation();
	const [deleteColumn] = useDeleteAssetSourceColumnMutation();
	const [cloneColumn, { isLoading: isCloningColumn }] =
		useCloneAssetSourceColumnMutation();
	const [addAssetSourceRow, { isLoading: isAddingRow }] =
		useAddAssetSourceRowMutation();
	const [addAssetSourceColumn, { isLoading: isAddingColumn }] =
		useAddAssetSourceColumnMutation();
	const [cloneAssetSourceRow, { isLoading: isCloningRow }] =
		useCloneAssetSourceRowMutation();
	const [deleteAssetSourceRow, { isLoading: isDeletingRow }] =
		useDeleteAssetSourceRowMutation();

	const isDraft = asset?.status === "draft";
	const syncedColumnNames = useMemo(
		() => new Set(asset?.syncedColumns || []),
		[asset?.syncedColumns]
	);
	const canModifyColumnStructure = useCallback(
		(column) =>
			!readOnly &&
			(localUnsyncedColumns.has(column) ||
				!syncedColumnNames.has(column)),
		[readOnly, syncedColumnNames, localUnsyncedColumns]
	);

	const columns = useMemo(
		() => rowsData?.columns || asset?.columns || [],
		[rowsData, asset]
	);

	const rows = useMemo(() => {
		const serverRows = rowsData?.rows || [];
		return serverRows.map((row) => {
			const edit = pendingEdits[row._id];
			const merged = edit ? { ...row, ...edit } : { ...row };
			const normalized = { ...merged };
			for (const col of Object.keys(merged)) {
				if (
					col === "_id" ||
					col === "rowIndex" ||
					col === "primaryKey"
				) {
					continue;
				}
				if (typeof merged[col] === "string" || merged[col] == null) {
					normalized[col] = normalizeCellText(merged[col]);
				}
			}
			return normalized;
		});
	}, [rowsData, pendingEdits]);

	const pagination = rowsData?.pagination || {
		page: 1,
		totalPages: 1,
		total: 0,
	};

	const { data: meData } = useGetMeQuery();
	const accountId = String(
		asset?.accountId?._id || asset?.accountId || meData?.activeAccount?._id || ""
	);
	const {
		data: imageFoldersData,
		isFetching: isLoadingImageFolders,
	} = useGetMindshareFoldersQuery(accountId, {
		skip: !accountId,
		pollingInterval: 60 * 60 * 1000,
	});
	const savedName = asset?.name || "";
	const deletedAssetSourceNames = getDeletedAssetSourceNames(asset);
	const requireNewAssetSourceName = Boolean(
		location.state?.requireNewAssetSourceName
	);
	const suggestedAssetSourceName = String(
		location.state?.suggestedAssetSourceName || ""
	).trim();
	const returnPath = location.state?.returnPath || "/asset-sources";
	const isRecreateDraft =
		isDraft &&
		(requireNewAssetSourceName || deletedAssetSourceNames.length > 0);
	const displayName = name;
	const loading = isAssetLoading || isRowsLoading;
	const isBusy = isFinishing || isSaving;
	const canFinishDraft =
		isDraft &&
		displayName.trim().length > 0 &&
		!nameValidation.isDuplicate &&
		!nameValidation.isChecking;

	const scheduleHighlightClear = useCallback(() => {
		if (highlightTimeoutRef.current) {
			clearTimeout(highlightTimeoutRef.current);
		}
		highlightTimeoutRef.current = setTimeout(() => {
			setHighlightedColumn(null);
			setHighlightedRowId(null);
			setDuplicateHighlight(null);
		}, 15000);
	}, []);

	useEffect(() => {
		setName("");
		setPendingEdits({});
		pendingEditsRef.current = {};
		setPage(1);
		setSelectedRowIds([]);
		setSheetModal(null);
		setColumnModal(null);
		setReplacePanel(null);
		setRenamingColumn(null);
	}, [id]);

	// Resume locally saved cell edits (create draft or completed).
	useEffect(() => {
		if (!accountId || !id || skipEditDraft) return;
		const draft = readEditDraft("as", accountId);
		if (!draft || String(draft._id) !== String(id)) return;
		const pending = draft.pendingEdits || {};
		if (Object.keys(pending).length === 0) return;
		pendingEditsRef.current = pending;
		setPendingEdits(pending);
	}, [accountId, id, skipEditDraft]);

	useEffect(() => {
		if (!asset || isRecreateDraft) return;
		if (asset.name) setName(asset.name);
	}, [asset?.name, asset?._id, isRecreateDraft]);

	useEffect(() => {
		if (!requireNewAssetSourceName) return;
		setName(suggestedAssetSourceName);
	}, [id, requireNewAssetSourceName, suggestedAssetSourceName]);

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

	useEffect(() => {
		return () => {
			if (highlightTimeoutRef.current) {
				clearTimeout(highlightTimeoutRef.current);
			}
		};
	}, []);

	const handleCellChange = useCallback((rowId, rowData) => {
		const next = {
			...pendingEditsRef.current,
			[rowId]: {
				...pendingEditsRef.current[rowId],
				...rowData,
			},
		};
		pendingEditsRef.current = next;
		setPendingEdits(next);
	}, []);

	const commitLocalPatches = useCallback((patches) => {
		if (!patches?.length) return 0;
		const next = applyRowPatches(pendingEditsRef.current, patches);
		pendingEditsRef.current = next;
		setPendingEdits(next);
		return patches.length;
	}, []);

	useEffect(() => {
		pendingEditsRef.current = pendingEdits;
	}, [pendingEdits]);

	// Keep a local draft snapshot as the user edits (until Save clears it).
	useEffect(() => {
		if (!accountId || !id || readOnly) return;
		const hasPending = Object.keys(pendingEdits).length > 0;
		if (!hasPending && !hasSavedChangesRef.current) return;
		const timer = window.setTimeout(() => {
			writeEditDraft("as", accountId, {
				_id: id,
				name: name.trim() || asset?.name || "Untitled",
				isCreateDraft: Boolean(isDraft),
				pendingEdits: pendingEditsRef.current || {},
			});
		}, 400);
		return () => window.clearTimeout(timer);
	}, [accountId, id, readOnly, pendingEdits, name, asset?.name, isDraft]);

	const collectEdits = useCallback(() => {
		const flushed = tableRef.current?.flushActiveEdit?.();
		const merged = { ...pendingEditsRef.current };
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
			delete rowData.primaryKey;
			return { _id: rowId, rowData };
		});
	}, []);

	const validateUniqueColumn = useCallback(
		async (edits = []) => {
			const column = asset?.uniqueColumn || AUTO_ROW_ID_COLUMN;
			const analysis = await checkUniqueColumn({
				id,
				column,
				rows: edits,
			}).unwrap();
			if (analysis?.unique) {
				setDuplicateHighlight(null);
				return analysis;
			}

			const duplicateRowIds = (analysis?.duplicates || []).flatMap(
				(item) => item.rowIds || []
			);
			const rowIds = Array.from(
				new Set([
					...duplicateRowIds,
					...(analysis?.emptyRowIds || []),
				].map(String))
			);
			setDuplicateHighlight({
				column,
				rowIds,
				message: analysis?.message || null,
			});
			scheduleHighlightClear();
			const firstIndex =
				analysis?.duplicates?.[0]?.rowIndexes?.[0] ??
				analysis?.emptyRowIndexes?.[0];
			if (firstIndex != null) {
				setPage(
					Math.max(
						1,
						Math.ceil(Number(firstIndex) / rowsPerPage)
					)
				);
			}
			const error = new Error(
				analysis?.message ||
					`"${column}" must contain non-empty, distinct values.`
			);
			error.code = "UNIQUE_COLUMN_INVALID";
			throw error;
		},
		[
			asset?.uniqueColumn,
			checkUniqueColumn,
			id,
			rowsPerPage,
			scheduleHighlightClear,
		]
	);

	useEffect(() => {
		if (!id || !asset?.uniqueColumn) return;
		validateUniqueColumn([]).catch(() => {});
	}, [id, asset?.uniqueColumn, validateUniqueColumn]);

	const flushPendingEditsIfAny = async () => {
		const edits = collectEdits();
		if (edits.length === 0) {
			setPendingEdits({});
			return;
		}
		await validateUniqueColumn(edits);
		await updateRows({ id, rows: edits }).unwrap();
		setPendingEdits({});
	};

	const flushPendingEditsForLeave = async () => {
		const edits = collectEdits();
		if (edits.length === 0) {
			setPendingEdits({});
			return;
		}
		await updateRows({ id, rows: edits }).unwrap();
		setPendingEdits({});
	};

	const getSelectedRowIds = () =>
		selectedRowIds.length
			? selectedRowIds
			: tableRef.current?.getSelectedRowIds?.() || [];

	const clearRowSelection = () => {
		setSelectedRowIds([]);
		tableRef.current?.clearSelection?.();
	};

	const closeSheetModal = () => setSheetModal(null);

	const closeColumnModal = () => {
		setColumnModal(null);
		clearRowSelection();
	};

	const handleAddRow = async () => {
		if (isAddingRow) return;
		try {
			await flushPendingEditsIfAny();
			const result = await addAssetSourceRow({ id }).unwrap();
			const newRowId = result?.row?._id;
			const totalRows =
				result?.processedRows ?? (pagination?.total ?? 0) + 1;
			const targetPage = Math.max(1, Math.ceil(totalRows / rowsPerPage));
			if (newRowId) {
				setHighlightedRowId(String(newRowId));
				setHighlightedColumn(null);
				scheduleHighlightClear();
			}
			setPage(targetPage);
			hasSavedChangesRef.current = true;
			showSuccess("Row added");
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to add row"));
		}
	};

	const handleAddColumn = async (columnName) => {
		if (isAddingColumn) return;
		try {
			await flushPendingEditsIfAny();
			await addAssetSourceColumn({ id, columnName }).unwrap();
			const trimmed = columnName.trim();
			if (trimmed) {
				setHighlightedColumn(trimmed);
				setHighlightedRowId(null);
				scheduleHighlightClear();
			}
			hasSavedChangesRef.current = true;
			showSuccess("Column added");
			closeSheetModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to add column"));
		}
	};

	const handleCloneRow = async (sourceRowId) => {
		try {
			await flushPendingEditsIfAny();
			const result = await cloneAssetSourceRow({
				id,
				sourceRowId,
			}).unwrap();
			const newRow = result?.row || result?.data?.row;
			const newRowId = newRow?._id;
			const newIndex = newRow?.rowIndex;
			if (newRowId) {
				setHighlightedRowId(String(newRowId));
				setHighlightedColumn(null);
				scheduleHighlightClear();
			}
			if (newIndex != null) {
				setPage(Math.max(1, Math.ceil(Number(newIndex) / rowsPerPage)));
			}
			showSuccess("Row cloned");
			hasSavedChangesRef.current = true;
			closeSheetModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to clone row"));
		}
	};

	const handleEditRow = (row) => setEditingRow(row);

	const handleSaveRow = (rowData) => {
		if (!editingRow?._id) return;
		const changed = columns.some(
			(column) =>
				normalizeCellText(rowData[column]) !==
				normalizeCellText(editingRow[column])
		);
		if (!changed) {
			setEditingRow(null);
			showWarning("No row changes to save");
			return;
		}
		handleCellChange(editingRow._id, rowData);
		setEditingRow(null);
		showSuccess("Row changes ready to save");
	};

	const handleDeleteRow = (row) => setDeletingRow(row);

	const handleDeleteRowConfirm = async () => {
		if (!deletingRow?._id) return;
		try {
			await deleteAssetSourceRow({
				id,
				rowId: deletingRow._id,
			}).unwrap();
			setDeletingRow(null);
			hasSavedChangesRef.current = true;
			showSuccess("Row deleted");
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to delete row"));
		}
	};

	const handleCopyRow = async (row) => {
		try {
			const result = await cloneAssetSourceRow({
				id,
				sourceRowId: row._id,
			}).unwrap();
			const newRow = result?.row || result?.data?.row;
			const newRowId = newRow?._id;
			const newIndex = newRow?.rowIndex ?? Number(row.rowIndex) + 1;
			if (newRowId) {
				setHighlightedRowId(String(newRowId));
				setHighlightedColumn(null);
				scheduleHighlightClear();
			}
			if (newIndex != null) {
				setPage(Math.max(1, Math.ceil(Number(newIndex) / rowsPerPage)));
			}
			showSuccess("Row copied");
			hasSavedChangesRef.current = true;
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to copy row"));
		}
	};

	const handleCloneColumn = async ({ sourceColumn, newColumnName }) => {
		try {
			await flushPendingEditsIfAny();
			await cloneColumn({
				id,
				sourceColumn,
				newColumnName,
			}).unwrap();
			setLocalUnsyncedColumns((current) => {
				const next = new Set(current);
				next.add(newColumnName.trim());
				return next;
			});
			hasSavedChangesRef.current = true;
			showSuccess("Column cloned");
			closeSheetModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to clone column"));
		}
	};

	const cloneRowOptions = allRowsData?.rows || rows;

	const goToAssetSourceList = () => {
		if (accountId) clearEditDraft("as", accountId);
		dispatch(
			api.util.invalidateTags([
				"AssetUploads",
				{ type: "AssetUploads", id: "LIST" },
				{ type: "AssetUploads", id },
				{ type: "AssetSourceRows", id },
				{ type: "CopyMatrices", id: "LIST" },
				"CopyMatrices",
			])
		);
		navigate("/asset-sources", { replace: true });
	};

	const handleSaveChanges = async () => {
		try {
			const edits = collectEdits();
			if (edits.length === 0) {
				if (hasSavedChangesRef.current) {
					await validateUniqueColumn([]);
				}
				showSuccess(
					hasSavedChangesRef.current
						? "Changes saved"
						: "No new changes to save"
				);
				goToAssetSourceList();
				return;
			}
			await validateUniqueColumn(edits);
			await updateRows({ id, rows: edits }).unwrap();
			setPendingEdits({});
			showSuccess("Changes saved");
			goToAssetSourceList();
		} catch (error) {
			showError(getApiErrorMessage(error));
		}
	};

	const handleFinish = async () => {
		if (!isDraft || !canFinishDraft) return;
		const assetSourceName = displayName.trim();
		if (!assetSourceName) {
			showError("Asset source name is required");
			return;
		}
		try {
			try {
				const edits = collectEdits();
				await validateUniqueColumn(edits);
				if (edits.length > 0) {
					await updateRows({ id, rows: edits }).unwrap();
					setPendingEdits({});
				}
			} catch (error) {
				showError(error?.message || getApiErrorMessage(error));
				return;
			}

			const result = await finishAssetSource({
				id,
				assetName: assetSourceName,
			}).unwrap();

			showSuccess(result?.message || "Asset source saved successfully");
			goToAssetSourceList();
		} catch (error) {
			showError(getApiErrorMessage(error));
		}
	};

	const handleColumnAction = async ({ action, columnName, anchorRect }) => {
		if (readOnly || !columnName) return;

		switch (action) {
			case "sequence-number": {
				try {
					tableRef.current?.flushActiveEdit?.();
					const selected = getSelectedRowIds().map(String);
					const patches = fillSequenceLocal(
						rows,
						columnName,
						selected.length ? selected : undefined
					);
					const updated = commitLocalPatches(patches);
					setHighlightedColumn(columnName);
					scheduleHighlightClear();
					showSuccess(
						selected.length
							? `Sequence applied to ${updated} selected row${
									updated === 1 ? "" : "s"
							  } (draft)`
							: `Sequence applied to ${updated} rows (draft)`
					);
					clearRowSelection();
				} catch (error) {
					showError(
						getApiErrorMessage(error, "Failed to fill sequence")
					);
				}
				break;
			}
			case "from-other-column":
				setColumnModal({
					type: "from-column",
					column: columnName,
					anchorRect: anchorRect || null,
				});
				break;
			case "generate-text":
				setColumnModal({
					type: "generate-text",
					column: columnName,
					anchorRect: anchorRect || null,
				});
				break;
			case "update-images":
				setColumnModal({
					type: "update-images",
					column: columnName,
					anchorRect: anchorRect || null,
				});
				break;
			case "select-date":
				setColumnModal({
					type: "select-date",
					column: columnName,
					anchorRect: anchorRect || null,
				});
				break;
			case "clone-col": {
				try {
					await flushPendingEditsIfAny();
					const newColumnName = suggestCloneColumnName(
						columnName,
						columns
					);
					const result = await cloneColumn({
						id,
						sourceColumn: columnName,
						newColumnName,
					}).unwrap();
					const created = result?.newColumnName || newColumnName;
					setHighlightedColumn(created);
					setRenamingColumn(created);
					showSuccess("Column cloned — rename the header");
				} catch (error) {
					showError(
						getApiErrorMessage(error, "Failed to clone column")
					);
				}
				break;
			}
			case "replace":
				setReplaceStatusMessage(null);
				setFindMatchIndex(0);
				setFindMatches([]);
				setFindQuery("");
				setReplaceUndoStack([]);
				setReplaceRedoStack([]);
				setReplacePanel({
					column: columnName,
					anchorRect: anchorRect || null,
				});
				break;
			case "rename-column":
				if (!canModifyColumnStructure(columnName)) {
					showWarning(
						"This column cannot be renamed because it is synced with a copy matrix"
					);
					return;
				}
				setRenamingColumn(columnName);
				break;
			case "delete-column":
				if (!canModifyColumnStructure(columnName)) {
					showWarning(
						"This column cannot be deleted because it is synced with a copy matrix"
					);
					return;
				}
				if (asset?.uniqueColumn === columnName) {
					showWarning(
						"Cannot delete the unique column. Change it first."
					);
					return;
				}
				setColumnModal({ type: "delete", column: columnName });
				break;
			default:
				break;
		}
	};

	const handleCopyFromColumn = async ({
		sourceColumn,
		template,
		splitBy,
	}) => {
		const targetColumn = columnModal?.column;
		if (!targetColumn) return;
		try {
			tableRef.current?.flushActiveEdit?.();
			const selected = getSelectedRowIds().map(String);
			const patches = copyFromColumnLocal(
				rows,
				targetColumn,
				sourceColumn,
				template,
				splitBy,
				selected.length ? selected : undefined
			);
			const updated = commitLocalPatches(patches);
			setHighlightedColumn(targetColumn);
			scheduleHighlightClear();
			showSuccess(
				selected.length
					? `Extracted to ${updated} selected row${
							updated === 1 ? "" : "s"
					  } (draft)`
					: `Extracted to ${updated} rows (draft)`
			);
			closeColumnModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to extract column"));
		}
	};

	const handleGenerateText = async ({ template }) => {
		const targetColumn = columnModal?.column;
		if (!targetColumn) return;
		try {
			tableRef.current?.flushActiveEdit?.();
			const selected = getSelectedRowIds().map(String);
			const patches = generateTextLocal(
				rows,
				targetColumn,
				template,
				selected.length ? selected : undefined
			);
			const updated = commitLocalPatches(patches);
			setHighlightedColumn(targetColumn);
			scheduleHighlightClear();
			showSuccess(
				selected.length
					? `Text generated for ${updated} selected row${
							updated === 1 ? "" : "s"
					  } (draft)`
					: `Text generated for ${updated} rows (draft)`
			);
			closeColumnModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to generate text"));
		}
	};

	const handleUploadImages = async ({
		files,
		template,
		folder,
		alsoUpdate = false,
	}) => {
		const targetColumn = columnModal?.column;
		try {
			tableRef.current?.flushActiveEdit?.();
			const selected = getSelectedRowIds().map(String);
			const applyToSelection = selected.length > 0 && Boolean(targetColumn);

			const result = await uploadColumnImages({
				id,
				files,
				folder: folder || undefined,
			}).unwrap();

			const cdnUrl = String(result?.cdnUrl || "").trim();

			if (applyToSelection) {
				if (!cdnUrl) {
					showError(
						"Upload succeeded but no CDN URL was found for the image. Wait a moment and try Update URLs, or upload again."
					);
					return;
				}
				const patches = fillColumnValueLocal(
					rows,
					targetColumn,
					cdnUrl,
					selected
				);
				const updated = commitLocalPatches(patches);
				setHighlightedColumn(targetColumn);
				scheduleHighlightClear();
				showSuccess(
					`Uploaded image and set CDN URL on ${updated} selected row${
						updated === 1 ? "" : "s"
					} (draft)`
				);
				closeColumnModal();
				clearRowSelection();
				return;
			}

			if (alsoUpdate && targetColumn && template) {
				const targets = selectTargetRows(
					rows,
					selected.length ? selected : undefined
				);
				const applyResult = await applyColumnImages({
					id,
					targetColumn,
					template,
					folder,
					rowIds: selected.length ? selected : undefined,
					dryRun: true,
					rowSnapshots: targets.map((row) => ({
						_id: row._id,
						rowData: row.rowData,
					})),
				}).unwrap();
				const patches = (applyResult?.updates || []).map((u) => ({
					rowId: String(u.rowId),
					rowData: { [targetColumn]: u.url },
				}));
				const updated = commitLocalPatches(patches);
				setHighlightedColumn(targetColumn);
				scheduleHighlightClear();
				showSuccess(
					`Uploaded ${result?.uploaded ?? files?.length ?? 0} file${
						(result?.uploaded ?? files?.length ?? 0) === 1
							? ""
							: "s"
					}; updated ${updated} CDN URL${
						updated === 1 ? "" : "s"
					} (draft)`
				);
				closeColumnModal();
				clearRowSelection();
				return;
			}

			showSuccess(
				result?.uploaded != null
					? `Uploaded ${result.uploaded} file${
							result.uploaded === 1 ? "" : "s"
					  } to asset library`
					: "Images uploaded to asset library"
			);
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to upload images"));
		}
	};

	const handleApplyImages = async ({ template, folder }) => {
		const targetColumn = columnModal?.column;
		if (!targetColumn) return;
		try {
			tableRef.current?.flushActiveEdit?.();
			const selected = getSelectedRowIds().map(String);
			const targets = selectTargetRows(
				rows,
				selected.length ? selected : undefined
			);
			const result = await applyColumnImages({
				id,
				targetColumn,
				template,
				folder,
				rowIds: selected.length ? selected : undefined,
				dryRun: true,
				rowSnapshots: targets.map((row) => ({
					_id: row._id,
					rowData: row.rowData,
				})),
			}).unwrap();
			const patches = (result?.updates || []).map((u) => ({
				rowId: String(u.rowId),
				rowData: { [targetColumn]: u.url },
			}));
			const updated = commitLocalPatches(patches);
			setHighlightedColumn(targetColumn);
			scheduleHighlightClear();
			showSuccess(
				`Updated ${updated} row${
					updated === 1 ? "" : "s"
				} with image URLs (draft)${
					result?.missing
						? ` (${result.missing} without a match)`
						: ""
				}`
			);
			closeColumnModal();
			clearRowSelection();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to apply images"));
		}
	};

	const handleFillDate = async ({ dateValue, scope }) => {
		const column = columnModal?.column;
		if (!column) return;
		try {
			tableRef.current?.flushActiveEdit?.();
			const selected = getSelectedRowIds().map(String);
			if (scope === "selected" && selected.length === 0) {
				showWarning("Select at least one row first");
				return;
			}
			const limitToSelected =
				scope === "selected" ||
				(scope === "all" && selected.length > 0);

			const patches = fillDateLocal(
				rows,
				column,
				dateValue,
				limitToSelected ? selected : undefined
			);
			const updated = commitLocalPatches(patches);
			setHighlightedColumn(column);
			scheduleHighlightClear();
			showSuccess(
				limitToSelected
					? `Date applied to ${updated} selected rows (draft)`
					: `Date applied to ${updated} rows (draft)`
			);
			closeColumnModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to fill date"));
		}
	};

	const jumpToMatchedRow = useCallback(
		(matchedRows, matchIndex = 0, column = null) => {
			if (!matchedRows?.length) return;
			const idx =
				((matchIndex % matchedRows.length) + matchedRows.length) %
				matchedRows.length;
			const match = matchedRows[idx];
			const targetColumn = column || replacePanel?.column || null;
			const rowId = String(match.rowId);

			let targetPage = page;
			if (
				typeof match.offset === "number" &&
				Number.isFinite(match.offset) &&
				match.offset >= 0
			) {
				targetPage = Math.floor(match.offset / rowsPerPage) + 1;
			} else if (
				Number.isFinite(Number(match.rowIndex)) &&
				Number(match.rowIndex) > 0
			) {
				targetPage =
					Math.floor((Number(match.rowIndex) - 1) / rowsPerPage) + 1;
			}

			if (targetPage !== page) {
				pendingFindFocusRef.current = {
					rowId,
					column: targetColumn,
					allRowIds: matchedRows.map((m) => String(m.rowId)),
				};
				setPage(targetPage);
				return;
			}

			setHighlightedRowId(rowId);
			if (targetColumn) setHighlightedColumn(targetColumn);
			scheduleHighlightClear();
			setDuplicateHighlight({
				column: targetColumn,
				rowIds: matchedRows.map((m) => String(m.rowId)),
				message: null,
			});
		},
		[page, rowsPerPage, replacePanel?.column, scheduleHighlightClear]
	);

	useEffect(() => {
		const pending = pendingFindFocusRef.current;
		if (!pending?.rowId) return;
		const exists = rows.some((r) => String(r._id) === String(pending.rowId));
		if (!exists) return;
		setHighlightedRowId(pending.rowId);
		if (pending.column) setHighlightedColumn(pending.column);
		scheduleHighlightClear();
		setDuplicateHighlight({
			column: pending.column,
			rowIds: pending.allRowIds || [pending.rowId],
			message: null,
		});
		pendingFindFocusRef.current = null;
	}, [rows, page, scheduleHighlightClear]);

	const handleReplaceInColumn = async ({
		find,
		replace,
		mode,
		columnName,
	}) => {
		const column = columnName || replacePanel?.column;
		if (!column) return;
		const query = String(find ?? "");

		try {
			tableRef.current?.flushActiveEdit?.();
			const selected = getSelectedRowIds().map(String);
			if (mode === "replace" && selected.length === 0) {
				setReplaceStatusMessage("Select at least one row first");
				return;
			}

			if (
				mode === "find" &&
				findQuery === query &&
				findMatches.length > 0 &&
				column === replacePanel?.column
			) {
				const nextIndex = findMatchIndex % findMatches.length;
				jumpToMatchedRow(findMatches, nextIndex, column);
				setFindMatchIndex(nextIndex + 1);
				setReplaceStatusMessage(
					`${findMatches.length} matching rows found — showing ${
						nextIndex + 1
					} of ${findMatches.length}`
				);
				return;
			}

			const limitToSelected =
				mode === "replace" ||
				(mode === "replaceAll" && selected.length > 0);
			const targets = selectTargetRows(
				rows,
				limitToSelected ? selected : undefined
			);

			const matchedRows = [];
			targets.forEach((row, offset) => {
				const current = cellText(row.rowData?.[column]);
				const isMatch = query === "" ? current === "" : current.includes(query);
				if (isMatch) {
					matchedRows.push({
						rowId: String(row._id),
						rowIndex: row.rowIndex,
						offset,
						before: current,
					});
				}
			});

			if (mode === "find") {
				setFindQuery(query);
				setFindMatches(matchedRows);
				if (matchedRows.length === 0) {
					setFindMatchIndex(0);
					setDuplicateHighlight(null);
					setHighlightedRowId(null);
					setReplaceStatusMessage("No matches found");
					return;
				}
				jumpToMatchedRow(matchedRows, 0, column);
				setFindMatchIndex(1);
				setReplaceStatusMessage(
					`${matchedRows.length} matching rows found — showing 1 of ${matchedRows.length}`
				);
				return;
			}

			const replacement = String(replace ?? "");
			const patches = replaceInColumnLocal(
				targets,
				column,
				query,
				replacement,
				undefined
			);
			const changes = patches.map((patch) => {
				const before =
					matchedRows.find((m) => m.rowId === patch.rowId)?.before ??
					"";
				return {
					rowId: patch.rowId,
					before,
					after: patch.rowData[column],
				};
			});
			commitLocalPatches(patches);

			if (changes.length) {
				setReplaceUndoStack((prev) => [
					...prev,
					{ column, changes },
				]);
				setReplaceRedoStack([]);
			}

			setReplaceStatusMessage(
				`Replaced ${patches.length} of ${matchedRows.length} matched rows (draft)`
			);
			setFindQuery("");
			setFindMatches([]);
			setFindMatchIndex(0);
			setHighlightedColumn(column);
			scheduleHighlightClear();
			if (matchedRows.length) {
				jumpToMatchedRow(matchedRows, 0, column);
			}
			clearRowSelection();
		} catch (error) {
			setReplaceStatusMessage(
				getApiErrorMessage(error, "Failed to find / replace")
			);
		}
	};

	const applyReplaceChanges = async (entry, direction) => {
		if (!entry?.changes?.length || !entry.column) return;
		const patches = entry.changes.map((change) => ({
			rowId: change.rowId,
			rowData: {
				[entry.column]:
					direction === "undo" ? change.before : change.after,
			},
		}));
		commitLocalPatches(patches);
		setHighlightedColumn(entry.column);
		scheduleHighlightClear();
		setDuplicateHighlight({
			column: entry.column,
			rowIds: entry.changes.map((c) => String(c.rowId)),
			message: null,
		});
	};

	const handleReplaceUndo = async () => {
		const entry = replaceUndoStack[replaceUndoStack.length - 1];
		if (!entry) return;
		try {
			await applyReplaceChanges(entry, "undo");
			setReplaceUndoStack((prev) => prev.slice(0, -1));
			setReplaceRedoStack((prev) => [...prev, entry]);
			setReplaceStatusMessage(
				`Undo: restored ${entry.changes.length} cell${
					entry.changes.length === 1 ? "" : "s"
				}`
			);
		} catch (error) {
			setReplaceStatusMessage(getApiErrorMessage(error, "Failed to undo"));
		}
	};

	const handleReplaceRedo = async () => {
		const entry = replaceRedoStack[replaceRedoStack.length - 1];
		if (!entry) return;
		try {
			await applyReplaceChanges(entry, "redo");
			setReplaceRedoStack((prev) => prev.slice(0, -1));
			setReplaceUndoStack((prev) => [...prev, entry]);
			setReplaceStatusMessage(
				`Redo: reapplied ${entry.changes.length} cell${
					entry.changes.length === 1 ? "" : "s"
				}`
			);
		} catch (error) {
			setReplaceStatusMessage(getApiErrorMessage(error, "Failed to redo"));
		}
	};

	const handleColumnRenameSubmit = async (oldName, newName) => {
		try {
			await flushPendingEditsIfAny();
			await renameColumn({ id, oldName, newName }).unwrap();
			setLocalUnsyncedColumns((current) => {
				if (!current.has(oldName)) return current;
				const next = new Set(current);
				next.delete(oldName);
				next.add(newName);
				return next;
			});
			setRenamingColumn(null);
			setHighlightedColumn(newName);
			scheduleHighlightClear();
			hasSavedChangesRef.current = true;
			showSuccess("Column renamed");
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to rename column"));
		}
	};

	const handleDeleteColumnConfirm = async () => {
		const column = columnModal?.column;
		if (!column) return;
		try {
			await flushPendingEditsIfAny();
			await deleteColumn({ id, column }).unwrap();
			hasSavedChangesRef.current = true;
			showSuccess(`Deleted column "${column}"`);
			closeColumnModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to delete column"));
		}
	};

	const handleLeave = async (toPath) => {
		if (isBusy) return;
		try {
			const pendingMap = capturePendingEditsMap(pendingEditsRef, tableRef);
			const hasPendingEdits = Object.keys(pendingMap).length > 0;
			const nameChanged =
				Boolean(name.trim()) &&
				name.trim() !== String(asset?.name || "").trim();
			const hasChanges =
				hasPendingEdits || hasSavedChangesRef.current || nameChanged;

			if (!hasChanges) {
				if (isDraft) {
					try {
						await deleteAssetSource(id).unwrap();
					} catch {
						// ignore delete failures on unused draft
					}
					const stored = accountId ? readEditDraft("as", accountId) : null;
					if (stored && String(stored._id) === String(id)) {
						clearEditDraft("as", accountId);
					}
				}
				// Keep existing edit-draft so Edit can still ask Load / Discard.
				navigate(toPath);
				return;
			}

			// Always keep edits local until Save — never flush cells to the server on leave.
			if (accountId) {
				writeEditDraft("as", accountId, {
					_id: id,
					name: name.trim() || asset?.name || "Untitled",
					isCreateDraft: isDraft,
					pendingEdits: pendingMap,
				});
			}
			setPendingEdits({});
			pendingEditsRef.current = {};
			showSuccess("Saved as draft");
		} catch (error) {
			showError(
				getApiErrorMessage(error, "Failed to save draft before leaving")
			);
			return;
		}
		navigate(toPath);
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
									onClick={() => navigate("/asset-sources")}
								/>,
						  ]
						: [
								<BackButton
									key="back"
									label="Back"
									onClick={() => handleLeave(returnPath)}
								/>,
								<CancelButton
									key="cancel"
									onClick={() => handleLeave("/asset-sources")}
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
										isDraft ? handleFinish : handleSaveChanges
									}
									disabled={
										isBusy || (isDraft && !canFinishDraft)
									}
								/>,
						  ]
				}
			/>

			<div className="px-8 py-4 border-b">
				<h1 className="text-2xl font-bold text-[#413d42]">
					{displayName ||
						savedName ||
						(readOnly ? "Asset Source View" : "Asset Source Edit")}
				</h1>
				<p className="text-sm text-gray-500 mt-1">
					{readOnly
						? "View only — use the pencil icon on the list to edit"
						: isDraft
						? requireNewAssetSourceName || isRecreateDraft
							? "Edit the asset source name if needed, edit cells, then Finish"
							: "Set the asset source name, edit cells, then Finish"
						: "Double-click a cell to edit · Use column menu for tools · Save when done"}
				</p>
			</div>

			<div className="px-8 py-4 border-b bg-gray-50">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex min-h-10 flex-1 flex-wrap items-center gap-x-8 gap-y-3">
						<div
							className={
								!readOnly && isDraft
									? "min-w-[200px]"
									: "min-w-0 max-w-[42rem]"
							}
						>
							{!readOnly && isDraft ? (
								<ValidatedNameInput
									label="Asset Source Name"
									value={displayName}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g. Summer Campaign"
									accountId={accountId}
									type="assetSource"
									excludeId={id}
									enabled={Boolean(accountId)}
									className="max-w-md"
									onValidationChange={setNameValidation}
								/>
							) : (
								<div className="flex min-w-0 items-center whitespace-nowrap text-sm text-gray-700">
									<span className="shrink-0 font-semibold">
										Asset Source Name:
									</span>{" "}
									<span
										className="ml-1 truncate"
										title={
											displayName.length > 64
												? displayName
												: undefined
										}
									>
										{displayName.length > 64
											? `${displayName.slice(0, 64)}…`
											: displayName}
									</span>
								</div>
							)}
						</div>
						{asset?.uniqueColumn && (
							<div className="text-sm text-gray-700">
								<span className="font-semibold">
									Unique Column:
								</span>{" "}
								<span>
									{asset.uniqueColumn}
								</span>
							</div>
						)}
						{asset?.processedRows != null && (
							<div className="text-sm text-gray-700">
								<span className="font-semibold">Rows:</span>{" "}
								{asset.processedRows} rows
							</div>
						)}
					</div>

					{duplicateHighlight?.message && (
						<div className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
							{duplicateHighlight.message}
						</div>
					)}

					{!readOnly && (
						<div className="flex shrink-0 self-center">
							<CopyMatrixSheetToolbar
								disabled={
									isBusy ||
									loading ||
									isAddingRow ||
									isAddingColumn
								}
								onAddRow={handleAddRow}
								onAddColumn={() => setSheetModal("addColumn")}
								onCloneRow={() => setSheetModal("cloneRow")}
								onCloneColumn={() => setSheetModal("cloneColumn")}
							/>
						</div>
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
					readOnlyColumns={[AUTO_ROW_ID_COLUMN]}
					selectableRows={!readOnly}
					columnMenus={!readOnly}
					canRenameDeleteColumns={canModifyColumnStructure}
					selectedRowIds={selectedRowIds}
					onSelectedRowIdsChange={setSelectedRowIds}
					onColumnAction={handleColumnAction}
					onRowEdit={handleEditRow}
					onRowCopy={handleCopyRow}
					onRowDelete={handleDeleteRow}
					renamingColumn={renamingColumn}
					onColumnRenameSubmit={handleColumnRenameSubmit}
					onColumnRenameCancel={() => setRenamingColumn(null)}
					highlightedRowId={highlightedRowId}
					highlightedColumn={highlightedColumn}
					duplicateHighlight={duplicateHighlight}
					hiddenColumns={
						asset?.uniqueColumn &&
						asset.uniqueColumn !== AUTO_ROW_ID_COLUMN
							? [AUTO_ROW_ID_COLUMN]
							: []
					}
				/>
			</div>

			<EditSheetRowModal
				isOpen={Boolean(editingRow)}
				row={editingRow}
				columns={columns}
				readOnlyColumns={[AUTO_ROW_ID_COLUMN]}
				onClose={() => setEditingRow(null)}
				onConfirm={handleSaveRow}
			/>

			<AddCopyMatrixColumnModal
				isOpen={sheetModal === "addColumn"}
				onClose={closeSheetModal}
				onConfirm={handleAddColumn}
				existingColumns={columns}
				isLoading={isAddingColumn}
			/>

			<CloneCopyMatrixRowModal
				isOpen={sheetModal === "cloneRow"}
				onClose={closeSheetModal}
				onConfirm={handleCloneRow}
				rows={cloneRowOptions}
				columns={columns}
				isLoading={isCloningRow}
			/>

			<CloneCopyMatrixColumnModal
				isOpen={sheetModal === "cloneColumn"}
				onClose={closeSheetModal}
				onConfirm={handleCloneColumn}
				columns={columns}
				isLoading={isCloningColumn}
			/>

			<CopyMatrixFromColumnModal
				isOpen={columnModal?.type === "from-column"}
				onClose={closeColumnModal}
				onConfirm={handleCopyFromColumn}
				targetColumn={columnModal?.column}
				columns={columns}
				sampleRows={rows}
				sampleRow={
					rows.find((row) =>
						selectedRowIds.some(
							(rowId) => String(rowId) === String(row._id)
						)
					) || rows[0]
				}
				anchorRect={columnModal?.anchorRect}
				selectedCount={selectedRowIds.length}
				isLoading={isCopyingFromColumn}
			/>

			<CopyMatrixGenerateTextModal
				isOpen={columnModal?.type === "generate-text"}
				onClose={closeColumnModal}
				onConfirm={handleGenerateText}
				targetColumn={columnModal?.column}
				columns={columns}
				sampleRow={
					rows.find((row) =>
						selectedRowIds.some(
							(rowId) => String(rowId) === String(row._id)
						)
					) || rows[0]
				}
				anchorRect={columnModal?.anchorRect}
				selectedCount={selectedRowIds.length}
				isLoading={isGeneratingText}
			/>

			<CopyMatrixUpdateImagesModal
				isOpen={columnModal?.type === "update-images"}
				onClose={closeColumnModal}
				onUpload={handleUploadImages}
				onApply={handleApplyImages}
				targetColumn={columnModal?.column}
				columns={columns}
				folders={imageFoldersData?.folders || []}
				isLoadingFolders={isLoadingImageFolders}
				sampleRow={
					rows.find((row) =>
						selectedRowIds.some(
							(rowId) => String(rowId) === String(row._id)
						)
					) || rows[0]
				}
				anchorRect={columnModal?.anchorRect}
				selectedCount={selectedRowIds.length}
				isUploading={isUploadingImages || isSettingCdnUrl}
				isApplying={isApplyingImages}
			/>

			<CopyMatrixSelectDateModal
				isOpen={columnModal?.type === "select-date"}
				onClose={closeColumnModal}
				onConfirm={handleFillDate}
				columnName={columnModal?.column}
				anchorRect={columnModal?.anchorRect}
				selectedCount={selectedRowIds.length}
				isLoading={isFillingDate}
			/>

			<CopyMatrixReplacePanel
				isOpen={Boolean(replacePanel?.column)}
				columnName={replacePanel?.column}
				anchorRect={replacePanel?.anchorRect}
				selectedCount={selectedRowIds.length}
				isLoading={isReplacingColumn || isApplyingColumnChanges}
				statusMessage={replaceStatusMessage}
				canUndo={replaceUndoStack.length > 0}
				canRedo={replaceRedoStack.length > 0}
				onFind={({ find }) =>
					handleReplaceInColumn({
						find,
						mode: "find",
						columnName: replacePanel?.column,
					})
				}
				onReplaceAll={({ find, replace }) =>
					handleReplaceInColumn({
						find,
						replace,
						mode: "replaceAll",
						columnName: replacePanel?.column,
					})
				}
				onUndo={handleReplaceUndo}
				onRedo={handleReplaceRedo}
				onClose={() => {
					setReplacePanel(null);
					setReplaceStatusMessage(null);
					setFindMatchIndex(0);
					setFindMatches([]);
					setFindQuery("");
					setReplaceUndoStack([]);
					setReplaceRedoStack([]);
					pendingFindFocusRef.current = null;
					clearRowSelection();
				}}
			/>

			<ConfirmDialog
				isOpen={Boolean(deletingRow)}
				onClose={() => setDeletingRow(null)}
				onConfirm={handleDeleteRowConfirm}
				title="Delete row?"
				message="Are you sure you want to permanently delete this row?"
				confirmLabel="Delete"
				isLoading={isDeletingRow}
			/>

			<ConfirmDialog
				isOpen={columnModal?.type === "delete"}
				onClose={closeColumnModal}
				onConfirm={handleDeleteColumnConfirm}
				title="Delete column?"
				message={`Are you sure you want to permanently delete "${columnModal?.column}"? This will remove the column and all its data.`}
				confirmLabel="Delete"
			/>
		</div>
	);
};

export default AssetSourcePreview;
