import React, { useState } from "react";
import { X } from "lucide-react";

const AddAccountModal = ({ isOpen, onClose, onAdd }) => {
	const [name, setName] = useState("");
	const [client, setClient] = useState("");

	if (!isOpen) return null;

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!name || !client) return;
		onAdd({ name, client, lastUpdated: "Just now" });
		setName("");
		setClient("");
		onClose();
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

				<h2 className="text-2xl font-bold text-[#1A1C1E] mb-6">Add New Account</h2>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							Account Name
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#EEF2F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-all"
							placeholder="e.g. AMR Hotels"
							autoFocus
						/>
					</div>

					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							Client Name
						</label>
						<input
							type="text"
							value={client}
							onChange={(e) => setClient(e.target.value)}
							className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#EEF2F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-all"
							placeholder="e.g. 85SIXTY"
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
							className="flex-1 px-6 py-3 bg-[#B600C9] text-white font-bold rounded-xl hover:bg-[#9E00AD] shadow-lg shadow-[#B600C9]/20 transition-all"
						>
							Create Account
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default AddAccountModal;
