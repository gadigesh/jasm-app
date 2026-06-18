import React, { useState, useEffect } from "react";
import { X, Table2, ArrowRight } from "lucide-react";
import { showSuccess, showError } from "../../utils/toastMsg";
import { useUpdateCopyMatrixMutation } from "../../store/services/copyMatrix";

const EditCopyMatrixModal = ({ isOpen, onClose, matrix, onEditSheet }) => {
	const [updateCopyMatrix, { isLoading }] = useUpdateCopyMatrixMutation();
	const [status, setStatus] = useState("Active");

	useEffect(() => {
		if (matrix) {
			setStatus(matrix.status || "Active");
		}
	}, [matrix]);

	if (!isOpen || !matrix) return null;

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const apiStatus =
				status === "Active" ? "completed" : "failed";
			await updateCopyMatrix({
				id: matrix._id,
				status: apiStatus,
			}).unwrap();
			showSuccess("Status updated");
			onClose();
		} catch (error) {
			showError(error?.data?.message || "Failed to update");
		}
	};

	const handleEditSheet = () => {
		onClose();
		onEditSheet?.(matrix);
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
				<div className="h-1.5 bg-gradient-to-r from-[#B600C9] to-[#7C3AED]" />

				<div className="p-8">
					<button
						onClick={onClose}
						className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
					>
						<X size={20} />
					</button>

					<h2 className="text-xl font-bold text-[#1A1C1E] mb-1">
						Edit Copy Matrix
					</h2>
					<p className="text-sm text-gray-500 mb-6">
						Update status or edit the sheet data
					</p>

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
								Name
							</label>
							<div className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-800">
								{matrix.name}
							</div>
						</div>

						<div>
							<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
								Status
							</label>
							<div className="flex gap-3">
								<button
									type="button"
									onClick={() => setStatus("Active")}
									className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
										status === "Active"
											? "border-green-500 bg-green-50 text-green-700"
											: "border-gray-200 text-gray-500 hover:border-green-200 hover:bg-green-50/50"
									}`}
								>
									<span className="w-2 h-2 rounded-full bg-green-500" />
									Active
								</button>
								<button
									type="button"
									onClick={() => setStatus("Inactive")}
									className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
										status === "Inactive"
											? "border-red-500 bg-red-50 text-red-700"
											: "border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50/50"
									}`}
								>
									<span className="w-2 h-2 rounded-full bg-red-500" />
									Inactive
								</button>
							</div>
						</div>

						<button
							type="button"
							onClick={handleEditSheet}
							className="w-full group flex items-center justify-between gap-3 px-5 py-4 rounded-xl border-2 border-dashed border-[#B600C9]/40 bg-gradient-to-r from-purple-50 to-white hover:from-purple-100 hover:border-[#B600C9] transition-all"
						>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-lg bg-[#B600C9] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
									<Table2 size={20} />
								</div>
								<div className="text-left">
									<p className="text-sm font-semibold text-gray-900">
										Edit Sheet
									</p>
									<p className="text-xs text-gray-500">
										Open the data grid to edit rows
									</p>
								</div>
							</div>
							<ArrowRight
								size={18}
								className="text-[#B600C9] group-hover:translate-x-0.5 transition-transform"
							/>
						</button>

						<div className="flex justify-end gap-3 pt-2">
							<button
								type="button"
								onClick={onClose}
								className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isLoading}
								className="px-6 py-2.5 bg-[#B600C9] text-white rounded-lg text-sm font-semibold hover:bg-[#9a00ab] disabled:opacity-50 shadow-sm"
							>
								{isLoading ? "Saving..." : "Save status"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default EditCopyMatrixModal;
