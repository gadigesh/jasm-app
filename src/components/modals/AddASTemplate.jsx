import React, { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { showSuccess, showError } from "../../utils/toastMsg";
//import { useCreateTemplateMutation } from "../../store/services/templates";

const AddASTemplate = ({ isOpen, onClose }) => {
	//const [createTemplate, { isLoading }] = useCreateTemplateMutation();
	const [templateName, setTemplateName] = useState("");
	const [description, setDescription] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	if (!isOpen) return null;

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!templateName || !description) {
			showError("Template name and description are required");
			return;
		}
		try {
			setIsLoading(true);
			//await createTemplate({
			//templateName,
			//description,
			//}).unwrap();
			showSuccess("Template created successfully");
			setTemplateName("");
			setDescription("");
			onClose();
		} catch (error) {
			showError(
				error?.data?.message ||
					"Failed to create template please check the details"
			);
		}
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
			<div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
				<button
					onClick={onClose}
					className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
				>
					<X size={20} />
				</button>

				<h2 className="text-2xl font-bold text-[#1A1C1E] mb-6">
					Add New Template
				</h2>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							Template Name
						</label>
						<input
							type="text"
							value={templateName}
							onChange={(e) => setTemplateName(e.target.value)}
							className="w-full px-4 py-3 bg-[#F8FAFC] text-[#7a7e84] border border-[#EEF2F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-all"
							placeholder="e.g. Template Name"
							autoFocus
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							Description
						</label>
						<input
							type="text"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="w-full px-4 py-3 bg-[#F8FAFC] text-[#7a7e84] border border-[#EEF2F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-all"
							placeholder="e.g. Template Description"
							required
						/>
					</div>

					<div className="flex space-x-4 pt-4">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-6 py-3 border border-[#EEF2F6] text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 px-6 py-3 bg-[#B600C9] text-white font-bold rounded-xl hover:bg-[#9E00AD] shadow-lg shadow-[#B600C9]/20 transition-all"
						>
							{isLoading ? "Creating..." : "Create Account"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default AddASTemplate;
