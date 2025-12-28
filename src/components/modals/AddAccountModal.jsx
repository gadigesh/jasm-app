import React, { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { showSuccess, showError } from "../../utils/toastMsg";
import { useCreateAccountMutation } from "../../store/services/accounts";

const AddAccountModal = ({ isOpen, onClose }) => {
	const [createAccount, { isLoading }] = useCreateAccountMutation();

	const [accountName, setAccountName] = useState("");
	const [clientName, setClientName] = useState("");
	const [accountStatus, setAccountStatus] = useState("Active");

	if (!isOpen) return null;

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!accountName || !clientName) {
			showError("Account name and client name are required");
			return;
		}
		try {
			await createAccount({
				accountName,
				clientName,
				accountStatus,
			}).unwrap();
			showSuccess("Account created successfully");
			setAccountName("");
			setClientName("");
			setAccountStatus("Active");
			onClose();
		} catch (error) {
			showError(
				error?.data?.message ||
					"Failed to create account please check the details"
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
					Add New Account
				</h2>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							Account Name
						</label>
						<input
							type="text"
							value={accountName}
							onChange={(e) => setAccountName(e.target.value)}
							className="w-full px-4 py-3 bg-[#F8FAFC] text-[#7a7e84] border border-[#EEF2F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-all"
							placeholder="e.g. AMR Hotels"
							autoFocus
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							Client Name
						</label>
						<input
							type="text"
							value={clientName}
							onChange={(e) => setClientName(e.target.value)}
							className="w-full px-4 py-3 bg-[#F8FAFC] text-[#7a7e84] border border-[#EEF2F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-all"
							placeholder="e.g. 85SIXTY"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							Status
						</label>
						<div className="relative">
							<select
								value={accountStatus}
								onChange={(e) =>
									setAccountStatus(e.target.value)
								}
								className="w-full px-4 py-3 bg-[#F8FAFC] text-[#7a7e84] border border-[#EEF2F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-all appearance-none"
							>
								<option value="Active">Active</option>
								<option value="Inactive">Inactive</option>
							</select>
							<ChevronDown
								className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
								size={20}
							/>
						</div>
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

export default AddAccountModal;
