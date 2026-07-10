import React, { useEffect } from "react";
import { useDuplicateNameCheck } from "../../hooks/useDuplicateNameCheck";
import {
	formFieldErrorTextClass,
	formInputClass,
	formInputErrorRingClass,
	formInputLgClass,
} from "../../utils/formStyles";

const ValidatedNameInput = ({
	label,
	value,
	onChange,
	placeholder,
	accountId,
	type = "assetSource",
	excludeId = null,
	excludeUploadId = null,
	enabled = true,
	size = "md",
	className = "",
	required = false,
	onValidationChange,
}) => {
	const { error, isDuplicate, isChecking } = useDuplicateNameCheck({
		accountId,
		name: value,
		type,
		excludeId,
		excludeUploadId,
		enabled: enabled && Boolean(accountId),
	});

	const baseClass = size === "lg" ? formInputLgClass : formInputClass;
	const inputClassName = `${baseClass} ${className} ${
		isDuplicate ? formInputErrorRingClass : ""
	}`.trim();

	useEffect(() => {
		onValidationChange?.({ isDuplicate, error, isChecking });
	}, [isDuplicate, error, isChecking, onValidationChange]);

	return (
		<div>
			{label && (
				<label className="block text-sm font-semibold text-gray-700 mb-1">
					{label}
					{required && <span className="text-red-500"> *</span>}
				</label>
			)}
			<input
				type="text"
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				className={inputClassName}
				aria-invalid={isDuplicate}
				aria-describedby={isDuplicate ? "name-error" : undefined}
			/>
			{isDuplicate && (
				<p id="name-error" className={formFieldErrorTextClass}>
					{error}
				</p>
			)}
		</div>
	);
};

export default ValidatedNameInput;

export function useValidatedNameState(props) {
	return useDuplicateNameCheck(props);
}
