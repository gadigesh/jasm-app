import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Pencil, Eye, Download, Trash, Copy, RefreshCw, Upload } from "lucide-react";
import IconTooltip from "./IconTooltip";

const alignClass = (align) => {
	if (align === "left") return "text-left";
	if (align === "right") return "text-right";
	return "text-center";
};

const cellContent = (col, content) => {
	if (col.align === "center") {
		return <div className="flex justify-center">{content}</div>;
	}
	if (col.align === "right") {
		return <div className="flex justify-end">{content}</div>;
	}
	return content;
};

const headerCellClass =
	"px-4 py-3 bg-gray-50 border-y border-gray-200 text-xs font-medium text-gray-600 first:border-l first:rounded-l-lg last:border-r last:rounded-r-lg";

const bodyCellClass =
	"px-4 py-3 align-middle bg-white border-y border-gray-200 first:border-l first:rounded-l-lg last:border-r last:rounded-r-lg";

const iconButtonClass =
	"inline-flex items-center justify-center rounded p-0.5 text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]";

function formatChangeBadge(row) {
	const added = Math.max(0, Number(row?.addedRowCount) || 0);
	const modified = Math.max(0, Number(row?.modifiedRowCount) || 0);
	const removed = Math.max(0, Number(row?.removedRowCount) || 0);
	const newColumns = Math.max(0, Number(row?.newColumnCount) || 0);
	const value = Math.max(
		added + modified + removed + newColumns,
		Number(row?.changedRowCount) || 0
	);
	if (value <= 0) return null;
	const actual = String(value);
	const parts = [];
	if (added > 0) {
		parts.push(`${added} new row${added === 1 ? "" : "s"}`);
	}
	if (modified > 0) {
		parts.push(`${modified} updated row${modified === 1 ? "" : "s"}`);
	}
	if (removed > 0) {
		parts.push(`${removed} removed row${removed === 1 ? "" : "s"}`);
	}
	if (newColumns > 0) {
		parts.push(
			`${newColumns} new column${newColumns === 1 ? "" : "s"}`
		);
	}
	const detail = parts.join("\n");
	return {
		value,
		display: actual.length > 3 ? `${actual.slice(0, 3)}...` : actual,
		label:
			actual.length > 3
				? [actual, detail].filter(Boolean).join("\n")
				: detail || actual,
	};
}

function RefreshActionButton({
	row,
	label,
	refreshingId,
	onRefresh,
}) {
	const badge = formatChangeBadge(row);
	const isRefreshing = refreshingId === row._id;

	return (
		<span className="relative inline-flex">
			<IconTooltip label={label}>
				<button
					type="button"
					aria-label={label}
					disabled={isRefreshing || row.canRefresh === false}
					className={`${iconButtonClass} disabled:pointer-events-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400`}
					onClick={() => onRefresh?.(row)}
				>
					<RefreshCw
						size={16}
						className={isRefreshing ? "animate-spin" : ""}
					/>
				</button>
			</IconTooltip>
			{badge ? (
				<IconTooltip
					label={badge.label}
					className="absolute -right-2 -top-2 z-20"
				>
					<span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-bold leading-none text-white shadow-sm">
						{badge.display}
					</span>
				</IconTooltip>
			) : null}
		</span>
	);
}

