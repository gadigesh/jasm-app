import { useState, useRef } from "react";
import { Pencil, Eye, Download, Trash, Copy } from "lucide-react";
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
										className={`${bodyCellClass} text-center overflow-visible group-hover:bg-gray-50`}
										onClick={(e) => e.stopPropagation()}
									>
										<div className="flex justify-center items-center gap-3 text-gray-400">
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
											<IconTooltip label={labels.view}>
												<button
													type="button"
													aria-label={labels.view}
													className={iconButtonClass}
													onClick={() =>
														onView
															? onView(row)
															: onRowClick?.(row)
													}
												>
													<Eye size={16} />
												</button>
											</IconTooltip>
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
