import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
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
	useLazyGetCopyMatrixRowsQuery,
	useDeleteCopyMatrixMutation,
	useAddCopyMatrixRowMutation,
	useDeleteCopyMatrixRowMutation,
	useAddCopyMatrixColumnMutation,
	useCloneCopyMatrixRowMutation,
	useCloneCopyMatrixColumnMutation,
	useCheckCopyMatrixUniqueColumnMutation,
	useUpdateCopyMatrixRowsMutation,
	useFillCopyMatrixColumnSequenceMutation,
	useCopyCopyMatrixColumnFromMutation,
	useGenerateCopyMatrixColumnTextMutation,
	useUploadCopyMatrixColumnImagesMutation,
	useSetCopyMatrixColumnCdnUrlMutation,
	useApplyCopyMatrixColumnImagesMutation,
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
import EditSheetRowModal from "../../components/modals/copyMatrix/EditSheetRowModal";
import CopyMatrixFromColumnModal from "../../components/modals/copyMatrix/CopyMatrixFromColumnModal";
import CopyMatrixGenerateTextModal from "../../components/modals/copyMatrix/CopyMatrixGenerateTextModal";
import CopyMatrixUpdateImagesModal from "../../components/modals/copyMatrix/CopyMatrixUpdateImagesModal";
import CopyMatrixSelectDateModal from "../../components/modals/copyMatrix/CopyMatrixSelectDateModal";
import ConfirmDialog from "../../components/modals/ConfirmDialog";
import CopyMatrixReplacePanel from "../../components/copyMatrix/preview/CopyMatrixReplacePanel";
import { useGetMeQuery } from "../../store/services/userAuthApi";
import { useGetMindshareFoldersQuery } from "../../store/services/accounts";
import api from "../../store/services/api";
import { showSuccess, showError, showWarning } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { runJsonStepsWithProgress } from "../../utils/uploadWithProgress";
import { AUTO_ROW_ID_COLUMN } from "../../utils/constants";
import { isCopyMatrixRecreateMode, isCopyMatrixSynced } from "../../utils/copyMatrixHelpers";
import { suggestCloneColumnName } from "../../utils/copyMatrixColumnHelpers";
import { normalizeCellText } from "../../utils/normalizeCellText";
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
	rowValues,
} from "../../utils/localSheetEdits";

