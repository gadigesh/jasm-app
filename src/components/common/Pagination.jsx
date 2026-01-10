import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
	// Helper to generate page numbers (simulating the 1 2 3 4 5 ... 10 structure)
	const getPageNumbers = () => {
		// This is a simplified logic to match the screenshot hardcoded look
		return [1, 2, 3, 4, 5, "...", 10];
	};

	return (
		<div className="flex items-center gap-2 justify-end px-4">
			{/* Previous Button */}
			<button
				onClick={() => onPageChange(Math.max(1, currentPage - 1))}
				className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50"
				disabled={currentPage === 1}
			>
				<ChevronLeft size={16} />
			</button>

			{/* Page Numbers */}
			{getPageNumbers().map((page, index) => (
				<button
					key={index}
					onClick={() =>
						typeof page === "number" && onPageChange(page)
					}
					className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors
            ${
				page === currentPage
					? "bg-purple-400 text-white shadow-md"
					: "text-gray-600 hover:bg-gray-50"
			}
            ${page === "..." ? "cursor-default hover:bg-transparent" : ""}
          `}
				>
					{page}
				</button>
			))}

			{/* Next Button */}
			<button
				onClick={() =>
					onPageChange(Math.min(totalPages, currentPage + 1))
				}
				className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
			>
				<ChevronRight size={16} />
			</button>
		</div>
	);
};

export default Pagination;
