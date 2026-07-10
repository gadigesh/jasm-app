import React, {
	useState,
	useRef,
	forwardRef,
	useImperativeHandle,
	useEffect,
	useMemo,
} from "react";
import RowPerPage from "./RowPerPage";
import Pagination from "./Pagination";
import { AUTO_ROW_ID_COLUMN } from "../../utils/constants";
import { cellEditInputClass } from "../../utils/formStyles";
import CopyMatrixColumnHeader from "../copyMatrix/preview/CopyMatrixColumnHeader";
import CopyMatrixRowCheckbox from "../copyMatrix/preview/CopyMatrixRowCheckbox";
import { normalizeCellText } from "../../utils/normalizeCellText";

const EditableSheetTable = forwardRef(
	(
		{
			columns = [],
			rows = [],
			loading = false,
			page,
			rowsPerPage,
			pagination,
			onPageChange,
			onRowsPerPageChange,
			onCellChange,
			readOnly = false,
			readOnlyColumns = [],
			highlightedRowId = null,
			highlightedColumn = null,
			duplicateHighlight = null,
			hiddenColumns = [],
			selectedRowIds,
			onSelectedRowIdsChange,
			onColumnAction,
			selectableRows = false,
			columnMenus = false,
			canRenameDeleteColumns = true,
			renamingColumn = null,
			onColumnRenameSubmit,
			onColumnRenameCancel,
		},
		ref
	) => {
		const [editingCell, setEditingCell] = useState(null);
		const [editValue, setEditValue] = useState("");
		const [scrolled, setScrolled] = useState(false);
		const [columnWidths, setColumnWidths] = useState({});
		const [internalSelectedIds, setInternalSelectedIds] = useState(
			() => new Set()
		);
		const scrollRef = useRef(null);
		const highlightedRowRef = useRef(null);
		const highlightedColumnRef = useRef(null);
		const duplicateCellRef = useRef(null);
		const resizingRef = useRef(null);
		const rowsRef = useRef(rows);
		rowsRef.current = rows;

		const DEFAULT_COL_WIDTH = 160;
		const MIN_COL_WIDTH = 80;
		const MAX_COL_WIDTH = 720;

		const getColWidth = (col) =>
			columnWidths[col] ?? DEFAULT_COL_WIDTH;

		const startColumnResize = (e, col) => {
			e.preventDefault();
			e.stopPropagation();
			resizingRef.current = {
				col,
				startX: e.clientX,
				startWidth: getColWidth(col),
			};
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		};

		const autoFitColumn = (col) => {
			const headerLen = String(col || "").length;
			let maxLen = headerLen;
			for (const row of rowsRef.current || []) {
				const text = normalizeCellText(row?.[col]);
				if (text.length > maxLen) maxLen = text.length;
			}
			// ~8px per character + padding; clamp to min/max
			const fitted = Math.min(
				MAX_COL_WIDTH,
				Math.max(MIN_COL_WIDTH, Math.ceil(maxLen * 8 + 40))
			);
			setColumnWidths((prev) => ({ ...prev, [col]: fitted }));
		};

		useEffect(() => {
			const onMove = (e) => {
				const active = resizingRef.current;
				if (!active) return;
				const next = Math.min(
					MAX_COL_WIDTH,
					Math.max(
						MIN_COL_WIDTH,
						active.startWidth + (e.clientX - active.startX)
					)
				);
				setColumnWidths((prev) => ({
					...prev,
					[active.col]: next,
				}));
			};
			const onUp = () => {
				if (!resizingRef.current) return;
				resizingRef.current = null;
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};
			window.addEventListener("mousemove", onMove);
			window.addEventListener("mouseup", onUp);
			return () => {
				window.removeEventListener("mousemove", onMove);
				window.removeEventListener("mouseup", onUp);
			};
		}, []);

		const visibleColumns = useMemo(
			() =>
				columns.filter(
					(col) => !(hiddenColumns || []).includes(col)
				),
			[columns, hiddenColumns]
		);

		const duplicateRowIds = useMemo(() => {
			if (!duplicateHighlight?.rowIds?.length) return new Set();
			return new Set(
				duplicateHighlight.rowIds.map((id) => String(id))
			);
		}, [duplicateHighlight]);

		const duplicateColumn = duplicateHighlight?.column || null;

		const isSelectionControlled = selectedRowIds != null;
		const selectedIds = useMemo(() => {
			if (isSelectionControlled) {
				return new Set(
					(selectedRowIds || []).map((id) => String(id))
				);
			}
			return internalSelectedIds;
		}, [isSelectionControlled, selectedRowIds, internalSelectedIds]);

		const setSelectedIds = (nextSet) => {
			if (isSelectionControlled) {
				onSelectedRowIdsChange?.(Array.from(nextSet));
			} else {
				setInternalSelectedIds(nextSet);
				onSelectedRowIdsChange?.(Array.from(nextSet));
			}
		};

		useEffect(() => {
			if (!highlightedRowId || !highlightedRowRef.current) return;
			highlightedRowRef.current.scrollIntoView({
				block: "center",
				behavior: "smooth",
			});
		}, [highlightedRowId, rows, page]);

		useEffect(() => {
			if (!highlightedColumn || !highlightedColumnRef.current) return;
			highlightedColumnRef.current.scrollIntoView({
				block: "nearest",
				inline: "nearest",
				behavior: "smooth",
			});
		}, [highlightedColumn, columns, rows]);

		useEffect(() => {
			// Prefer row highlight scroll; only use duplicate-cell scroll as fallback
			if (highlightedRowId) return;
			if (!duplicateHighlight?.rowIds?.length || !duplicateCellRef.current)
				return;
			duplicateCellRef.current.scrollIntoView({
				block: "center",
				inline: "nearest",
				behavior: "smooth",
			});
		}, [duplicateHighlight, rows, highlightedRowId]);

		const buildRowData = (row, col, value) => {
			const rowData = {};
			visibleColumns.forEach((c) => {
				rowData[c] = c === col ? value : (row[c] ?? "");
			});
			// Keep hidden column values (e.g. Row ID) when editing
			columns.forEach((c) => {
				if (rowData[c] === undefined) {
					rowData[c] = row[c] ?? "";
				}
			});
			return rowData;
		};

		const commitEdit = (row, col, value = editValue) => {
			if (!editingCell) return null;
			const next = normalizeCellText(value);
			const current = String(row[col] ?? "");
			if (next !== current) {
				const rowData = buildRowData(row, col, next);
				onCellChange?.(row._id, rowData);
				setEditingCell(null);
				setEditValue("");
				return { rowId: row._id, rowData };
			}
			setEditingCell(null);
			setEditValue("");
			return null;
		};

		useImperativeHandle(
			ref,
			() => ({
				flushActiveEdit: () => {
					if (!editingCell) return null;
					const row = rowsRef.current.find((r) =>
						editingCell.startsWith(`${r._id}-`)
					);
					if (!row) {
						setEditingCell(null);
						setEditValue("");
						return null;
					}
					const col = editingCell.substring(row._id.length + 1);
					return commitEdit(row, col, editValue);
				},
				getSelectedRowIds: () => Array.from(selectedIds),
				clearSelection: () => setSelectedIds(new Set()),
			}),
			[editingCell, editValue, selectedIds]
		);

		const startEdit = (rowId, col, value) => {
			if (readOnly || readOnlyColumns.includes(col)) return;
			// Always edit the same normalized text the user sees in the cell
			const text = normalizeCellText(value);
			setEditingCell(`${rowId}-${col}`);
			setEditValue(text);
		};

		const handleKeyDown = (e, row, col) => {
			if (e.key === "Enter") commitEdit(row, col);
			if (e.key === "Escape") {
				setEditingCell(null);
				setEditValue("");
			}
		};

		const handleScroll = (e) => {
			setScrolled(e.target.scrollTop > 0);
		};

		const pageRowIds = rows.map((row) => String(row._id));
		const selectedOnPage = pageRowIds.filter((id) =>
			selectedIds.has(id)
		);
		const allPageSelected =
			pageRowIds.length > 0 &&
			selectedOnPage.length === pageRowIds.length;
		const somePageSelected =
			selectedOnPage.length > 0 && !allPageSelected;

		const toggleRow = (rowId, checked) => {
			const next = new Set(selectedIds);
			const key = String(rowId);
			if (checked) next.add(key);
			else next.delete(key);
			setSelectedIds(next);
		};

		const toggleAllOnPage = (checked) => {
			const next = new Set(selectedIds);
			for (const id of pageRowIds) {
				if (checked) next.add(id);
				else next.delete(id);
			}
			setSelectedIds(next);
		};

		if (loading) {
			return (
				<div className="py-12 text-center text-gray-500">
					Loading data...
				</div>
			);
		}

		if (columns.length === 0) {
			return (
				<div className="py-12 text-center text-gray-500">
					No data available
				</div>
			);
		}

		// `#` is only a fallback when the sheet never had Row ID.
		// Hiding Row ID (e.g. another unique column) must not bring `#` back.
		const matrixHasRowIdColumn = (columns || []).includes(AUTO_ROW_ID_COLUMN);
		const showRowIdColumn = visibleColumns.includes(AUTO_ROW_ID_COLUMN);
		const showRowNumberColumn = !matrixHasRowIdColumn;
		const showCheckboxes = selectableRows && !readOnly;
		const showColumnMenus = columnMenus && !readOnly;
		const stickySecondLeft = showCheckboxes ? "left-[40px]" : "left-0";
		const stickyCheckboxClass =
			"sticky left-0 z-40 bg-gray-50 shadow-[1px_0_0_0_#e5e7eb]";
		const stickyRowRefClass = `sticky ${stickySecondLeft} z-30 bg-gray-50 shadow-[1px_0_0_0_#e5e7eb]`;
		const stickyCheckboxCellClass =
			"sticky left-0 z-20 bg-white shadow-[1px_0_0_0_#f3f4f6]";
		const stickyRowRefCellClass = `sticky ${stickySecondLeft} z-10 bg-white shadow-[1px_0_0_0_#f3f4f6]`;
		const stickyRowRefCellHighlightClass = `sticky ${stickySecondLeft} z-10 bg-yellow-50 shadow-[1px_0_0_0_#fef9c3]`;
		const stickyCheckboxHighlightClass =
			"sticky left-0 z-20 bg-yellow-50 shadow-[1px_0_0_0_#fef9c3]";

		return (
			<>
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className="overflow-auto border border-gray-200 rounded-lg max-h-[calc(100vh-320px)]"
				>
					<table className="w-max min-w-full text-sm text-left text-[#64748B] border-collapse table-fixed">
						<thead
							className={`bg-gray-50 border-b border-gray-200 ${
								scrolled ? "shadow-sm" : ""
							}`}
						>
							<tr>
								{showCheckboxes && (
									<th
										className={`w-10 min-w-[40px] max-w-[40px] px-0 py-3 sticky top-0 ${stickyCheckboxClass} border-b border-gray-200`}
									>
										<div className="flex items-center justify-center">
											<CopyMatrixRowCheckbox
												checked={allPageSelected}
												indeterminate={somePageSelected}
												onChange={toggleAllOnPage}
												ariaLabel="Select all rows on this page"
											/>
										</div>
									</th>
								)}
								{showRowNumberColumn && (
									<th
										className={`w-12 min-w-[48px] px-4 py-3 font-medium text-xs sticky top-0 ${stickyRowRefClass} border-b`}
									>
										#
									</th>
								)}
								{visibleColumns.map((col) => {
									const isColHighlighted =
										highlightedColumn &&
										col === highlightedColumn;
									const isSticky =
										showRowIdColumn &&
										col === AUTO_ROW_ID_COLUMN;
									const colWidth = getColWidth(col);

									if (showColumnMenus) {
										return (
											<CopyMatrixColumnHeader
												key={col}
												ref={
													isColHighlighted ||
													renamingColumn === col
														? highlightedColumnRef
														: null
												}
												columnName={col}
												isHighlighted={isColHighlighted}
												isSticky={isSticky}
												stickyClassName={stickyRowRefClass}
												readOnly={readOnly}
												onAction={onColumnAction}
												canRenameDelete={
													canRenameDeleteColumns
												}
												isRenaming={renamingColumn === col}
												existingColumns={columns}
												onRenameSubmit={(newName) =>
													onColumnRenameSubmit?.(
														col,
														newName
													)
												}
												onRenameCancel={onColumnRenameCancel}
												width={colWidth}
												onResizeStart={(e) =>
													startColumnResize(e, col)
												}
												onResizeAutoFit={() =>
													autoFitColumn(col)
												}
											/>
										);
									}

									return (
										<th
											key={col}
											ref={
												isColHighlighted
													? highlightedColumnRef
													: null
											}
											style={{
												width: colWidth,
												minWidth: colWidth,
												maxWidth: colWidth,
											}}
											className={`relative px-4 py-3 font-medium text-xs whitespace-nowrap sticky top-0 z-20 border-b border-gray-200 ${
												isColHighlighted
													? "bg-yellow-100"
													: "bg-gray-50"
											} ${isSticky ? stickyRowRefClass : ""}`}
										>
											<span className="pr-2">{col}</span>
											<span
												role="separator"
												aria-orientation="vertical"
												aria-label={`Resize ${col} column`}
												title="Drag to resize · Double-click to fit content"
												onMouseDown={(e) =>
													startColumnResize(e, col)
												}
												onDoubleClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													autoFitColumn(col);
												}}
												className="absolute right-0 top-0 z-30 flex h-full w-2 cursor-col-resize items-center justify-center"
											>
												<span className="h-full w-px bg-gray-300" />
											</span>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{rows.map((row) => {
								const rowId = String(row._id);
								const isHighlighted =
									highlightedRowId &&
									rowId === String(highlightedRowId);
								const isSelected = selectedIds.has(rowId);
								const rowStickyClass = isHighlighted
									? stickyRowRefCellHighlightClass
									: stickyRowRefCellClass;
								const checkboxStickyClass = isHighlighted
									? stickyCheckboxHighlightClass
									: stickyCheckboxCellClass;

								return (
									<tr
										key={row._id}
										ref={
											isHighlighted
												? highlightedRowRef
												: null
										}
										className={
											isHighlighted
												? "bg-yellow-50"
												: isSelected
												? "bg-purple-50/40"
												: "hover:bg-gray-50"
										}
									>
										{showCheckboxes && (
											<td
												className={`w-10 min-w-[40px] max-w-[40px] px-0 py-3 ${checkboxStickyClass}`}
											>
												<div className="flex items-center justify-center">
													<CopyMatrixRowCheckbox
														checked={isSelected}
														onChange={(checked) =>
															toggleRow(
																row._id,
																checked
															)
														}
														ariaLabel={`Select row ${row.rowIndex}`}
													/>
												</div>
											</td>
										)}
										{showRowNumberColumn && (
											<td
												className={`px-4 py-3 text-gray-400 ${rowStickyClass}`}
											>
												{row.rowIndex}
											</td>
										)}
										{visibleColumns.map((col) => {
											const cellKey = `${row._id}-${col}`;
											const isEditing =
												editingCell === cellKey;
											const isCellReadOnly =
												readOnly ||
												readOnlyColumns.includes(col);
											const isStickyCol =
												showRowIdColumn &&
												col === AUTO_ROW_ID_COLUMN;
											const isColHighlighted =
												highlightedColumn &&
												col === highlightedColumn;
											const isDuplicateCell =
												duplicateColumn === col &&
												duplicateRowIds.has(rowId);
											const cellHighlightClass =
												isDuplicateCell
													? "bg-orange-100 ring-1 ring-inset ring-orange-300"
													: isColHighlighted
													? "bg-yellow-50"
													: isStickyCol
													? rowStickyClass
													: "";
											const attachDupRef =
												isDuplicateCell &&
												String(
													duplicateHighlight?.rowIds?.[0]
												) === rowId;
											const colWidth = getColWidth(col);
											const cellText = normalizeCellText(
												row[col]
											);
											return (
												<td
													key={col}
													ref={
														attachDupRef
															? duplicateCellRef
															: null
													}
													style={{
														width: colWidth,
														minWidth: colWidth,
														maxWidth: colWidth,
													}}
													className={`px-2 py-1 ${cellHighlightClass}`}
													onDoubleClick={() =>
														!isEditing &&
														!isCellReadOnly &&
														startEdit(
															row._id,
															col,
															row[col]
														)
													}
													title={
														isCellReadOnly
															? cellText
															: cellText
															? `${cellText} (double-click to edit)`
															: "Double-click to edit"
													}
												>
													{isEditing ? (
														<input
															autoFocus
															value={editValue}
															onChange={(e) =>
																setEditValue(
																	e.target.value
																)
															}
															onBlur={() =>
																commitEdit(row, col)
															}
															onKeyDown={(e) =>
																handleKeyDown(
																	e,
																	row,
																	col
																)
															}
															className={`${cellEditInputClass} whitespace-pre`}
														/>
													) : (
														<span
															className={`block max-w-full overflow-hidden text-ellipsis whitespace-pre px-2 py-2 rounded text-gray-900 ${
																isCellReadOnly
																	? "bg-gray-50 text-gray-600"
																	: isDuplicateCell
																	? "bg-orange-100"
																	: isColHighlighted
																	? "bg-yellow-50"
																	: "hover:bg-purple-50"
															}`}
														>
															{cellText}
														</span>
													)}
												</td>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{pagination && (
					<div className="flex items-center justify-between mt-4">
						<RowPerPage
							value={rowsPerPage}
							onChange={onRowsPerPageChange}
						/>
						<Pagination
							currentPage={page}
							totalPages={pagination.totalPages}
							onPageChange={onPageChange}
						/>
					</div>
				)}
			</>
		);
	}
);

EditableSheetTable.displayName = "EditableSheetTable";

export default EditableSheetTable;
