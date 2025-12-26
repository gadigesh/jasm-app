import React, { useState, useRef, useEffect } from "react";
import { ListFilter, Check } from "lucide-react";

const FilterDropdown = ({ onFilter }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [activeFilter, setActiveFilter] = useState("all");
	const dropdownRef = useRef(null);

	const options = [
		{ id: "all", label: "All Status" },
		{ id: "active", label: "Active" },
		{ id: "inactive", label: "Inactive" },
	];

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelect = (id) => {
		setActiveFilter(id);
		onFilter(id);
		setIsOpen(false);
	};

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-all font-medium text-sm ${
					isOpen 
                        ? "border-[#7C3AED] bg-purple-50 text-[#7C3AED]" 
                        : "border-[#EEF2F6] text-[#64748B] hover:border-[#7C3AED] hover:text-[#7C3AED]"
				}`}
			>
				<ListFilter className="h-4 w-4" />
				<span>Filter</span>
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-48 bg-white border border-[#EEF2F6] rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
					{options.map((option) => (
						<button
							key={option.id}
							onClick={() => handleSelect(option.id)}
							className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED] transition-colors"
						>
							<span>{option.label}</span>
							{activeFilter === option.id && <Check className="h-4 w-4 text-[#7C3AED]" />}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default FilterDropdown;
