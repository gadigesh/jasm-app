import React, { useEffect, useState } from "react";
import { Columns3, X } from "lucide-react";
import {
	formInputClass,
	formSelectClass,
	modalCancelBtnClass,
} from "../../../utils/formStyles";
import { AUTO_ROW_ID_COLUMN } from "../../../utils/constants";

const CloneCopyMatrixColumnModal = ({
	isOpen,
	onClose,
	onConfirm,
	columns = [],
	isLoading = false,
}) => {
	const [sourceColumn, setSourceColumn] = useState("");
	const [newColumnName, setNewColumnName] = useState("");
	const [error, setError] = useState("");

	const cloneableColumns = columns.filter(
		(col) => col !== AUTO_ROW_ID_COLUMN
	);

	useEffect(() => {
		if (!isOpen) return;
		const available = columns.filter((col) => col !== AUTO_ROW_ID_COLUMN);
		setSourceColumn(available[0] || "");
		setNewColumnName("");
		setError("");
	}, [isOpen, columns]);

	if (!isOpen) return null;

	const trimmed = newColumnName.trim();
	const isDuplicate = columns.some(
		(col) => col.toLowerCase() === trimmed.toLowerCase()
	);
	const isReserved = trimmed === AUTO_ROW_ID_COLUMN;
	const canSubmit =
		Boolean(sourceColumn) &&
		trimmed.length > 0 &&
		!isDuplicate &&
		!isReserved &&
		!isLoading;

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!canSubmit) {
			if (isReserved) setError(`"${AUTO_ROW_ID_COLUMN}" is reserved`);
			else if (isDuplicate) setError("Column name already exists");
			return;
		}
		onConfirm?.({ sourceColumn, newColumnName: trimmed });
	};

	return (
		<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
				<button
					type="button"
					onClick={onClose}
					disabled={isLoading}
					className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"
				>
					<X size={18} />
				</button>

				<div className="flex items-start gap-4 mb-6">
					<div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 text-[#7C3AED] flex items-center justify-center">
						<Columns3 size={20} />
					</div>
					<div className="flex-1 pr-6">
						<h3 className="text-lg font-bold text-gray-900">
							Clone column
						</h3>
						<p className="text-sm text-gray-500 mt-1">
							Copy values from an existing column into a new column.
						</p>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-1">
							Source column
						</label>
						{cloneableColumns.length === 0 ? (
							<p className="text-sm text-gray-500 py-2">
								No columns available to clone.
							</p>
						) : (
							<select
								value={sourceColumn}
								onChange={(e) => setSourceColumn(e.target.value)}
								className={formSelectClass}
							>
								{cloneableColumns.map((col) => (
									<option key={col} value={col}>
										{col}
									</option>
								))}
							</select>
						)}
					</div>

					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-1">
							New column name
						</label>
						<input
							type="text"
							value={newColumnName}
							onChange={(e) => {
								setNewColumnName(e.target.value);
								setError("");
							}}
							placeholder="e.g. Headline (Copy)"
							className={formInputClass}
						/>
						{error && (
							<p className="text-xs text-red-500 mt-1">{error}</p>
						)}
					</div>

					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							disabled={isLoading}
							className={modalCancelBtnClass}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!canSubmit}
							className="px-5 py-2 bg-[#7C3AED] text-white text-sm font-semibold rounded-lg hover:bg-[#6D28D9] disabled:opacity-50"
						>
							{isLoading ? "Cloning..." : "Clone column"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default CloneCopyMatrixColumnModal;
