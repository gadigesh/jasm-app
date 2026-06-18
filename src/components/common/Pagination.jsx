import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
	const safeTotal = Math.max(totalPages || 1, 1);
	const safePage = Math.min(Math.max(currentPage || 1, 1), safeTotal);

	const getPageNumbers = () => {
		if (safeTotal <= 7) {
			return Array.from({ length: safeTotal }, (_, i) => i + 1);
		}

		const pages = new Set([1, safeTotal, safePage]);
		if (safePage > 1) pages.add(safePage - 1);
		if (safePage < safeTotal) pages.add(safePage + 1);

		const sorted = [...pages].sort((a, b) => a - b);
		const result = [];

		for (let i = 0; i < sorted.length; i++) {
			if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
				result.push("...");
			}
			result.push(sorted[i]);
		}

		return result;
	};

	if (safeTotal <= 1) {
		return null;
	}

	return (
		<div className="flex items-center gap-2 justify-end px-4">
			<button
				type="button"
				onClick={() => onPageChange(Math.max(1, safePage - 1))}
				className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50"
				disabled={safePage === 1}
			>
				<ChevronLeft size={16} />
			</button>

			{getPageNumbers().map((page, index) => (
				<button
					key={`${page}-${index}`}
					type="button"
					onClick={() =>
						typeof page === "number" && onPageChange(page)
					}
					disabled={page === "..."}
					className={`min-w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors px-1
            ${
				page === safePage
					? "bg-[#B600C9] text-white shadow-md"
					: "text-gray-600 hover:bg-gray-50"
			}
            ${page === "..." ? "cursor-default hover:bg-transparent" : ""}
          `}
				>
					{page}
				</button>
			))}

			<button
				type="button"
				onClick={() =>
					onPageChange(Math.min(safeTotal, safePage + 1))
				}
				className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50"
				disabled={safePage === safeTotal}
			>
				<ChevronRight size={16} />
			</button>
		</div>
	);
};

export default Pagination;
