import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePreviewCopyMatrixMutation } from "../../store/services/copyMatrix";
import ASUploadPage from "../common/ASUploadPage";
import { CloudUpload, Edit } from "lucide-react";
import { showError } from "../../utils/toastMsg";
import { useDropzone } from "react-dropzone";

const AddCopyMatrixUploadModal = ({ isOpen, onClose, accountId }) => {
	const navigate = useNavigate();
	const [previewCopyMatrix, { isLoading }] = usePreviewCopyMatrixMutation();
	const [activeTab, setActiveTab] = useState("file");
	const [file, setFile] = useState(null);
	const [url, setUrl] = useState("");

	const onDrop = useCallback((acceptedFiles) => {
		if (acceptedFiles?.length) {
			setFile(acceptedFiles[0]);
			setActiveTab("file");
			setUrl("");
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
		accept: {
			"text/csv": [".csv"],
			"text/plain": [".txt"],
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				[".xlsx"],
			"application/vnd.ms-excel": [".xls"],
		},
		maxSize: 10 * 1024 * 1024,
	});

	const canProceed =
		(activeTab === "file" && file) || (activeTab === "url" && url.trim());

	const handleClose = () => {
		setFile(null);
		setUrl("");
		setActiveTab("file");
		onClose();
	};

	const handleNext = async () => {
		if (!canProceed) return;

		const formData = new FormData();
		formData.append("accountId", accountId);

		if (activeTab === "file") {
			formData.append("inputType", "file");
			formData.append("file", file);
		} else {
			formData.append("inputType", "gsheet");
			formData.append("fileRef", url.trim());
		}

		try {
			const result = await previewCopyMatrix(formData).unwrap();
			handleClose();
			navigate(`/copy-matrix/${result.data.copyMatrixId}/preview`);
		} catch (error) {
			showError(
				error?.data?.message ||
					error?.data?.error ||
					"Failed to parse copy matrix"
			);
		}
	};

	return (
		<ASUploadPage
			isOpen={isOpen}
			onClose={handleClose}
			title="Upload your Copy Matrix here."
			maxWidth="max-w-2xl"
		>
			<div className="mb-4">
				<label className="block text-sm font-bold text-gray-900 mb-2">
					Google Sheet URL
				</label>
				<input
					type="text"
					value={url}
					onChange={(e) => {
						setUrl(e.target.value);
						setActiveTab("url");
						if (e.target.value) setFile(null);
					}}
					placeholder="https://docs.google.com/spreadsheets/d/..."
					className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
				/>
			</div>

			<div className="relative flex items-center gap-4 my-6">
				<div className="h-px bg-gray-200 flex-1" />
				<span className="text-xs text-gray-400 uppercase">OR</span>
				<div className="h-px bg-gray-200 flex-1" />
			</div>

			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-4 min-h-[220px] ${
					isDragActive
						? "border-[#B600C9] bg-purple-50"
						: activeTab === "file" && file
						? "border-green-500 bg-green-50"
						: "border-gray-200 hover:border-[#B600C9] bg-white"
				}`}
			>
				<input {...getInputProps()} />

				{activeTab === "file" && file ? (
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
							<CloudUpload size={24} />
						</div>
						<div className="text-left">
							<p className="font-medium text-gray-900 truncate max-w-[300px]">
								{file.name}
							</p>
							<p className="text-sm text-gray-500">
								{(file.size / 1024).toFixed(2)} KB
							</p>
						</div>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setFile(null);
							}}
							className="p-1 hover:bg-white rounded-full"
						>
							<Edit
								size={16}
								className="text-gray-400 hover:text-red-500"
							/>
						</button>
					</div>
				) : (
					<>
						<div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-[#B600C9]">
							<CloudUpload size={32} />
						</div>
						<div>
							<p className="text-gray-900 font-medium">
								Drag and drop file here
							</p>
							<p className="text-gray-500 text-sm mt-1">
								you can also pick from your computer
							</p>
						</div>
					</>
				)}
			</div>

			<p className="text-xs text-gray-400 mt-3 mb-6">
				CSV, XLS, XLSX, and TXT files are supported
			</p>

			<div className="flex justify-end gap-3">
				<button
					type="button"
					onClick={handleClose}
					className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={handleNext}
					disabled={isLoading || !canProceed}
					className="px-6 py-2 bg-[#B600C9] text-white text-sm font-semibold rounded-lg hover:bg-[#9a00ab] disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{isLoading ? "Processing..." : "Next"}
				</button>
			</div>
		</ASUploadPage>
	);
};

export default AddCopyMatrixUploadModal;
