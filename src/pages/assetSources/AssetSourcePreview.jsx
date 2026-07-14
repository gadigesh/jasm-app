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
	useFinishAssetSourceMutation,
	useFillAssetSourceColumnSequenceMutation,
	useCopyAssetSourceColumnFromMutation,
	useGenerateAssetSourceColumnTextMutation,
	useFillAssetSourceColumnDateMutation,
	useReplaceAssetSourceColumnMutation,
	useApplyAssetSourceColumnChangesMutation,
	useRenameAssetSourceColumnMutation,
	useDeleteAssetSourceColumnMutation,
	useCloneAssetSourceColumnMutation,
	useAddAssetSourceRowMutation,
	useAddAssetSourceColumnMutation,
	useCloneAssetSourceRowMutation,
} from "../../store/services/assetUpload";
import api from "../../store/services/api";
import { useDispatch } from "react-redux";
import { showSuccess, showError, showWarning } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import ValidatedNameInput from "../../components/common/ValidatedNameInput";
import { useGetMeQuery } from "../../store/services/userAuthApi";
import { getDeletedAssetSourceNames } from "../../utils/copyMatrixHelpers";
import { normalizeCellText } from "../../utils/normalizeCellText";
import { suggestCloneColumnName } from "../../utils/copyMatrixColumnHelpers";
import { AUTO_ROW_ID_COLUMN } from "../../utils/constants";
import CopyMatrixSheetToolbar from "../../components/copyMatrix/preview/CopyMatrixSheetToolbar";
import AddCopyMatrixColumnModal from "../../components/modals/copyMatrix/AddCopyMatrixColumnModal";
import CloneCopyMatrixRowModal from "../../components/modals/copyMatrix/CloneCopyMatrixRowModal";
import CloneCopyMatrixColumnModal from "../../components/modals/copyMatrix/CloneCopyMatrixColumnModal";
import CopyMatrixFromColumnModal from "../../components/modals/copyMatrix/CopyMatrixFromColumnModal";
import CopyMatrixGenerateTextModal from "../../components/modals/copyMatrix/CopyMatrixGenerateTextModal";
import CopyMatrixSelectDateModal from "../../components/modals/copyMatrix/CopyMatrixSelectDateModal";
import CopyMatrixReplacePanel from "../../components/copyMatrix/preview/CopyMatrixReplacePanel";
import ConfirmDialog from "../../components/modals/ConfirmDialog";

