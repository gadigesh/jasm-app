import { Plus, ArrowLeft } from "lucide-react";
import SortDropdown from "../common/SortDropdown";
import FilterDropdown from "../common/FilterDropdown";
export const SortAction = (props) => <SortDropdown {...props} />;
export const FilterAction = (props) => <FilterDropdown {...props} />;
export const AddButton = ({ label, onClick, disabled }) => (
	<button
		onClick={onClick}
		className="flex items-center cursor-pointer gap-2 px-5 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] text-sm font-semibold"
		disabled={disabled}
	>
		<Plus className="h-4 w-4" />
		{label}
	</button>
);
export const SaveButton = ({ label = "Save", onClick }) => (
	<button
		onClick={onClick}
		className="px-5 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-semibold"
	>
		{label}
	</button>
);
export const CancelButton = ({ onClick }) => (
	<button
		onClick={onClick}
		className="px-4 py-2 text-sm font-medium text-[#6B7280]"
	>
		Cancel
	</button>
);
export const BackButton = ({ label, onClick }) => (
	<button
		onClick={onClick}
		className="flex items-center gap-2 px-4 py-2 text-sm font-medium"
	>
		<ArrowLeft className="h-4 w-4" />
		{label}
	</button>
);
