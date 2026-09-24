import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { showError, showSuccess } from "../../../utils/toastMsg";

const changedValueClass = "font-medium text-[#C026D3]";
const plainValueClass = "text-gray-500";

function fieldText(value) {
	return String(value ?? "");
}

function rowMatches(row, query) {
	if (!query) return true;
	return row.fields.some((field) =>
		[field.column, field.value, field.previousValue].some((value) =>
			fieldText(value).toLowerCase().includes(query)
		)
	);
}

function changedFields(row) {
	const seen = new Set();
	return (row?.fields || []).filter((field) => {
		const column = String(field?.column || "").trim();
		if (!column || column === "Row ID") return false;
		const key = column.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function rowsFromReview(review) {
	if (Array.isArray(review?.unsyncedRows) && review.unsyncedRows.length) {
		return review.unsyncedRows
			.map((row) => ({ ...row, fields: changedFields(row) }))
			.filter(
				(row) =>
					row.fields.length &&
					(row.status === "Added" ||
						row.status === "Modified" ||
						row.status === "Removed")
			);
	}
	const grouped = new Map();
	for (const change of review?.changes || []) {
		const rowIndex = Number(change.rowIndex);
		if (!Number.isFinite(rowIndex)) continue;
		if (!grouped.has(rowIndex)) {
			grouped.set(rowIndex, {
				rowIndex,
				rowId: change.rowId || null,
				status: change.status || "Modified",
				fields: [],
			});
		}
		const entry = grouped.get(rowIndex);
		if (change.column && change.column !== "Entire row") {
			entry.fields.push({
				column: change.column,
				value: change.updatedValue ?? "",
				previousValue: change.previousValue ?? "",
				changed: true,
				status: change.status,
			});
		}
	}
	return [...grouped.values()].sort(
		(left, right) => left.rowIndex - right.rowIndex
	);
}

function stageApproval(review, rows, rowIndexes) {
	const wanted = new Set(rowIndexes);
	const pendingEdits = {};
	const appendedRows = [];
	const removedRowIds = [];
	const cells = [];
	const highlightRowIndexes = [];
	let nextIndex =
		Number(review?.maxRowIndex) || Number(review?.currentRowCount) || 0;

	for (const row of rows) {
		if (!wanted.has(row.rowIndex)) continue;
		if (row.status === "Removed") {
			if (row.rowId) removedRowIds.push(String(row.rowId));
			continue;
		}
		if (row.status === "Added") {
			nextIndex += 1;
			const rowData = {};
			const filled = [];
			for (const field of row.fields || []) {
				const column = String(field?.column || "").trim();
				if (!column || column === "Row ID") continue;
				rowData[column] = field.value ?? "";
				if (String(field.value ?? "").trim()) filled.push(column);
			}
			appendedRows.push({
				id: `refresh-new-${appendedRows.length}`,
				rowIndex: nextIndex,
				rowData,
			});
			highlightRowIndexes.push(nextIndex);
			const highlightColumns = filled.length
				? filled
				: Object.keys(rowData);
			for (const column of highlightColumns) {
				cells.push({ rowIndex: nextIndex, column });
			}
			continue;
		}
		if (!row.rowId) continue;
		const patch = {};
		for (const field of row.fields || []) {
			if (!field.changed) continue;
			const column = String(field?.column || "").trim();
			if (!column || column === "Row ID") continue;
			patch[column] = field.value ?? "";
			cells.push({ rowIndex: row.rowIndex, column });
		}
		if (!Object.keys(patch).length) continue;
		pendingEdits[String(row.rowId)] = patch;
		highlightRowIndexes.push(row.rowIndex);
	}

	return {
		pendingEdits,
		appendedRows,
		removedRowIds,
		columns: Array.isArray(review?.columns) ? review.columns : [],
		approvedHighlights: {
			cells,
			rowIndexes: highlightRowIndexes,
		},
	};
}

const CopyMatrixRefreshModal = ({
	isOpen,
	matrixId,
	openToken,
	review: initialReview,
	columnMessage = "",
	onClose,
	onApproved,
	onRejected,
}) => {
	const [review, setReview] = useState(initialReview || {});
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(5);
	const [fieldPages, setFieldPages] = useState({});
	const [selected, setSelected] = useState(() => new Set());
	const [busyKey, setBusyKey] = useState("");
	const openedKey = useRef("");

	useEffect(() => {
		if (!isOpen) {
			openedKey.current = "";
			return;
		}
		const key = `${matrixId || ""}:${openToken || ""}`;
		if (openedKey.current === key) return;
		openedKey.current = key;
		setReview(initialReview || {});
		setSearch("");
		setPage(1);
		setRowsPerPage(5);
		setFieldPages({});
		setSelected(new Set());
		setBusyKey("");
	}, [isOpen, matrixId, openToken, initialReview]);

	const rows = useMemo(() => rowsFromReview(review), [review]);
	const query = search.trim().toLowerCase();
	const visibleRows = useMemo(
		() => rows.filter((row) => rowMatches(row, query)),
		[rows, query]
	);
	const totalPages = Math.max(1, Math.ceil(visibleRows.length / rowsPerPage));
	const safePage = Math.min(page, totalPages);
	const pageRows = visibleRows.slice(
		(safePage - 1) * rowsPerPage,
		safePage * rowsPerPage
	);
	const name = review.name || "Copy Matrix";
	const structureOnly = Boolean(columnMessage) && rows.length === 0;
	const variationIndexes = visibleRows.map((row) => row.rowIndex);
	const allSelected =
		variationIndexes.length > 0 &&
		variationIndexes.every((rowIndex) => selected.has(rowIndex));
	const someSelected = variationIndexes.some((rowIndex) =>
		selected.has(rowIndex)
	);

	if (!isOpen) return null;

	const toggleRow = (rowIndex) => {
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(rowIndex)) next.delete(rowIndex);
			else next.add(rowIndex);
			return next;
		});
	};

	const toggleAll = () => {
		setSelected(allSelected ? new Set() : new Set(variationIndexes));
	};

	const handleDecision = (action, rowIndexes) => {
		if (!rowIndexes.length || busyKey || !matrixId) return;
		if (action === "reject") {
			showSuccess("Unsynced rows rejected");
			onRejected?.();
			return;
		}
		const stage = stageApproval(review, rows, rowIndexes);
		const hasWork =
			Object.keys(stage.pendingEdits).length > 0 ||
			stage.appendedRows.length > 0 ||
			stage.removedRowIds.length > 0;
		if (!hasWork) {
			showError("Nothing to approve in the selected rows");
			return;
		}
		showSuccess("Review the changes, then save the copy matrix");
		onApproved?.(stage);
	};

	return (
		<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
			<div
				role="dialog"
				aria-modal="true"
				aria-label={`Unsynced rows for ${name}`}
				className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
			>
				<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
					<h3 className="text-base font-semibold text-gray-900">
						Unsynced rows
					</h3>
					<button
						type="button"
						onClick={onClose}
						disabled={Boolean(busyKey)}
						aria-label="Close"
						className="rounded-full p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
					>
						<X size={18} />
					</button>
				</div>

				<div className="overflow-auto px-5 py-4">
					{columnMessage ? (
						<p className="text-sm font-medium text-red-600">
							{columnMessage}
						</p>
					) : null}
					{structureOnly ? null : (
					<>
					<div className="mb-3 mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
						<label className="flex items-center gap-2">
							<span>Display</span>
							<select
								value={rowsPerPage}
								onChange={(event) => {
									setRowsPerPage(Number(event.target.value));
									setPage(1);
								}}
								className="h-8 border border-gray-300 bg-white px-2 text-sm text-gray-700"
							>
								{[5, 10, 20].map((count) => (
									<option key={count} value={count}>
										{count}
									</option>
								))}
							</select>
						</label>
						<span className="font-medium text-gray-700">
							Copy Matrix Rows
						</span>
						<label className="ml-auto flex min-w-[240px] flex-1 items-center gap-2">
							<span className="shrink-0">
								Search Copy Matrix{" "}
								<span className="font-semibold text-gray-900">
									{name}
								</span>
								{" :"}
							</span>
							<input
								type="search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								className="h-8 min-w-0 flex-1 border border-gray-300 px-2 text-sm text-gray-700 outline-none focus:border-[#C026D3]"
							/>
						</label>
						<button
							type="button"
							disabled={!someSelected || Boolean(busyKey)}
							onClick={() =>
								handleDecision("approve", [...selected])
							}
							className="rounded border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
						>
							{busyKey === "approve-selected"
								? "Approving..."
								: allSelected
									? "Approve all"
									: "Approve selected"}
						</button>
						<button
							type="button"
							disabled={!someSelected || Boolean(busyKey)}
							onClick={() =>
								handleDecision("reject", [...selected])
							}
							className="rounded border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
						>
							{busyKey === "reject-selected"
								? "Rejecting..."
								: allSelected
									? "Reject all"
									: "Reject selected"}
						</button>
					</div>

					<div className="overflow-hidden border border-gray-300">
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr className="border-b border-gray-300">
									<th className="w-12 border-r border-gray-300 px-3 py-3 text-center">
										<input
											type="checkbox"
											checked={allSelected}
											onChange={toggleAll}
											aria-label="Select all variations"
											className="h-4 w-4 accent-[#C026D3]"
										/>
									</th>
									<th className="w-28 border-r border-gray-300 px-3 py-3 text-center text-sm font-semibold text-[#C026D3]">
										Variation
									</th>
									<th className="border-r border-gray-300 px-4 py-3 text-center text-sm font-semibold text-[#C026D3]">
										Asset Data
									</th>
									<th className="w-36 px-3 py-3 text-center text-sm font-semibold text-[#C026D3]">
										Options
									</th>
								</tr>
							</thead>
							<tbody>
								{pageRows.length ? (
									pageRows.map((row) => {
										const fields = row.fields || [];
										const fieldPageCount = Math.max(
											1,
											Math.ceil(fields.length / 5)
										);
										const fieldPage = Math.min(
											fieldPages[row.rowIndex] || 1,
											fieldPageCount
										);
										const visibleFields = fields.slice(
											(fieldPage - 1) * 5,
											fieldPage * 5
										);
										return (
											<tr
												key={row.rowIndex}
												className="border-b border-gray-300 last:border-b-0"
											>
												<td className="border-r border-gray-300 px-3 text-center align-middle">
													<input
														type="checkbox"
														checked={selected.has(
															row.rowIndex
														)}
														onChange={() =>
															toggleRow(row.rowIndex)
														}
														aria-label={`Select variation ${row.rowIndex}`}
														className="h-4 w-4 accent-[#C026D3]"
													/>
												</td>
												<td className="border-r border-gray-300 px-3 text-center align-middle text-gray-600">
													<div>{row.rowIndex}</div>
													<div className="mt-1 text-xs text-gray-400">
														{row.status || "Modified"}
													</div>
												</td>
												<td className="border-r border-gray-300 p-0 align-top">
													<table className="w-full border-collapse">
														<tbody>
															{visibleFields.map(
																(field) => (
																	<tr
																		key={`${row.rowIndex}-${field.column}`}
																		className="border-b border-gray-200 last:border-b-0"
																	>
																		<td className="w-[42%] border-r border-gray-200 px-3 py-2 text-right text-gray-500">
																			{field.column}
																		</td>
																		<td className="px-3 py-2">
																			{fieldText(
																				field.value
																			) ? (
																				<span
																					className={
																						field.changed
																							? field.status ===
																								"Removed"
																								? "text-red-500 line-through"
																								: changedValueClass
																							: plainValueClass
																					}
																				>
																					{fieldText(
																						field.value
																					)}
																				</span>
																			) : (
																				<span className="inline-block h-7 w-full border border-gray-200 bg-white" />
																			)}
																		</td>
																	</tr>
																)
															)}
														</tbody>
													</table>
													{fieldPageCount > 1 ? (
														<div className="flex items-center justify-center gap-2 border-t border-gray-200 py-1.5 text-sm text-[#C026D3]">
															<button
																type="button"
																aria-label="Previous fields"
																disabled={fieldPage <= 1}
																onClick={() =>
																	setFieldPages(
																		(current) => ({
																			...current,
																			[row.rowIndex]:
																				fieldPage - 1,
																		})
																	)
																}
																className="disabled:opacity-30"
															>
																<ChevronLeft size={14} />
															</button>
															{Array.from(
																{ length: fieldPageCount },
																(_, index) => {
																	const pageNumber =
																		index + 1;
																	return (
																		<button
																			key={pageNumber}
																			type="button"
																			onClick={() =>
																				setFieldPages(
																					(current) => ({
																						...current,
																						[row.rowIndex]:
																							pageNumber,
																					})
																				)
																			}
																			className={
																				pageNumber ===
																				fieldPage
																					? "font-semibold text-[#C026D3]"
																					: "text-gray-500"
																			}
																		>
																			{pageNumber}
																		</button>
																	);
																}
															)}
															<button
																type="button"
																aria-label="Next fields"
																disabled={
																	fieldPage >=
																	fieldPageCount
																}
																onClick={() =>
																	setFieldPages(
																		(current) => ({
																			...current,
																			[row.rowIndex]:
																				fieldPage + 1,
																		})
																	)
																}
																className="disabled:opacity-30"
															>
																<ChevronRight size={14} />
															</button>
														</div>
													) : null}
												</td>
												<td className="px-3 align-middle">
													<div className="flex flex-col items-stretch gap-2">
														<button
															type="button"
															disabled={
																Boolean(busyKey) ||
																!selected.has(row.rowIndex)
															}
															onClick={() =>
																handleDecision(
																	"approve",
																	[row.rowIndex]
																)
															}
															className="rounded border border-emerald-600 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
														>
															{busyKey ===
															`approve-${row.rowIndex}`
																? "Approving..."
																: "Approve"}
														</button>
														<button
															type="button"
															disabled={
																Boolean(busyKey) ||
																!selected.has(row.rowIndex)
															}
															onClick={() =>
																handleDecision(
																	"reject",
																	[row.rowIndex]
																)
															}
															className="rounded border border-red-500 px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
														>
															{busyKey ===
															`reject-${row.rowIndex}`
																? "Rejecting..."
																: "Reject"}
														</button>
													</div>
												</td>
											</tr>
										);
									})
								) : (
									<tr>
										<td
											colSpan={4}
											className="px-4 py-10 text-center text-sm text-gray-400"
										>
											No unsynced rows
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					{totalPages > 1 ? (
						<div className="mt-3 flex items-center justify-center gap-2 text-sm text-[#C026D3]">
							<button
								type="button"
								aria-label="Previous page"
								disabled={safePage <= 1}
								onClick={() =>
									setPage((value) => Math.max(1, value - 1))
								}
								className="disabled:opacity-30"
							>
								<ChevronLeft size={16} />
							</button>
							{Array.from({ length: totalPages }, (_, index) => {
								const pageNumber = index + 1;
								return (
									<button
										key={pageNumber}
										type="button"
										onClick={() => setPage(pageNumber)}
										className={
											pageNumber === safePage
												? "font-semibold text-[#C026D3]"
												: "text-gray-500"
										}
									>
										{pageNumber}
									</button>
								);
							})}
							<button
								type="button"
								aria-label="Next page"
								disabled={safePage >= totalPages}
								onClick={() =>
									setPage((value) =>
										Math.min(totalPages, value + 1)
									)
								}
								className="disabled:opacity-30"
							>
								<ChevronRight size={16} />
							</button>
						</div>
					) : null}
					</>
					)}
				</div>
			</div>
		</div>
	);
};

export default CopyMatrixRefreshModal;
