const RowsPerPage = ({ value, onChange, className }) => {
	return (
		<div
			className={`flex items-center gap-3 text-sm p-8 font-medium text-gray-700 ${className}`}
		>
			<span>Show</span>
			<div className="relative">
				<select
					value={value}
					onChange={(e) => onChange(Number(e.target.value))}
					className="appearance-none border border-gray-300 rounded px-3 py-1.5 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
				>
					<option value={10}>10</option>
					<option value={20}>20</option>
					<option value={50}>50</option>
				</select>
				{/* Custom Arrow for styling match */}
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
