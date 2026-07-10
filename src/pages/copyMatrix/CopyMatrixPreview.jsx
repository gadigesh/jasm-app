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
	useAddCopyMatrixRowMutation,
	useAddCopyMatrixColumnMutation,
	useCloneCopyMatrixRowMutation,
	useCloneCopyMatrixColumnMutation,
	useCheckCopyMatrixUniqueColumnMutation,
	useUpdateCopyMatrixRowsMutation,
	useFillCopyMatrixColumnSequenceMutation,
	useCopyCopyMatrixColumnFromMutation,
	useFillCopyMatrixColumnDateMutation,
	useReplaceCopyMatrixColumnMutation,
	useApplyCopyMatrixColumnChangesMutation,
	useRenameCopyMatrixColumnMutation,
	useDeleteCopyMatrixColumnMutation,
	applyCopyMatrixUpdateToCaches,
} from "../../store/services/copyMatrix";
import CopyMatrixSheetToolbar from "../../components/copyMatrix/preview/CopyMatrixSheetToolbar";
import UniqueColumnSelector from "../../components/copyMatrix/preview/UniqueColumnSelector";
import AddCopyMatrixColumnModal from "../../components/modals/copyMatrix/AddCopyMatrixColumnModal";
import CloneCopyMatrixRowModal from "../../components/modals/copyMatrix/CloneCopyMatrixRowModal";
import CloneCopyMatrixColumnModal from "../../components/modals/copyMatrix/CloneCopyMatrixColumnModal";
import CopyMatrixFromColumnModal from "../../components/modals/copyMatrix/CopyMatrixFromColumnModal";
import CopyMatrixSelectDateModal from "../../components/modals/copyMatrix/CopyMatrixSelectDateModal";
import ConfirmDialog from "../../components/modals/ConfirmDialog";
import CopyMatrixReplacePanel from "../../components/copyMatrix/preview/CopyMatrixReplacePanel";
import { useGetMeQuery } from "../../store/services/userAuthApi";
import api from "../../store/services/api";
import { showSuccess, showError, showWarning } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { runJsonStepsWithProgress } from "../../utils/uploadWithProgress";
import { AUTO_ROW_ID_COLUMN } from "../../utils/constants";
import { isCopyMatrixRecreateMode, isCopyMatrixSynced } from "../../utils/copyMatrixHelpers";
import { suggestCloneColumnName } from "../../utils/copyMatrixColumnHelpers";
import { normalizeCellText } from "../../utils/normalizeCellText";

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
	const [sheetModal, setSheetModal] = useState(null);
	const [columnModal, setColumnModal] = useState(null);
	const [renamingColumn, setRenamingColumn] = useState(null);
	const [selectedRowIds, setSelectedRowIds] = useState([]);
	const [replaceStatusMessage, setReplaceStatusMessage] = useState(null);
	const [replacePanel, setReplacePanel] = useState(null);
	const [findMatchIndex, setFindMatchIndex] = useState(0);
	const [findMatches, setFindMatches] = useState([]);
	const [findQuery, setFindQuery] = useState("");
	const [replaceUndoStack, setReplaceUndoStack] = useState([]);
	const [replaceRedoStack, setReplaceRedoStack] = useState([]);
	const pendingFindFocusRef = useRef(null);
	const [highlightedRowId, setHighlightedRowId] = useState(null);
	const [highlightedColumn, setHighlightedColumn] = useState(null);
	const [uniqueAnalysis, setUniqueAnalysis] = useState(null);
	const [duplicateHighlight, setDuplicateHighlight] = useState(null);
	const highlightTimeoutRef = useRef(null);
	const duplicateHighlightTimeoutRef = useRef(null);
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
	const { data: allRowsData } = useGetCopyMatrixRowsQuery(
		{ id, page: 1, limit: 200 },
		{ skip: !id || sheetModal !== "cloneRow" }
	);

	const { data: meData } = useGetMeQuery();
	const accountId = matrix?.accountId || meData?.activeAccount?._id;

	const [deleteCopyMatrix] = useDeleteCopyMatrixMutation();
	const [addCopyMatrixRow, { isLoading: isAddingRow }] =
		useAddCopyMatrixRowMutation();
	const [addCopyMatrixColumn, { isLoading: isAddingColumn }] =
		useAddCopyMatrixColumnMutation();
	const [cloneCopyMatrixRow, { isLoading: isCloningRow }] =
		useCloneCopyMatrixRowMutation();
	const [cloneCopyMatrixColumn, { isLoading: isCloningColumn }] =
		useCloneCopyMatrixColumnMutation();
	const [updateCopyMatrixRows] = useUpdateCopyMatrixRowsMutation();
	const [checkUniqueColumn, { isLoading: isCheckingUnique }] =
		useCheckCopyMatrixUniqueColumnMutation();
	const [fillColumnSequence, { isLoading: isFillingSequence }] =
		useFillCopyMatrixColumnSequenceMutation();
	const [copyColumnFrom, { isLoading: isCopyingFromColumn }] =
		useCopyCopyMatrixColumnFromMutation();
	const [fillColumnDate, { isLoading: isFillingDate }] =
		useFillCopyMatrixColumnDateMutation();
	const [replaceColumn, { isLoading: isReplacingColumn }] =
		useReplaceCopyMatrixColumnMutation();
	const [applyColumnChanges, { isLoading: isApplyingColumnChanges }] =
		useApplyCopyMatrixColumnChangesMutation();
	const [renameColumn, { isLoading: isRenamingColumnOp }] =
		useRenameCopyMatrixColumnMutation();
	const [deleteColumn, { isLoading: isDeletingColumn }] =
		useDeleteCopyMatrixColumnMutation();

	const columns = useMemo(
		() => rowsData?.columns || matrix?.columns || [],
		[rowsData, matrix]
	);

	const rows = useMemo(() => {
		const serverRows = rowsData?.rows || [];
		return serverRows.map((row) => {
			const edit = pendingEdits[row._id];
			const merged = edit ? { ...row, ...edit } : { ...row };
			const normalized = { ...merged };
			for (const col of Object.keys(merged)) {
				if (col === "_id" || col === "rowIndex") continue;
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

	const closeSheetModal = () => setSheetModal(null);

	const scheduleHighlightClear = useCallback(() => {
		if (highlightTimeoutRef.current) {
			clearTimeout(highlightTimeoutRef.current);
		}
		highlightTimeoutRef.current = setTimeout(() => {
			setHighlightedRowId(null);
			setHighlightedColumn(null);
		}, 15000);
	}, []);

	const scheduleDuplicateHighlightClear = useCallback(() => {
		if (duplicateHighlightTimeoutRef.current) {
			clearTimeout(duplicateHighlightTimeoutRef.current);
		}
		duplicateHighlightTimeoutRef.current = setTimeout(() => {
			setDuplicateHighlight(null);
		}, 15000);
	}, []);

	/** Persist unsaved cell edits so uniqueness checks use current data. */
	const flushPendingEditsIfAny = useCallback(async () => {
		const edits = collectEdits();
		if (edits.length === 0) return;
		await updateCopyMatrixRows({ id, rows: edits }).unwrap();
		setPendingEdits({});
	}, [id, updateCopyMatrixRows, pendingEdits]);

	const applyUniqueAnalysis = useCallback(
		(analysis, column) => {
			setUniqueAnalysis(analysis);

			if (!analysis || analysis.unique || column === AUTO_ROW_ID_COLUMN) {
				setDuplicateHighlight(null);
				return;
			}

			const rowIds = [
				...(analysis.duplicates || []).flatMap((d) => d.rowIds || []),
				...(analysis.emptyRowIds || []),
			];
			const emptyIndexes = analysis.emptyRowIndexes || [];
			setDuplicateHighlight({
				column,
				rowIds,
				message: analysis.message,
			});
			scheduleDuplicateHighlightClear();

			const firstDup = analysis.duplicates?.[0];
			const firstIndex =
				firstDup?.rowIndexes?.[0] ?? emptyIndexes[0] ?? null;
			if (firstIndex != null) {
				const targetPage = Math.max(
					1,
					Math.ceil(Number(firstIndex) / rowsPerPage)
				);
				setPage(targetPage);
			}
		},
		[rowsPerPage, scheduleDuplicateHighlightClear]
	);

	const runUniqueColumnCheck = useCallback(
		async (column, { flushEdits = true } = {}) => {
			if (!id || !column) return null;
			if (flushEdits) {
				try {
					await flushPendingEditsIfAny();
				} catch (error) {
					showError(
						getApiErrorMessage(error, "Failed to save edits before unique check")
					);
					return null;
				}
			}
			if (column === AUTO_ROW_ID_COLUMN) {
				const analysis = {
					unique: true,
					column,
					duplicates: [],
					emptyRowIndexes: [],
					emptyRowIds: [],
					message: null,
				};
				applyUniqueAnalysis(analysis, column);
				return analysis;
			}
			try {
				const analysis = await checkUniqueColumn({
					id,
					column,
				}).unwrap();
				applyUniqueAnalysis(analysis, column);
				return analysis;
			} catch (error) {
				showError(
					getApiErrorMessage(error, "Failed to check unique column")
				);
				return null;
			}
		},
		[id, checkUniqueColumn, applyUniqueAnalysis, flushPendingEditsIfAny]
	);

	const handleUniqueColumnChange = async (column) => {
		setUniqueColumn(column);
		await runUniqueColumnCheck(column);
	};

	/**
	 * Before finish/create AS: re-check uniqueness.
	 * If still not unique, fall back to Row ID and warn the user.
	 */
	const resolveUniqueColumnForSave = async () => {
		const requested = uniqueColumn || AUTO_ROW_ID_COLUMN;
		if (requested === AUTO_ROW_ID_COLUMN) {
			await flushPendingEditsIfAny();
			return AUTO_ROW_ID_COLUMN;
		}

		const analysis = await runUniqueColumnCheck(requested, {
			flushEdits: true,
		});
		if (analysis?.unique) {
			return requested;
		}

		showWarning(
			analysis?.message
				? `${analysis.message}. Saving with "${AUTO_ROW_ID_COLUMN}" as the unique column.`
				: `"${requested}" is not unique. Saving with "${AUTO_ROW_ID_COLUMN}".`
		);
		setUniqueColumn(AUTO_ROW_ID_COLUMN);
		setUniqueAnalysis({
			unique: true,
			column: AUTO_ROW_ID_COLUMN,
			duplicates: [],
			emptyRowIndexes: [],
			emptyRowIds: [],
			message: null,
		});
		setDuplicateHighlight(null);
		return AUTO_ROW_ID_COLUMN;
	};

	useEffect(() => {
		return () => {
			if (highlightTimeoutRef.current) {
				clearTimeout(highlightTimeoutRef.current);
			}
			if (duplicateHighlightTimeoutRef.current) {
				clearTimeout(duplicateHighlightTimeoutRef.current);
			}
		};
	}, []);

	// After the user edits cells while a column is marked not-unique, re-check
	// so Row ID can hide once duplicates are fixed (before save).
	useEffect(() => {
		if (!uniqueColumn || uniqueColumn === AUTO_ROW_ID_COLUMN) return;
		if (uniqueAnalysis?.unique !== false) return;
		if (Object.keys(pendingEdits).length === 0) return;

		const timer = setTimeout(() => {
			runUniqueColumnCheck(uniqueColumn);
		}, 900);
		return () => clearTimeout(timer);
	}, [pendingEdits, uniqueColumn, uniqueAnalysis?.unique, runUniqueColumnCheck]);

	const handleAddRow = async () => {
		if (isAddingRow) return;
		try {
			const result = await addCopyMatrixRow({ id }).unwrap();
			const newRowId = result?.row?._id;
			const totalRows =
				result?.processedRows ??
				(pagination?.total ?? 0) + 1;
			const targetPage = Math.max(
				1,
				Math.ceil(totalRows / rowsPerPage)
			);

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
			await addCopyMatrixColumn({ id, columnName }).unwrap();
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
			await cloneCopyMatrixRow({ id, sourceRowId }).unwrap();
			showSuccess("Row cloned");
			closeSheetModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to clone row"));
		}
	};

	const handleCloneColumn = async ({ sourceColumn, newColumnName }) => {
		try {
			await cloneCopyMatrixColumn({
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

	const getSelectedRowIds = () =>
		selectedRowIds.length
			? selectedRowIds
			: tableRef.current?.getSelectedRowIds?.() || [];

	const clearRowSelection = () => {
		setSelectedRowIds([]);
		tableRef.current?.clearSelection?.();
	};

	const closeColumnModal = () => {
		setColumnModal(null);
		clearRowSelection();
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
					const result = await cloneCopyMatrixColumn({
						id,
						sourceColumn: columnName,
						newColumnName,
					}).unwrap();
					const created =
						result?.newColumnName || newColumnName;
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
				if (isSynced) {
					showWarning(
						"Rename is only available when not synced with an asset source"
					);
					return;
				}
				setRenamingColumn(columnName);
				setHighlightedColumn(columnName);
				break;
			case "delete-column":
				if (isSynced) {
					showWarning(
						"Delete is only available when not synced with an asset source"
					);
					return;
				}
				setColumnModal({ type: "delete", column: columnName });
				break;
			default:
				break;
		}
	};

	const handleCopyFromColumn = async (sourceColumn) => {
		const targetColumn = columnModal?.column;
		if (!targetColumn) return;
		try {
			await flushPendingEditsIfAny();
			const selected = getSelectedRowIds().map(String);
			const result = await copyColumnFrom({
				id,
				targetColumn,
				sourceColumn,
				rowIds: selected.length ? selected : undefined,
			}).unwrap();
			setHighlightedColumn(targetColumn);
			scheduleHighlightClear();
			showSuccess(
				selected.length
					? `Copied to ${result?.updated ?? 0} selected row${
							(result?.updated ?? 0) === 1 ? "" : "s"
					  }`
					: `Copied to ${result?.updated ?? 0} rows`
			);
			closeColumnModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to copy column"));
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
			// If rows are selected, Apply all still only updates the selection
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
				targetPage = Math.max(
					1,
					Math.ceil(Number(match.rowIndex) / rowsPerPage)
				);
			}

			pendingFindFocusRef.current = {
				rowId,
				column: targetColumn,
				allRowIds: matchedRows.map((m) => String(m.rowId)),
			};

			if (targetPage !== page) {
				setPage(targetPage);
			}

			setHighlightedRowId(rowId);
			setHighlightedColumn(targetColumn);
			const allIds = matchedRows.map((m) => String(m.rowId));
			setDuplicateHighlight({
				column: targetColumn,
				// Put current match first so the table scrolls to it
				rowIds: [rowId, ...allIds.filter((id) => id !== rowId)],
				message: null,
			});
			scheduleHighlightClear();
			scheduleDuplicateHighlightClear();
		},
		[
			page,
			rowsPerPage,
			replacePanel?.column,
			scheduleHighlightClear,
			scheduleDuplicateHighlightClear,
		]
	);

	// After page data loads, ensure the find target row is focused/scrolled.
	useEffect(() => {
		const pending = pendingFindFocusRef.current;
		if (!pending?.rowId || !rows?.length) return;
		const found = rows.some((r) => String(r._id) === pending.rowId);
		if (!found) return;

		setHighlightedRowId(pending.rowId);
		if (pending.column) {
			setHighlightedColumn(pending.column);
			setDuplicateHighlight({
				column: pending.column,
				rowIds: pending.allRowIds || [pending.rowId],
				message: null,
			});
		}
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
		// Keep spaces in the query (including a single space).
		// Empty query is allowed — it targets blank cells.
		const query = String(find ?? "");

		try {
			// Find should see latest typed cells
			await flushPendingEditsIfAny();
			const selected = getSelectedRowIds().map(String);
			if (mode === "replace" && selected.length === 0) {
				setReplaceStatusMessage("Select at least one row first");
				return;
			}

			// Cycle locally when Find is clicked again with the same query
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

			// If rows are selected, All applies only to that selection.
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
		scheduleDuplicateHighlightClear();
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
			setReplaceStatusMessage(
				getApiErrorMessage(error, "Failed to undo")
			);
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
			setReplaceStatusMessage(
				getApiErrorMessage(error, "Failed to redo")
			);
		}
	};

	const handleColumnRenameSubmit = async (oldName, newName) => {
		try {
			await flushPendingEditsIfAny();
			await renameColumn({ id, oldName, newName }).unwrap();
			setRenamingColumn(null);
			setHighlightedColumn(newName);
			scheduleHighlightClear();
			if (uniqueColumn === oldName) {
				setUniqueColumn(newName);
			}
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
			if (uniqueColumn === column) {
				setUniqueColumn(AUTO_ROW_ID_COLUMN);
				setUniqueAnalysis(null);
			}
			setHighlightedColumn(null);
			closeColumnModal();
			showSuccess("Column deleted");
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to delete column"));
		}
	};

	const hideRowIdColumn =
		Boolean(uniqueColumn) &&
		uniqueColumn !== AUTO_ROW_ID_COLUMN &&
		uniqueAnalysis?.unique === true;

	const cloneRowOptions = allRowsData?.rows || rows;

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
				const resolvedUnique = await resolveUniqueColumnForSave();

				const result = await runJsonStepsWithProgress(
					[
						{
							path: `/copy-matrix/${id}/finish`,
							method: "POST",
							body: {
								name: displayName.trim() || matrix?.name,
								uniqueColumn: resolvedUnique,
								finalizeOnly: true,
							},
							phase: "processing",
						},
					],
					({ percent, phase }) => {
						setSaveProgress(percent);
						setSavePhase(phase);
					}
				);

				setPendingEdits({});
				showSuccess(result?.message || "Copy matrix saved");
				goToCopyMatrixList();
				return;
			}

			if (isRecreate || creatingNewAssetSource) {
				const useRecreateFinish =
					isRecreate || creatingNewAssetSource;
				const resolvedUnique = await resolveUniqueColumnForSave();

				const result = await runJsonStepsWithProgress(
					[
						{
							path: `/copy-matrix/${id}/finish`,
							method: "POST",
							body: useRecreateFinish
								? {
										uniqueColumn: resolvedUnique,
										...(creatingNewAssetSource
											? { forceNewAssetSource: true }
											: {}),
									}
								: {
										name: displayName.trim() || matrix?.name,
										uniqueColumn: resolvedUnique,
									},
							phase: "processing",
						},
					],
					({ percent, phase }) => {
						setSaveProgress(percent);
						setSavePhase(phase);
					}
				);

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
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-wrap items-start gap-4">
						<div className="w-52 shrink-0">
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
									className="!w-52 box-border"
									onValidationChange={setNameValidation}
								/>
							) : (
								<>
									<label className="block text-sm font-semibold text-gray-700 mb-1">
										Matrix Name
									</label>
									<div className="w-52 box-border px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 truncate">
										{matrix?.name || "—"}
									</div>
								</>
							)}
						</div>

						{(isDraft || isRecreate || creatingNewAssetSource) &&
							columns.length > 0 && (
							<UniqueColumnSelector
								columns={columns}
								value={uniqueColumn || AUTO_ROW_ID_COLUMN}
								onChange={handleUniqueColumnChange}
								disabled={readOnly}
								isChecking={isCheckingUnique}
								analysis={uniqueAnalysis}
								className="!w-52 box-border shrink-0"
								aside={
									(matrix?.fileName ||
										matrix?.processedRows != null) && (
										<span className="text-sm text-gray-500 whitespace-nowrap">
											{matrix?.fileName && (
												<span className="mr-3">
													{matrix.fileName}
												</span>
											)}
											{matrix?.processedRows != null && (
												<span>
													{matrix.processedRows} rows
												</span>
											)}
										</span>
									)
								}
							/>
						)}

						{/* When unique selector is hidden, still show file meta */}
						{!(
							(isDraft || isRecreate || creatingNewAssetSource) &&
							columns.length > 0
						) &&
							(matrix?.fileName ||
								matrix?.processedRows != null) && (
								<div className="text-sm text-gray-500 pt-7 whitespace-nowrap">
									{matrix?.fileName && (
										<span className="mr-3">
											{matrix.fileName}
										</span>
									)}
									{matrix?.processedRows != null && (
										<span>
											{matrix.processedRows} rows
										</span>
									)}
								</div>
							)}
					</div>

					{!readOnly && (
						<div className="shrink-0 pt-6">
							<CopyMatrixSheetToolbar
								disabled={isSavingOp || loading || isAddingRow || isAddingColumn}
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
					highlightedRowId={highlightedRowId}
					highlightedColumn={highlightedColumn}
					duplicateHighlight={duplicateHighlight}
					hiddenColumns={
						hideRowIdColumn ? [AUTO_ROW_ID_COLUMN] : []
					}
					selectableRows={!readOnly}
					columnMenus={!readOnly}
					canRenameDeleteColumns={!isSynced}
					renamingColumn={renamingColumn}
					onColumnRenameSubmit={handleColumnRenameSubmit}
					onColumnRenameCancel={() => setRenamingColumn(null)}
					selectedRowIds={selectedRowIds}
					onSelectedRowIdsChange={setSelectedRowIds}
					onColumnAction={handleColumnAction}
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
				anchorRect={columnModal?.anchorRect}
				selectedCount={selectedRowIds.length}
				isLoading={isCopyingFromColumn}
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
				isLoading={isDeletingColumn}
			/>
		</div>
	);
};

export default CopyMatrixPreview;
