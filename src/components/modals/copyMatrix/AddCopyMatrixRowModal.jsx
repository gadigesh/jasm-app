import React from "react";
import { Rows3, X } from "lucide-react";
import { modalCancelBtnClass } from "../../../utils/formStyles";

const AddCopyMatrixRowModal = ({
	isOpen,
	onClose,
	onConfirm,
	isLoading = false,
}) => {
	if (!isOpen) return null;

	const handleSubmit = (e) => {
		e.preventDefault();
		onConfirm?.();
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
						<h3 className="text-lg font-bold text-gray-900">Add row</h3>
						<p className="text-sm text-gray-500 mt-1">
							Add a new empty row at the end of this copy matrix.
						</p>
					</div>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="flex justify-end gap-3">
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
							disabled={isLoading}
							className="px-5 py-2 bg-[#7C3AED] text-white text-sm font-semibold rounded-lg hover:bg-[#6D28D9] disabled:opacity-50"
						>
							{isLoading ? "Adding..." : "Add row"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default AddCopyMatrixRowModal;
