import React, {
	useState,
	useRef,
	forwardRef,
	useImperativeHandle,
} from "react";
import RowPerPage from "./RowPerPage";
import Pagination from "./Pagination";
import { AUTO_ROW_ID_COLUMN } from "../../utils/constants";
import { cellEditInputClass } from "../../utils/formStyles";

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
		},
		ref
	) => {
		const [editingCell, setEditingCell] = useState(null);
		const [editValue, setEditValue] = useState("");
		const [scrolled, setScrolled] = useState(false);
		const scrollRef = useRef(null);
		const rowsRef = useRef(rows);
		rowsRef.current = rows;

		const buildRowData = (row, col, value) => {
			const rowData = {};
			columns.forEach((c) => {
				rowData[c] = c === col ? value : (row[c] ?? "");
			});
			return rowData;
		};

		const commitEdit = (row, col, value = editValue) => {
			if (!editingCell) return null;
			const current = row[col] ?? "";
			if (value !== current) {
				const rowData = buildRowData(row, col, value);
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
			}),
			[editingCell, editValue]
		);

		const startEdit = (rowId, col, value) => {
			if (readOnly || readOnlyColumns.includes(col)) return;
			setEditingCell(`${rowId}-${col}`);
			setEditValue(value ?? "");
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

		const hasRowIdColumn = columns.includes(AUTO_ROW_ID_COLUMN);
		const showRowNumberColumn = !hasRowIdColumn;
		const stickyRowRefClass =
			"sticky left-0 z-30 bg-gray-50 border-r border-gray-200";
		const stickyRowRefCellClass =
			"sticky left-0 z-10 bg-white border-r border-gray-100";

		return (
			<>
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className="overflow-auto border border-gray-200 rounded-lg max-h-[calc(100vh-320px)]"
				>
					<table className="w-full text-sm text-left text-[#64748B] border-collapse">
						<thead
							className={`bg-gray-50 border-b border-gray-200 ${
								scrolled ? "shadow-sm" : ""
							}`}
						>
							<tr>
								{showRowNumberColumn && (
									<th
										className={`px-4 py-3 font-medium text-xs sticky top-0 ${stickyRowRefClass} border-b`}
									>
										#
									</th>
								)}
								{columns.map((col) => (
									<th
										key={col}
										className={`px-4 py-3 font-medium text-xs whitespace-nowrap sticky top-0 z-20 bg-gray-50 border-b border-gray-200 ${
											hasRowIdColumn &&
											col === AUTO_ROW_ID_COLUMN
												? stickyRowRefClass
												: ""
										}`}
									>
										{col}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{rows.map((row) => (
								<tr key={row._id} className="hover:bg-gray-50">
									{showRowNumberColumn && (
										<td
											className={`px-4 py-3 text-gray-400 ${stickyRowRefCellClass}`}
										>
											{row.rowIndex}
										</td>
									)}
									{columns.map((col) => {
										const cellKey = `${row._id}-${col}`;
										const isEditing = editingCell === cellKey;
										const isCellReadOnly =
											readOnly ||
											readOnlyColumns.includes(col);
										return (
											<td
												key={col}
												className={`px-2 py-1 max-w-[200px] ${
													hasRowIdColumn &&
													col === AUTO_ROW_ID_COLUMN
														? stickyRowRefCellClass
														: ""
												}`}
												onClick={() =>
													!isEditing &&
													!isCellReadOnly &&
													startEdit(
														row._id,
														col,
														row[col]
													)
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
														className={cellEditInputClass}
													/>
												) : (
													<span
														className={`block px-2 py-2 truncate rounded text-gray-900 ${
															isCellReadOnly
																? "bg-gray-50 text-gray-600"
																: "cursor-text hover:bg-purple-50"
														}`}
														title={row[col] || ""}
													>
														{row[col] || "—"}
													</span>
												)}
											</td>
										);
									})}
								</tr>
							))}
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
