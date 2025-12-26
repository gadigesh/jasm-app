import React from "react";
import { Plus } from "lucide-react";
import SortDropdown from "../common/SortDropdown";
import FilterDropdown from "../common/FilterDropdown";

const PageHeader = ({
	title,
	onAddAction,
	actionLabel,
	onSort,
	onFilter,
}) => {
	return (
		<div className="bg-white px-8 py-5 border-b border-[#EEF2F6] flex items-center justify-between sticky top-0 z-10 w-full">
			{/* Title */}
			<h1 className="text-2xl font-bold text-[#1A1C1E]">{title}</h1>

			{/* Action Buttons */}
			<div className="flex items-center space-x-3">
				<SortDropdown onSort={onSort} />
				<FilterDropdown onFilter={onFilter} />

				<button
					onClick={onAddAction}
					className="flex items-center space-x-2 px-5 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-all font-semibold shadow-sm text-sm"
				>
					<Plus className="h-5 w-5" />
					<span>{actionLabel}</span>
				</button>
			</div>
		</div>
	);
};

export default PageHeader;