const AssetSourcePreview = ({ readOnly = false }) => {
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useDispatch();
	const breadcrumbs = useBreadcrumbs();
	const tableRef = useRef(null);
	const highlightTimeoutRef = useRef(null);
	const pendingFindFocusRef = useRef(null);

	const [page, setPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [name, setName] = useState("");
	const [pendingEdits, setPendingEdits] = useState({});
	const [nameValidation, setNameValidation] = useState({
		isDuplicate: false,
		isChecking: false,
	});
	const [selectedRowIds, setSelectedRowIds] = useState([]);
	const [sheetModal, setSheetModal] = useState(null);
	const [columnModal, setColumnModal] = useState(null);
	const [renamingColumn, setRenamingColumn] = useState(null);
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
	const [finishAssetSource, { isLoading: isFinishing }] =
		useFinishAssetSourceMutation();
	const [fillColumnSequence] = useFillAssetSourceColumnSequenceMutation();
	const [copyColumnFrom, { isLoading: isCopyingFromColumn }] =
		useCopyAssetSourceColumnFromMutation();
	const [generateColumnText, { isLoading: isGeneratingText }] =
		useGenerateAssetSourceColumnTextMutation();
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

	const isDraft = asset?.status === "draft";

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
	const accountId = asset?.accountId || meData?.activeAccount?._id;
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

	const scheduleHighlightClear = () => {
		if (highlightTimeoutRef.current) {
			clearTimeout(highlightTimeoutRef.current);
		}
		highlightTimeoutRef.current = setTimeout(() => {
			setHighlightedColumn(null);
			setHighlightedRowId(null);
		}, 4000);
	};

	useEffect(() => {
		setName("");
		setPendingEdits({});
		setPage(1);
		setSelectedRowIds([]);
		setSheetModal(null);
		setColumnModal(null);
		setReplacePanel(null);
		setRenamingColumn(null);
	}, [id]);

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
		setPendingEdits((prev) => ({
			...prev,
			[rowId]: { ...prev[rowId], ...rowData },
		}));
	}, []);

	const flushPendingEditsIfAny = async () => {
		const flushed = tableRef.current?.flushActiveEdit?.();
		const merged = { ...pendingEdits };
		if (flushed?.rowId) {
			merged[flushed.rowId] = {
				...merged[flushed.rowId],
				...flushed.rowData,
			};
		}
		const edits = Object.entries(merged).map(([rowId, data]) => {
			const rowData = { ...data };
			delete rowData._id;
			delete rowData.rowIndex;
			delete rowData.primaryKey;
			return { _id: rowId, rowData };
		});
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
			showSuccess("Column added");
			closeSheetModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to add column"));
		}
	};

	const handleCloneRow = async (sourceRowId) => {
		try {
			await flushPendingEditsIfAny();
			await cloneAssetSourceRow({ id, sourceRowId }).unwrap();
			showSuccess("Row cloned");
			closeSheetModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to clone row"));
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
			showSuccess("Column cloned");
			closeSheetModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to clone column"));
		}
	};

	const cloneRowOptions = allRowsData?.rows || rows;

	const goToAssetSourceList = () => {
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
			const flushed = tableRef.current?.flushActiveEdit?.();
			const merged = { ...pendingEdits };
			if (flushed?.rowId) {
				merged[flushed.rowId] = {
					...merged[flushed.rowId],
					...flushed.rowData,
				};
			}
			const edits = Object.entries(merged).map(([rowId, data]) => {
				const rowData = { ...data };
				delete rowData._id;
				delete rowData.rowIndex;
				delete rowData.primaryKey;
				return { _id: rowId, rowData };
			});
			if (edits.length === 0) {
				showError("No changes to save");
				return;
			}
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
				await flushPendingEditsIfAny();
			} catch (error) {
				showError(getApiErrorMessage(error));
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
					await flushPendingEditsIfAny();
					const selected = getSelectedRowIds().map(String);
					const result = await fillColumnSequence({
						id,
						column: columnName,
						rowIds: selected.length ? selected : undefined,
					}).unwrap();
					setHighlightedColumn(columnName);
					scheduleHighlightClear();
					showSuccess(
						selected.length
							? `Sequence applied to ${result?.updated ?? 0} selected row${
									(result?.updated ?? 0) === 1 ? "" : "s"
							  }`
							: `Sequence applied to ${result?.updated ?? 0} rows`
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
				if (!isDraft) {
					showWarning(
						"Column names cannot be changed after the asset source is finalized"
					);
					return;
				}
				setRenamingColumn(columnName);
				break;
			case "delete-column":
				if (!isDraft) {
					showWarning(
						"Columns cannot be deleted after the asset source is finalized"
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
			await flushPendingEditsIfAny();
			const selected = getSelectedRowIds().map(String);
			const result = await copyColumnFrom({
				id,
				targetColumn,
				sourceColumn,
				template,
				splitBy,
				rowIds: selected.length ? selected : undefined,
			}).unwrap();
			setHighlightedColumn(targetColumn);
			scheduleHighlightClear();
			showSuccess(
				selected.length
					? `Extracted to ${result?.updated ?? 0} selected row${
							(result?.updated ?? 0) === 1 ? "" : "s"
					  }`
					: `Extracted to ${result?.updated ?? 0} rows`
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
			await flushPendingEditsIfAny();
			const selected = getSelectedRowIds().map(String);
			const result = await generateColumnText({
				id,
				targetColumn,
				template,
				rowIds: selected.length ? selected : undefined,
			}).unwrap();
			setHighlightedColumn(targetColumn);
			scheduleHighlightClear();
			showSuccess(
				selected.length
					? `Text generated for ${result?.updated ?? 0} selected row${
							(result?.updated ?? 0) === 1 ? "" : "s"
					  }`
					: `Text generated for ${result?.updated ?? 0} rows`
			);
			closeColumnModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to generate text"));
		}
	};

	const handleFillDate = async ({ dateValue, scope }) => {
		const column = columnModal?.column;
		if (!column) return;
		try {
			await flushPendingEditsIfAny();
			const selected = getSelectedRowIds().map(String);
			if (scope === "selected" && selected.length === 0) {
				showWarning("Select at least one row first");
				return;
			}
			const limitToSelected =
				scope === "selected" ||
				(scope === "all" && selected.length > 0);

			const result = await fillColumnDate({
				id,
				column,
				dateValue,
				rowIds: limitToSelected ? selected : undefined,
			}).unwrap();
			setHighlightedColumn(column);
			scheduleHighlightClear();
			showSuccess(
				limitToSelected
					? `Date applied to ${result?.updated ?? 0} selected rows`
					: `Date applied to ${result?.updated ?? 0} rows`
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
		[page, rowsPerPage, replacePanel?.column]
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
	}, [rows, page]);

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
			await flushPendingEditsIfAny();
			const selected = getSelectedRowIds().map(String);

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

			const result = await replaceColumn({
				id,
				column,
				find: query,
				replace: replace ?? "",
				mode,
				rowIds: limitToSelected ? selected : undefined,
			}).unwrap();

			const matchedRows = result?.matchedRows || [];
			setReplaceStatusMessage(
				result?.message ||
					(mode === "find"
						? `${result?.matched ?? 0} matching rows found`
						: `Replaced ${result?.updated ?? 0} of ${
								result?.matched ?? 0
						  } matched rows`)
			);

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

			if (result?.changes?.length) {
				setReplaceUndoStack((prev) => [
					...prev,
					{
						column: result.column || column,
						changes: result.changes,
					},
				]);
				setReplaceRedoStack([]);
			}

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
		const changes = entry.changes.map((change) => ({
			rowId: change.rowId,
			value: direction === "undo" ? change.before : change.after,
		}));
		await applyColumnChanges({
			id,
			column: entry.column,
			changes,
			page,
			limit: rowsPerPage,
		}).unwrap();
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
		if (!isDraft) {
			showWarning(
				"Column names cannot be changed after the asset source is finalized"
			);
			setRenamingColumn(null);
			return;
		}
		try {
			await flushPendingEditsIfAny();
			await renameColumn({ id, oldName, newName }).unwrap();
			setRenamingColumn(null);
			setHighlightedColumn(newName);
			scheduleHighlightClear();
			showSuccess("Column renamed");
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to rename column"));
		}
	};

	const handleDeleteColumnConfirm = async () => {
		const column = columnModal?.column;
		if (!column) return;
		if (!isDraft) {
			showWarning(
				"Columns cannot be deleted after the asset source is finalized"
			);
			closeColumnModal();
			return;
		}
		try {
			await flushPendingEditsIfAny();
			await deleteColumn({ id, column }).unwrap();
			showSuccess(`Deleted column "${column}"`);
			closeColumnModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to delete column"));
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
									onClick={() => navigate("/asset-sources")}
								/>,
						  ]
						: [
								<BackButton
									key="back"
									label="Back"
									onClick={() => navigate(returnPath)}
								/>,
								<CancelButton
									key="cancel"
									onClick={() => navigate("/asset-sources")}
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
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-wrap items-start gap-6">
						<div className="min-w-[200px]">
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
								<>
									<label className="block text-sm font-semibold text-gray-700 mb-1">
										Asset Source Name
									</label>
									<div className="w-full max-w-md px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium text-gray-800">
										{displayName}
									</div>
								</>
							)}
						</div>
						{asset?.uniqueColumn && (
							<div className="text-sm text-gray-500 pt-7">
								Unique column:{" "}
								<span className="font-medium text-gray-700">
									{asset.uniqueColumn}
								</span>
							</div>
						)}
						{asset?.processedRows != null && (
							<div className="text-sm text-gray-500 pt-7">
								{asset.processedRows} rows
							</div>
						)}
					</div>

					{!readOnly && (
						<div className="shrink-0 pt-6">
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
					canRenameDeleteColumns={!readOnly && isDraft}
					selectedRowIds={selectedRowIds}
					onSelectedRowIdsChange={setSelectedRowIds}
					onColumnAction={handleColumnAction}
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
