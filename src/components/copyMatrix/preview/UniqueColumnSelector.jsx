import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formSelectClass } from "../../../utils/formStyles";
import { AUTO_ROW_ID_COLUMN } from "../../../utils/constants";

/**
 * Unique column picker + uniqueness status message (CM preview).
 */
const UniqueColumnSelector = ({
	columns = [],
	value,
	onChange,
	disabled = false,
	isChecking = false,
	analysis = null,
	className = "",
	aside = null,
}) => {
	const isRowId = value === AUTO_ROW_ID_COLUMN;
	const isUnique = isRowId || analysis?.unique === true;
	const isNotUnique = analysis && analysis.unique === false;

	return (
		<div>
			<label className="block text-sm font-semibold text-gray-700 mb-1">
				Unique Column
			</label>
			<div className="flex items-center gap-3">
				<select
					value={value}
					onChange={(e) => onChange?.(e.target.value)}
					className={`${formSelectClass} ${className}`.trim()}
					disabled={disabled || isChecking}
				>
					{columns.map((col) => (
						<option key={col} value={col}>
							{col}
						</option>
					))}
				</select>
				{aside}
			</div>

			{isChecking && (
				<p className="text-xs text-gray-500 mt-1.5">
					Checking uniqueness…
				</p>
			)}

			{!isChecking && isRowId && (
				<p className="mt-1.5 max-w-52 text-xs text-gray-500">
					Pick another column if its values are unique.
				</p>
			)}

			{!isChecking && isUnique && !isRowId && (
				<p className="mt-1.5 flex max-w-52 items-start gap-1.5 text-xs text-green-700">
					<CheckCircle2 size={14} className="mt-0.5 shrink-0" />
					<span>
						Unique — {AUTO_ROW_ID_COLUMN} will be hidden.
						{analysis?.emptyWarning
							? " Empty cells use a row-index key."
							: ""}
					</span>
				</p>
			)}

			{!isChecking && isNotUnique && (
				<div className="mt-1.5 flex w-64 max-h-36 items-start gap-1.5 overflow-y-auto rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
					<AlertTriangle
						size={12}
						className="mt-0.5 shrink-0 text-amber-600"
					/>
					<div className="min-w-0 break-words">
						<p className="font-semibold">Not unique</p>
						{analysis.message && (
							<p className="mt-0.5 text-amber-800">
								{analysis.message}
							</p>
						)}
						<p className="mt-0.5 text-amber-700">
							Fix duplicate values before saving.
						</p>
					</div>
				</div>
			)}
		</div>
	);
};

export default UniqueColumnSelector;
