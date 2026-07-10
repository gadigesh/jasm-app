import React, { useEffect, useState } from "react";
import { Copy, X } from "lucide-react";
import ValidatedNameInput from "../common/ValidatedNameInput";
import { modalCancelBtnClass } from "../../utils/formStyles";

const CloneNameModal = ({
	isOpen,
	onClose,
	onConfirm,
	title = "Clone",
	description = "Enter a name for the cloned item.",
	defaultName = "",
	accountId,
	nameType = "assetSource",
	isLoading = false,
}) => {
	const [name, setName] = useState("");
	const [nameValidation, setNameValidation] = useState({
		isDuplicate: false,
		isChecking: false,
	});

	useEffect(() => {
		if (!isOpen) return;
		setName(defaultName);
		setNameValidation({ isDuplicate: false, isChecking: false });
	}, [isOpen, defaultName]);

	if (!isOpen) return null;

	const canSubmit =
		name.trim().length > 0 &&
		!nameValidation.isDuplicate &&
		!nameValidation.isChecking &&
		!isLoading;

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!canSubmit) return;
		onConfirm(name.trim());
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
						<Copy size={20} />
					</div>
					<div className="flex-1 pr-6">
						<h3 className="text-lg font-bold text-gray-900">{title}</h3>
						<p className="text-sm text-gray-500 mt-1">{description}</p>
					</div>
				</div>

				<form onSubmit={handleSubmit}>
					<ValidatedNameInput
						label="Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Enter new name"
						accountId={accountId}
						type={nameType}
						required
						onValidationChange={setNameValidation}
					/>

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
							className="px-5 py-2 bg-[#7C3AED] text-white text-sm font-semibold rounded-lg hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Cloning..." : "Clone"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default CloneNameModal;
