import React, { useEffect, useState } from "react";
import { Rows3, X } from "lucide-react";
import { formSelectClass, modalCancelBtnClass } from "../../../utils/formStyles";
import { AUTO_ROW_ID_COLUMN } from "../../../utils/constants";

function getRowLabel(row, columns = []) {
	const previewCol = columns.find((col) => col !== AUTO_ROW_ID_COLUMN);
	const preview = previewCol ? row[previewCol] : "";
	const suffix = preview ? ` — ${String(preview).slice(0, 40)}` : "";
	return `Row ${row.rowIndex}${suffix}`;
}

const CloneCopyMatrixRowModal = ({
	isOpen,
	onClose,
	onConfirm,
	rows = [],
	columns = [],
	isLoading = false,
}) => {
	const [sourceRowId, setSourceRowId] = useState("");

	useEffect(() => {
		if (!isOpen) return;
		setSourceRowId(rows[0]?._id ? String(rows[0]._id) : "");
	}, [isOpen, rows]);

	if (!isOpen) return null;

	const canSubmit = Boolean(sourceRowId) && !isLoading;

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!canSubmit) return;
		onConfirm?.(sourceRowId);
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
						<Rows3 size={20} />
					</div>
					<div className="flex-1 pr-6">
						<h3 className="text-lg font-bold text-gray-900">Clone row</h3>
						<p className="text-sm text-gray-500 mt-1">
							Select a row to duplicate at the end of the sheet.
						</p>
					</div>
				</div>

				<form onSubmit={handleSubmit}>
					<label className="block text-sm font-semibold text-gray-700 mb-1">
						Source row
					</label>
					{rows.length === 0 ? (
						<p className="text-sm text-gray-500 py-2">
							No rows available to clone.
						</p>
					) : (
						<select
							value={sourceRowId}
							onChange={(e) => setSourceRowId(e.target.value)}
							className={formSelectClass}
						>
							{rows.map((row) => (
								<option key={row._id} value={row._id}>
									{getRowLabel(row, columns)}
								</option>
							))}
						</select>
					)}

					<div className="flex justify-end gap-3 mt-6">
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
							{isLoading ? "Cloning..." : "Clone row"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default CloneCopyMatrixRowModal;
