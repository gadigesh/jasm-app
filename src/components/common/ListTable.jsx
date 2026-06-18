import { useState, useRef } from "react";
import { Pencil, Eye, Download, Trash } from "lucide-react";

const ListTable = ({
	columns = [],
	rows = [],
	loading = false,
	onRowClick,
	onView,
	onEdit,
	onDelete,
	onDownload,
}) => {
	const [scrolled, setScrolled] = useState(false);
	const scrollRef = useRef(null);

	const handleScroll = (e) => {
		setScrolled(e.target.scrollTop > 0);
	};

	return (
		<div className="px-6">
			<div className="bg-white overflow-hidden">
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className="max-h-[calc(100vh-290px)] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200"
				>
					<table className="w-full text-sm text-center text-[#64748B]">
						<thead
							className={`bg-gray-50 sticky top-0 z-20 text-xs font-medium border-b border-gray-200 transition-shadow duration-200 ${
								scrolled ? "shadow-md" : ""
							}`}
						>
							<tr>
								{columns.map((col) => (
									<th
										key={col.key}
										className="px-4 py-3 bg-gray-50"
									>
										{col.label}
									</th>
								))}
								<th className="px-4 py-3 text-center bg-gray-50">
									Options
								</th>
							</tr>
						</thead>

						<tbody className="divide-y divide-gray-100">
							{!loading &&
								rows.map((row, rowIndex) => (
									<tr
										key={row._id || rowIndex}
										onClick={() => onRowClick?.(row)}
										className={`hover:bg-gray-200 relative top-2 shadow-sm transition-colors ${
											onRowClick ? "cursor-pointer" : ""
										}`}
									>
										{columns.map((col) => (
											<td
												key={col.key}
												className="px-4 py-3 truncate max-w-[240px]"
											>
												{col.render
													? col.render(
															row[col.key],
															row
													  )
													: row[col.key]}
											</td>
										))}
										<td
											className="px-4 py-3 text-center"
											onClick={(e) => e.stopPropagation()}
										>
											<div className="flex justify-center gap-3 text-gray-400">
												<Pencil
													size={16}
													className="cursor-pointer hover:text-indigo-600 transition-colors"
													onClick={() => onEdit?.(row)}
												/>
												<Eye
													size={16}
													className="cursor-pointer hover:text-indigo-600 transition-colors"
													onClick={() =>
														onView
															? onView(row)
															: onRowClick?.(row)
													}
												/>
												<Download
													size={16}
													title="Download CSV"
													className={`transition-colors ${
														onDownload
															? "cursor-pointer hover:text-indigo-600"
															: "opacity-30 cursor-not-allowed"
													}`}
													onClick={() =>
														onDownload?.(row)
													}
												/>
												<Trash
													size={16}
													className="cursor-pointer hover:text-red-500 transition-colors"
													onClick={() => onDelete?.(row)}
												/>
											</div>
										</td>
									</tr>
								))}
						</tbody>
					</table>

					{!loading && rows.length === 0 && (
						<div className="p-6 text-center text-gray-500">
							No data available
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ListTable;
