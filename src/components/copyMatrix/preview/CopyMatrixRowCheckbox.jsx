import React from "react";

/**
 * Row selection checkbox cell (UI only — selection state owned by parent).
 */
const CopyMatrixRowCheckbox = ({
	checked = false,
	indeterminate = false,
	onChange,
	disabled = false,
	ariaLabel = "Select row",
	className = "",
}) => {
	const inputRef = React.useRef(null);

	React.useEffect(() => {
		if (inputRef.current) {
			inputRef.current.indeterminate = Boolean(indeterminate);
		}
	}, [indeterminate]);

	return (
		<label
			className={`inline-flex items-center justify-center cursor-pointer ${
				disabled ? "opacity-50 cursor-not-allowed" : ""
			} ${className}`}
			onClick={(e) => e.stopPropagation()}
		>
			<input
				ref={inputRef}
				type="checkbox"
				checked={checked}
				disabled={disabled}
				onChange={(e) => onChange?.(e.target.checked)}
				aria-label={ariaLabel}
				className="h-4 w-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]/30 cursor-pointer"
			/>
		</label>
	);
};

export default CopyMatrixRowCheckbox;