function ViewOptionsButton({
	row,
	label,
	onView,
	onCopyLink,
	onRowClick,
}) {
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState({ top: 0, left: 0 });
	const buttonRef = useRef(null);
	const menuRef = useRef(null);

	useEffect(() => {
		if (!open) return undefined;

		const close = (event) => {
			if (buttonRef.current?.contains(event.target)) return;
			if (menuRef.current?.contains(event.target)) return;
			setOpen(false);
		};

		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [open]);

	const openView = () => {
		if (onView) onView(row);
		else onRowClick?.(row);
	};

	const hasSheetUrl = Boolean(String(row?.fileRef || "").trim());

	if (!onCopyLink) {
		return (
			<IconTooltip label={label}>
				<button
					type="button"
					aria-label={label}
					className={iconButtonClass}
					onClick={openView}
				>
					<Eye size={16} />
				</button>
			</IconTooltip>
		);
	}

	const toggleMenu = () => {
		const rect = buttonRef.current?.getBoundingClientRect();
		if (rect) {
			setPosition({
				top: rect.bottom + 6,
				left: rect.left + rect.width / 2,
			});
		}
		setOpen((current) => !current);
	};

	return (
		<>
			<IconTooltip label={label}>
				<button
					ref={buttonRef}
					type="button"
					aria-label={label}
					aria-expanded={open}
					aria-haspopup="menu"
					className={iconButtonClass}
					onClick={toggleMenu}
				>
					<Eye size={16} />
				</button>
			</IconTooltip>
			{open
				? createPortal(
						<div
							ref={menuRef}
							role="menu"
							style={{
								position: "fixed",
								top: position.top,
								left: position.left,
								transform: "translateX(-50%)",
								zIndex: 2147483646,
							}}
							className="min-w-[132px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
						>
							<button
								type="button"
								role="menuitem"
								disabled={!hasSheetUrl}
								aria-disabled={!hasSheetUrl}
								className={`block w-full px-3 py-2 text-left text-sm ${
									hasSheetUrl
										? "text-gray-700 hover:bg-gray-50"
										: "cursor-not-allowed text-gray-400"
								}`}
								onClick={() => {
									if (!hasSheetUrl) return;
									setOpen(false);
									onCopyLink(row);
								}}
							>
								Copy URL
							</button>
							<button
								type="button"
								role="menuitem"
								className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
								onClick={() => {
									setOpen(false);
									openView();
								}}
							>
								View CM
							</button>
						</div>,
						document.body
					)
				: null}
		</>
	);
}

const ListTable = ({
	columns = [],
	rows = [],
	loading = false,
	caption,
	onRowClick,
	onView,
	onEdit,
	onDelete,
	onDownload,
	onClone,
	onRefresh,
	onCopyLink,
	onUpload,
	refreshingId = null,
	tooltips = {},
}) => {
	const [scrolled, setScrolled] = useState(false);
	const scrollRef = useRef(null);

	const labels = {
		edit: "Edit",
		view: "View",
		download: "Download CSV",
		delete: "Delete",
		clone: "Clone",
		refresh: "Refresh from source",
		copyLink: "Copy link",
		upload: "Upload",
		...tooltips,
	};

	const handleScroll = (e) => {
		setScrolled(e.target.scrollTop > 0);
	};

	const renderCellValue = (col, row) => {
		if (col.render) {
			return col.render(row[col.key], row);
		}

		if (col.key === "name") {
			return (
				<span className="font-medium text-[#334155]">{row[col.key]}</span>
			);
		}

		return row[col.key];
	};

	return (
		<div className="px-6">
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="max-h-[calc(100vh-290px)] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200"
			>
				<table className="w-full border-separate border-spacing-y-4 text-sm text-[#64748B]">
					{caption ? <caption className="sr-only">{caption}</caption> : null}
					<thead
						className={`sticky top-0 z-20 transition-shadow duration-200 ${
							scrolled ? "shadow-md" : ""
						}`}
					>
						<tr>
							{columns.map((col) => (
								<th
									key={col.key}
									className={`${headerCellClass} ${alignClass(col.align)}`}
								>
									{col.headerRender
										? col.headerRender()
										: col.label}
								</th>
							))}
							<th
								className={`${headerCellClass} text-center`}
							>
								Options
							</th>
						</tr>
					</thead>

					<tbody>
						{!loading &&
							rows.map((row, rowIndex) => (
								<tr
									key={row._id || rowIndex}
									onClick={() => onRowClick?.(row)}
									className={`group transition-colors ${
										onRowClick ? "cursor-pointer" : ""
									}`}
								>
									{columns.map((col) => (
										<td
											key={col.key}
											className={`${bodyCellClass} ${alignClass(col.align)} group-hover:bg-gray-50 ${
												col.key === "name"
													? "max-w-[320px]"
													: "max-w-[240px]"
											}`}
										>
											{cellContent(
												col,
												<div
													className={
														col.key === "name"
															? "truncate"
															: ""
													}
												>
													{renderCellValue(col, row)}
												</div>
											)}
										</td>
									))}
									<td
										className={`${bodyCellClass} relative z-10 text-center overflow-visible group-hover:bg-gray-50`}
										onClick={(e) => e.stopPropagation()}
									>
										<div className="flex justify-center items-center gap-3 text-gray-400">
											{(() => {
												const isGoogleSheet =
													row.inputType === "gsheet" ||
													row.fileType === "GSheet";
												const showUploadInstead =
													Boolean(onUpload) &&
													!isGoogleSheet;

												return (
													<>
														{onRefresh &&
															!showUploadInstead && (
																<RefreshActionButton
																	row={row}
																	label={
																		labels.refresh
																	}
																	refreshingId={
																		refreshingId
																	}
																	onRefresh={
																		onRefresh
																	}
																/>
															)}
														{showUploadInstead &&
															onUpload && (
																<IconTooltip
																	label={
																		labels.upload
																	}
																>
																	<button
																		type="button"
																		aria-label={
																			labels.upload
																		}
																		className={
																			iconButtonClass
																		}
																		onClick={() =>
																			onUpload?.(
																				row
																			)
																		}
																	>
																		<Upload
																			size={
																				16
																			}
																		/>
																	</button>
																</IconTooltip>
															)}
													</>
												);
											})()}
											<IconTooltip label={labels.edit}>
												<button
													type="button"
													aria-label={labels.edit}
													className={iconButtonClass}
													onClick={() => onEdit?.(row)}
												>
													<Pencil size={16} />
												</button>
											</IconTooltip>
											<ViewOptionsButton
												row={row}
												label={labels.view}
												onView={onView}
												onCopyLink={onCopyLink}
												onRowClick={onRowClick}
											/>
											<IconTooltip
												label={labels.download}
											>
												<button
													type="button"
													aria-label={labels.download}
													disabled={!onDownload}
													className={`${iconButtonClass} disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400`}
													onClick={() =>
														onDownload?.(row)
													}
												>
													<Download size={16} />
												</button>
											</IconTooltip>
											<IconTooltip label={labels.delete}>
												<button
													type="button"
													aria-label={labels.delete}
													className={`${iconButtonClass} hover:text-red-500`}
													onClick={() =>
														onDelete?.(row)
													}
												>
													<Trash size={16} />
												</button>
											</IconTooltip>
											{onClone && (
												<IconTooltip
													label={labels.clone}
												>
													<button
														type="button"
														aria-label={labels.clone}
														className={iconButtonClass}
														onClick={() =>
															onClone?.(row)
														}
													>
														<Copy size={16} />
													</button>
												</IconTooltip>
											)}
										</div>
									</td>
								</tr>
							))}
					</tbody>
				</table>

				{!loading && rows.length === 0 && (
					<div className="p-6 text-center text-gray-500 border border-gray-200 rounded-lg bg-white">
						No data available
					</div>
				)}
			</div>
		</div>
	);
};

export default ListTable;
