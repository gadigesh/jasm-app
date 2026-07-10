import { Plus, ArrowLeft, Upload, Download } from "lucide-react";
import SortDropdown from "../common/SortDropdown";
import FilterDropdown from "../common/FilterDropdown";
export const SortAction = (props) => <SortDropdown {...props} />;
export const FilterAction = (props) => <FilterDropdown {...props} />;
export const AddButton = ({ label, onClick, disabled, tooltip }) => (
	<button
		onClick={onClick}
		title={tooltip || label}
		className="flex items-center cursor-pointer gap-2 px-5 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] text-sm font-semibold"
		disabled={disabled}
	>
		<Plus className="h-4 w-4" />
		{label}
	</button>
);
export const SaveButton = ({ label = "Save", onClick, disabled }) => (
	<button
		onClick={onClick}
		disabled={disabled}
		className="px-5 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
	>
		{label}
	</button>
);
export const CancelButton = ({ onClick, disabled }) => (
	<button
		onClick={onClick}
		disabled={disabled}
		className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#413d42] disabled:opacity-50 disabled:cursor-not-allowed"
	>
		Cancel
	</button>
);
export const BackButton = ({ label, onClick, disabled, tooltip }) => (
	<button
		onClick={onClick}
		disabled={disabled}
		title={tooltip || label}
		className="flex items-center gap-2 px-4 py-2 border border-[#EEF2F6] text-[#64748B] rounded-lg hover:border-[#B600C9] hover:text-[#B600C9] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	>
		<ArrowLeft className="h-4 w-4" />
		{label}
	</button>
);
export const ImportButton = ({ onClick, tooltip = "Import" }) => (
	<button
		onClick={onClick}
		title={tooltip}
		className="flex items-center gap-2 px-4 py-2 border border-[#EEF2F6] text-[#64748B] rounded-lg hover:border-[#B600C9] hover:text-[#B600C9] text-sm font-medium"
	>
		<Upload className="h-4 w-4" />
		Import
	</button>
);
export const ExportButton = ({ onClick, tooltip = "Export" }) => (
	<button
		onClick={onClick}
		title={tooltip}
		className="flex items-center gap-2 px-4 py-2 border border-[#EEF2F6] text-[#64748B] rounded-lg hover:border-[#B600C9] hover:text-[#B600C9] text-sm font-medium"
	>
		<Download className="h-4 w-4" />
		Export
	</button>
);
