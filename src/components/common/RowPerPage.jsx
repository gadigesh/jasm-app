const RowsPerPage = ({ value, onChange, className }) => {
	return (
		<div
			className={`flex items-center gap-2 text-sm font-medium text-gray-700 ${className}`}
		>
			<label htmlFor="rows-per-page">Show</label>
			<div className="relative">
				<select
					id="rows-per-page"
					value={value}
					aria-label="Rows per page"
					onChange={(e) => onChange(Number(e.target.value))}
					className="h-7 appearance-none rounded border border-gray-300 bg-white py-0 pl-2 pr-7 text-sm text-gray-900 focus:border-[#B600C9] focus:outline-none focus:ring-2 focus:ring-[#B600C9]/20 cursor-pointer"
				>
					<option value={10}>10</option>
					<option value={20}>20</option>
					<option value={50}>50</option>
				</select>
				<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
					<svg
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</div>
			</div>
			<span>Row</span>
		</div>
	);
};

export default RowsPerPage;