const CopyMatrixPreview = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const skipEditDraft = Boolean(location.state?.skipEditDraft);
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
	const hasSavedChangesRef = useRef(false);
	const pendingEditsRef = useRef({});
	const [isSavingOp, setIsSavingOp] = useState(false);
	const [saveProgress, setSaveProgress] = useState(0);
	const [savePhase, setSavePhase] = useState("saving");
	const [nameValidation, setNameValidation] = useState({
		isDuplicate: false,
		isChecking: false,
	});
	const [sheetModal, setSheetModal] = useState(null);
	const [editingRow, setEditingRow] = useState(null);
	const [deletingRow, setDeletingRow] = useState(null);
	const [columnModal, setColumnModal] = useState(null);
	const [renamingColumn, setRenamingColumn] = useState(null);
	const [localUnsyncedColumns, setLocalUnsyncedColumns] = useState(
		() => new Set()
	);
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
	const uniqueCheckRequestRef = useRef(0);
	const tableRef = useRef(null);

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
			return { _id: rowId, rowData };
		});
	}, []);

	const invalidateAfterSave = (assetUploadId) => {
		dispatch(
			api.util.invalidateTags([
				{ type: "CopyMatrices", id: "LIST" },
				{ type: "CopyMatrices", id },
				{ type: "CopyMatrixRows", id },
				"AssetUploads",
				"CopyMatrices",
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
	const [fetchRowsPage] = useLazyGetCopyMatrixRowsQuery();
	const { data: allRowsData } = useGetCopyMatrixRowsQuery(
		{ id, page: 1, limit: 200 },
		{ skip: !id || sheetModal !== "cloneRow" }
	);

	const { data: meData } = useGetMeQuery();
	const accountId = String(
		matrix?.accountId?._id || matrix?.accountId || meData?.activeAccount?._id || ""
	);
	const {
		data: imageFoldersData,
		isFetching: isLoadingImageFolders,
	} = useGetMindshareFoldersQuery(accountId, {
		skip: !accountId,
		pollingInterval: 60 * 60 * 1000,
	});

	const [deleteCopyMatrix] = useDeleteCopyMatrixMutation();
	const [addCopyMatrixRow, { isLoading: isAddingRow }] =
		useAddCopyMatrixRowMutation();
	const [addCopyMatrixColumn, { isLoading: isAddingColumn }] =
		useAddCopyMatrixColumnMutation();
	const [cloneCopyMatrixRow, { isLoading: isCloningRow }] =
		useCloneCopyMatrixRowMutation();
	const [deleteCopyMatrixRow, { isLoading: isDeletingRow }] =
		useDeleteCopyMatrixRowMutation();
	const [cloneCopyMatrixColumn, { isLoading: isCloningColumn }] =
		useCloneCopyMatrixColumnMutation();
	const [updateCopyMatrixRows] = useUpdateCopyMatrixRowsMutation();
	const [checkUniqueColumn, { isLoading: isCheckingUnique }] =
		useCheckCopyMatrixUniqueColumnMutation();
	const [fillColumnSequence, { isLoading: isFillingSequence }] =
		useFillCopyMatrixColumnSequenceMutation();
	const [copyColumnFrom, { isLoading: isCopyingFromColumn }] =
		useCopyCopyMatrixColumnFromMutation();
	const [generateColumnText, { isLoading: isGeneratingText }] =
		useGenerateCopyMatrixColumnTextMutation();
	const [uploadColumnImages, { isLoading: isUploadingImages }] =
		useUploadCopyMatrixColumnImagesMutation();
	const [setColumnCdnUrl, { isLoading: isSettingCdnUrl }] =
		useSetCopyMatrixColumnCdnUrlMutation();
	const [applyColumnImages, { isLoading: isApplyingImages }] =
		useApplyCopyMatrixColumnImagesMutation();
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

	/**
	 * Column operations apply to the full sheet when no rows are selected.
	 * Load every server page, then overlay unsaved local edits before deriving
	 * patches so uniqueness validation sees exactly what the table shows.
	 */
	const getOperationRows = useCallback(async () => {
		const total = Number(pagination.total || rows.length);
		if (!id || total <= rows.length) return rows;

		const pageCount = Math.max(1, Math.ceil(total / 200));
		const pages = await Promise.all(
			Array.from({ length: pageCount }, (_, index) =>
				fetchRowsPage(
					{ id, page: index + 1, limit: 200 },
					false
				).unwrap()
			)
		);
		return pages
			.flatMap((result) => result?.rows || [])
			.map((row) => ({
				...row,
				...(pendingEditsRef.current[String(row._id)] || {}),
			}));
	}, [fetchRowsPage, id, pagination.total, rows]);

	const matrixReady =
		!isMatrixLoading && !isMatrixFetching && Boolean(matrix);
	const isDraft = matrix?.status === "draft";
	const isSynced = matrixReady && isCopyMatrixSynced(matrix);
	const syncedColumnNames = useMemo(
		() => new Set(matrix?.syncedColumns || []),
		[matrix?.syncedColumns]
	);
	const canModifyColumnStructure = useCallback(
		(column) =>
			localUnsyncedColumns.has(column) ||
			!isSynced ||
			!syncedColumnNames.has(column),
		[isSynced, syncedColumnNames, localUnsyncedColumns]
	);
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
	const primaryLabel = isSavingOp ? "Saving..." : "Save";

	useEffect(() => {
		if ((isDraft || canEditMatrixName) && matrix?.name && !name) {
			setName(matrix.name);
		}
		if (
			columns.length &&
			!uniqueColumn &&
			(isDraft ||
				isRecreate ||
				creatingNewAssetSource ||
				isUnsyncedFinalized ||
				isSynced)
		) {
			const preferred =
				matrix?.uniqueColumn ||
				matrix?.defaultUniqueColumn ||
				null;
			const initial =
				preferred && columns.includes(preferred)
					? preferred
					: columns.includes(AUTO_ROW_ID_COLUMN)
					? AUTO_ROW_ID_COLUMN
					: columns[0] || AUTO_ROW_ID_COLUMN;
			setUniqueColumn(initial);
		}
	}, [
		matrix?.name,
		matrix?.uniqueColumn,
		matrix?.defaultUniqueColumn,
		name,
		columns,
		uniqueColumn,
		isDraft,
		canEditMatrixName,
		isRecreate,
		creatingNewAssetSource,
		isUnsyncedFinalized,
		isSynced,
	]);

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

	// Resume locally saved cell edits (create draft or completed).
	useEffect(() => {
		if (!accountId || !id || skipEditDraft) return;
		const draft = readEditDraft("cm", accountId, { entityId: id });
		if (!draft || String(draft._id) !== String(id)) return;
		const pending = draft.pendingEdits || {};
		if (Object.keys(pending).length === 0) return;
		pendingEditsRef.current = pending;
		setPendingEdits(pending);
	}, [accountId, id, skipEditDraft]);

	// Keep a local draft snapshot as the user edits (until Save clears it).
	useEffect(() => {
		if (!accountId || !id || readOnly) return;
		const hasPending = Object.keys(pendingEdits).length > 0;
		if (!hasPending && !hasSavedChangesRef.current) return;
		const timer = window.setTimeout(() => {
			writeEditDraft("cm", accountId, {
				_id: id,
				name: displayName.trim() || matrix?.name || "Untitled",
				isCreateDraft: Boolean(isDraft),
				pendingEdits: pendingEditsRef.current || {},
			});
		}, 400);
		return () => window.clearTimeout(timer);
	}, [
		accountId,
		id,
		readOnly,
		pendingEdits,
		displayName,
		matrix?.name,
		isDraft,
	]);

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
	}, [id, updateCopyMatrixRows, collectEdits]);

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
		async (column) => {
			if (!id || !column) return null;
			const requestId = ++uniqueCheckRequestRef.current;
			if (column === AUTO_ROW_ID_COLUMN) {
				const analysis = {
					unique: true,
					column,
					duplicates: [],
					emptyRowIndexes: [],
					emptyRowIds: [],
					message: null,
				};
				if (requestId === uniqueCheckRequestRef.current) {
					applyUniqueAnalysis(analysis, column);
				}
				return analysis;
			}
			try {
				const analysis = await checkUniqueColumn({
					id,
					column,
					rows: collectEdits(),
				}).unwrap();
				if (requestId === uniqueCheckRequestRef.current) {
					applyUniqueAnalysis(analysis, column);
				}
				return analysis;
			} catch (error) {
				if (requestId === uniqueCheckRequestRef.current) {
					showError(
						getApiErrorMessage(error, "Failed to check unique column")
					);
				}
				return null;
			}
		},
		[id, checkUniqueColumn, applyUniqueAnalysis, collectEdits]
	);

	const handleUniqueColumnChange = async (column) => {
		if (readOnly || isSynced) return;
		setUniqueColumn(column);
		await runUniqueColumnCheck(column);
	};

	/**
	 * Before saving, require every selected unique-column value to be
	 * non-empty and distinct.
	 */
	const resolveUniqueColumnForSave = async () => {
		const requested = uniqueColumn || AUTO_ROW_ID_COLUMN;
		if (requested === AUTO_ROW_ID_COLUMN) {
			return AUTO_ROW_ID_COLUMN;
		}

		const analysis = await runUniqueColumnCheck(requested);

		if (analysis?.unique) {
			if (analysis.emptyWarning) {
				showWarning(analysis.emptyWarning);
			}
			return requested;
		}

		if (analysis && !analysis.unique) {
			const err = new Error(
				analysis.message ||
					`"${requested}" must contain non-empty, distinct values.`
			);
			err.code = "UNIQUE_COLUMN_INVALID";
			throw err;
		}

		// Check failed (null) — still send the user's choice; backend will validate
		if (!analysis) {
			return requested;
		}

		return requested;
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

	// Re-check the selected unique column against every local draft edit.
	useEffect(() => {
		if (!uniqueColumn || uniqueColumn === AUTO_ROW_ID_COLUMN) return;
		if (Object.keys(pendingEdits).length === 0) return;

		const timer = setTimeout(() => {
			runUniqueColumnCheck(uniqueColumn);
		}, 900);
		return () => clearTimeout(timer);
	}, [pendingEdits, uniqueColumn, runUniqueColumnCheck]);

	// When unique column is restored from the matrix (or first set), verify it.
	useEffect(() => {
		if (!id || !uniqueColumn) return;
		if (uniqueAnalysis?.column === uniqueColumn) return;
		runUniqueColumnCheck(uniqueColumn);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only when column identity changes
	}, [id, uniqueColumn]);

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
			hasSavedChangesRef.current = true;
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
			hasSavedChangesRef.current = true;
			showSuccess("Column added");
			closeSheetModal();
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to add column"));
		}
	};

	const handleCloneRow = async (sourceRowId) => {
		try {
			const result = await cloneCopyMatrixRow({
				id,
				sourceRowId,
			}).unwrap();
			const newRow = result?.data?.row || result?.row;
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
			await deleteCopyMatrixRow({
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
			const result = await cloneCopyMatrixRow({
				id,
				sourceRowId: row._id,
			}).unwrap();
			const newRow = result?.data?.row || result?.row;
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
			await cloneCopyMatrixColumn({
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
					tableRef.current?.flushActiveEdit?.();
					const selected = getSelectedRowIds().map(String);
					const operationRows = await getOperationRows();
					const patches = fillSequenceLocal(
						operationRows,
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
				if (!canModifyColumnStructure(columnName)) {
					showWarning(
						"This column cannot be renamed because it is synced with an asset source"
					);
					return;
				}
				setRenamingColumn(columnName);
				setHighlightedColumn(columnName);
				break;
			case "delete-column":
				if (!canModifyColumnStructure(columnName)) {
					showWarning(
						"This column cannot be deleted because it is synced with an asset source"
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
			const operationRows = await getOperationRows();
			const patches = copyFromColumnLocal(
				operationRows,
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
			const operationRows = await getOperationRows();
			const patches = generateTextLocal(
				operationRows,
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
				const operationRows = await getOperationRows();
				const targets = selectTargetRows(
					operationRows,
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
						rowData: rowValues(row),
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
			const operationRows = await getOperationRows();
			const targets = selectTargetRows(
				operationRows,
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
					rowData: rowValues(row),
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

			const operationRows = await getOperationRows();
			const patches = fillDateLocal(
				operationRows,
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
			const operationRows = await getOperationRows();
			const targets = selectTargetRows(
				operationRows,
				limitToSelected ? selected : undefined
			);

			const matchedRows = [];
			targets.forEach((row, offset) => {
				const current = cellText(rowValues(row)[column]);
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
			if (uniqueColumn === oldName) {
				setUniqueColumn(newName);
			}
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
			if (uniqueColumn === column) {
				setUniqueColumn(AUTO_ROW_ID_COLUMN);
				setUniqueAnalysis(null);
			}
			setHighlightedColumn(null);
			closeColumnModal();
			hasSavedChangesRef.current = true;
			showSuccess("Column deleted");
		} catch (error) {
			showError(getApiErrorMessage(error, "Failed to delete column"));
		}
	};

	const hideRowIdColumn =
		Boolean(uniqueColumn) && uniqueColumn !== AUTO_ROW_ID_COLUMN;

	const cloneRowOptions = allRowsData?.rows || rows;

	const handleBack = async () => {
		if (isSavingOp) return;
		try {
			const pendingMap = capturePendingEditsMap(pendingEditsRef, tableRef);
			const hasPendingEdits = Object.keys(pendingMap).length > 0;
			const nameChanged =
				Boolean(displayName.trim()) &&
				displayName.trim() !== String(matrix?.name || "").trim();
			const uniqueChanged =
				Boolean(uniqueColumn) &&
				uniqueColumn !== (matrix?.uniqueColumn || matrix?.defaultUniqueColumn);
			const hasChanges =
				hasPendingEdits ||
				hasSavedChangesRef.current ||
				nameChanged ||
				uniqueChanged;

			if (!hasChanges) {
				if (isDraft) {
					try {
						await deleteCopyMatrix(id).unwrap();
					} catch {
						// ignore delete failures on unused draft
					}
					const stored = accountId
						? readEditDraft("cm", accountId, { entityId: id })
						: null;
					if (stored && String(stored._id) === String(id)) {
						clearEditDraft("cm", accountId, { entityId: id });
					}
				}
				// Keep existing edit-draft so Edit can still ask Load / Discard.
				navigate("/copy-matrix");
				return;
			}

			// Always keep edits local until Save — never flush cells to the server on leave.
			if (accountId) {
				writeEditDraft("cm", accountId, {
					_id: id,
					name: displayName.trim() || matrix?.name || "Untitled",
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
		if (accountId) {
			clearEditDraft("cm", accountId, { entityId: id });
		}
		dispatch(
			api.util.invalidateTags([
				{ type: "CopyMatrices", id: "LIST" },
				{ type: "CopyMatrices", id },
				{ type: "CopyMatrixRows", id },
				"AssetUploads",
				"CopyMatrices",
			])
		);
		navigate("/copy-matrix", { replace: true });
	};

	const handlePrimaryAction = async () => {
		if (isSavingOp || readOnly) return;
		if (isDraft && !canFinishDraft) return;
		if (
			(isUnsyncedFinalized || isRecreate || creatingNewAssetSource) &&
			!canSaveUnsynced
		)
			return;

		setIsSavingOp(true);
		setSaveProgress(0);
		setSavePhase("saving");

		try {
			const validatedUniqueColumn =
				await resolveUniqueColumnForSave();

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
					showSuccess(
						hasSavedChangesRef.current
							? "Changes saved"
							: "No new changes to save"
					);
				}

				goToCopyMatrixList();
				return;
			}

			if (
				isUnsyncedFinalized ||
				isRecreate ||
				creatingNewAssetSource
			) {
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

				const resolvedUnique = validatedUniqueColumn;
				if (
					resolvedUnique &&
					resolvedUnique !== matrix?.uniqueColumn
				) {
					steps.push({
						path: `/copy-matrix/${id}`,
						method: "PUT",
						body: { uniqueColumn: resolvedUnique },
						phase: "saving",
					});
				}

				if (steps.length === 0) {
					showSuccess(
						hasSavedChangesRef.current
							? "Changes saved"
							: "No new changes to save"
					);
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
				const edits = collectEdits();
				const steps = [];
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
						uniqueColumn: validatedUniqueColumn,
						finalizeOnly: true,
					},
					phase: "processing",
				});

				const result = await runJsonStepsWithProgress(
					steps,
					({ percent, phase }) => {
						setSaveProgress(percent);
						setSavePhase(phase);
					}
				);

				setPendingEdits({});
				invalidateAfterSave(result?.data?.assetUploadId);
				showSuccess(result?.message || "Copy matrix saved");
				goToCopyMatrixList();
				return;
			}

		} catch (error) {
			if (
				error?.code === "UNIQUE_COLUMN_DUPLICATES" ||
				error?.code === "UNIQUE_COLUMN_INVALID"
			) {
				showError(error.message);
			} else {
				showError(getApiErrorMessage(error));
			}
		} finally {
			setIsSavingOp(false);
			setSaveProgress(0);
			setSavePhase("saving");
		}
	};

	const subtitle = readOnly
		? "View only"
		: "Edit the copy matrix, then Save to return to the list";

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
										((isUnsyncedFinalized ||
											isRecreate ||
											creatingNewAssetSource) &&
											!canSaveUnsynced)
									}
								/>
							</>
						)}
					</div>
				</div>
			</div>

			<div className="px-8 py-4 border-b bg-gray-50">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div
						className={`flex min-h-10 flex-1 flex-wrap gap-x-8 gap-y-3 ${
							isDraft ? "items-start" : "items-center"
						}`}
					>
						<div
							className={
								isDraft
									? "w-52 shrink-0"
									: "min-w-0 max-w-[42rem]"
							}
						>
							{isDraft ? (
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
								<div className="flex min-w-0 items-center whitespace-nowrap text-sm text-gray-700">
									<span className="shrink-0 font-semibold">
										Matrix Name:
									</span>{" "}
									<span
										className="ml-1 truncate"
										title={
											(matrix?.name || "").length > 64
												? matrix.name
												: undefined
										}
									>
										{(matrix?.name || "").length > 64
											? `${matrix.name.slice(0, 64)}…`
											: matrix?.name || "—"}
									</span>
								</div>
							)}
						</div>

						{isDraft && columns.length > 0 && (
							<UniqueColumnSelector
								columns={columns}
								value={uniqueColumn || AUTO_ROW_ID_COLUMN}
								onChange={handleUniqueColumnChange}
								disabled={readOnly || isSynced}
								isChecking={isCheckingUnique}
								analysis={uniqueAnalysis}
								className="!w-52 box-border shrink-0"
							/>
						)}

						{isDraft && matrix?.fileName && (
							<div className="w-52 shrink-0">
								<label className="mb-1 block text-sm font-semibold text-gray-700">
									Tab Name
								</label>
								<div
									className="flex h-[42px] w-52 items-center truncate whitespace-nowrap text-sm text-gray-700"
									title={matrix.fileName}
								>
									{matrix.fileName}
								</div>
							</div>
						)}

						{!isDraft &&
							(uniqueColumn || matrix?.uniqueColumn) && (
							<div className="text-sm text-gray-700">
								<span className="font-semibold">
									Unique Column:
								</span>{" "}
								<span>
									{uniqueColumn || matrix?.uniqueColumn}
								</span>
							</div>
						)}

						{isDraft && matrix?.processedRows != null && (
							<div className="w-28 shrink-0">
								<label className="mb-1 block text-sm font-semibold text-gray-700">
									Rows
								</label>
								<div className="flex h-[42px] items-center whitespace-nowrap text-sm text-gray-700">
									{matrix.processedRows} rows
								</div>
							</div>
						)}

						{!isDraft && matrix?.processedRows != null && (
							<div className="text-sm text-gray-700">
								<span className="font-semibold">Rows:</span>{" "}
								{matrix.processedRows} rows
							</div>
						)}

						{/* When unique selector is hidden, still show file meta */}
						{!isDraft &&
							!(
								!isDraft &&
								(uniqueColumn || matrix?.uniqueColumn)
							) &&
							matrix?.fileName && (
								<div className="text-sm text-gray-500 whitespace-nowrap">
									{matrix.fileName}
								</div>
							)}
					</div>

					{!readOnly && (
						<div className="flex shrink-0 self-center">
							<CopyMatrixSheetToolbar
								disabled={
									isSavingOp ||
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
					highlightedRowId={highlightedRowId}
					highlightedColumn={highlightedColumn}
					duplicateHighlight={duplicateHighlight}
					hiddenColumns={
						hideRowIdColumn ? [AUTO_ROW_ID_COLUMN] : []
					}
					selectableRows={!readOnly}
					columnMenus={!readOnly}
					canRenameDeleteColumns={canModifyColumnStructure}
					renamingColumn={renamingColumn}
					onColumnRenameSubmit={handleColumnRenameSubmit}
					onColumnRenameCancel={() => setRenamingColumn(null)}
					selectedRowIds={selectedRowIds}
					onSelectedRowIdsChange={setSelectedRowIds}
					onColumnAction={handleColumnAction}
					onRowEdit={handleEditRow}
					onRowCopy={handleCopyRow}
					onRowDelete={handleDeleteRow}
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
				isLoading={isDeletingColumn}
			/>
		</div>
	);
};

export default CopyMatrixPreview;
