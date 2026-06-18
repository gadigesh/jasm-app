import React from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmDialog = ({
	isOpen,
	onClose,
	onConfirm,
	title = "Are you sure?",
	message = "This action cannot be undone.",
	confirmLabel = "Delete",
	cancelLabel = "Cancel",
	isLoading = false,
	variant = "danger",
}) => {
	if (!isOpen) return null;

	const confirmClass =
		variant === "danger"
			? "bg-red-600 hover:bg-red-700"
			: "bg-[#B600C9] hover:bg-[#9a00ab]";

	return (
		<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95">
				<button
					onClick={onClose}
					disabled={isLoading}
					className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"
				>
					<X size={18} />
				</button>

				<div className="flex items-start gap-4">
					<div
						className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
							variant === "danger"
								? "bg-red-100 text-red-600"
								: "bg-purple-100 text-[#B600C9]"
						}`}
					>
						<AlertTriangle size={20} />
					</div>
					<div className="flex-1 pr-6">
						<h3 className="text-lg font-bold text-gray-900">
							{title}
						</h3>
						<p className="text-sm text-gray-500 mt-2">{message}</p>
					</div>
				</div>

				<div className="flex justify-end gap-3 mt-6">
					<button
						type="button"
						onClick={onClose}
						disabled={isLoading}
						className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={isLoading}
						className={`px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50 ${confirmClass}`}
					>
						{isLoading ? "Please wait..." : confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmDialog;
