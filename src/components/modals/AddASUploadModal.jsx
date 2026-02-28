import React, { useState, useCallback } from "react";
import { useUploadAssetSourceMutation } from "../../store/services/assetUpload";
import ASUploadPage from "../common/ASUploadPage";
import { CloudUpload, Link as LinkIcon, Edit, Upload } from "lucide-react";
import { showSuccess, showError } from "../../utils/toastMsg";
import { useDropzone } from "react-dropzone";

const AddASUploadModal = ({ isOpen, onClose }) => {
	const [uploadAssetSource, { isLoading }] = useUploadAssetSourceMutation();
	const [activeTab, setActiveTab] = useState("file"); // 'file' or 'url'
	const [file, setFile] = useState(null);
	const [url, setUrl] = useState("");

	const onDrop = useCallback((acceptedFiles) => {
		if (acceptedFiles?.length) {
			setFile(acceptedFiles[0]);
			setActiveTab("file");
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
		accept: {
			"text/csv": [".csv"],
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				[".xlsx"],
			"application/vnd.ms-excel": [".xls"],
		},
		maxSize: 10 * 1024 * 1024, // 10MB
	});

	const handleSubmit = async () => {
		if (activeTab === "file" && !file) {
			showError("Please select a file to upload");
			return;
		}
		if (activeTab === "url" && !url) {
			showError("Please enter a valid URL");
			return;
		}

		const formData = new FormData();
		if (activeTab === "file") {
			formData.append("file", file);
		} else {
			formData.append("fileUrl", url);
		}

		try {
			await uploadAssetSource(formData).unwrap();
			showSuccess("Asset source uploaded successfully");
			handleClose();
		} catch (error) {
			showError(error?.data?.message || "Failed to upload asset source");
		}
	};

	const handleClose = () => {
		setFile(null);
		setUrl("");
		setActiveTab("file");
		onClose();
	};

	return (
		<ASUploadPage
			isOpen={isOpen}
			onClose={handleClose}
			onSubmit={handleSubmit}
			title="Asset source Upload"
			maxWidth="max-w-2xl"
		>
			<p className="text-gray-500 mb-4">Add your Asset source here.</p>

			{/* Drag & Drop Zone */}
			<div
				{...getRootProps()}
				className={`
					border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
					flex flex-col items-center justify-center gap-4 min-h-[200px]
					${
						isDragActive
							? "border-indigo-500 bg-indigo-50"
							: activeTab === "file" && file
								? "border-green-500 bg-green-50"
								: "border-indigo-200 hover:border-indigo-400 bg-white"
					}
				`}
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
							onClick={(e) => {
								e.stopPropagation();
								setFile(null);
							}}
							className="p-1 hover:bg-white rounded-full transition-colors"
						>
							<Edit
								size={16}
								className="text-gray-400 hover:text-red-500"
							/>
						</button>
					</div>
				) : (
					<>
						<div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
							<CloudUpload size={28} />
						</div>
						<div>
							<p className="text-gray-900 font-medium">
								Drag your file(s) or{" "}
								<span className="text-purple-600">browse</span>
							</p>
							<p className="text-gray-400 text-sm mt-1">
								Max 10 MB files are allowed
							</p>
						</div>
					</>
				)}
			</div>

			<p className="text-xs text-gray-400 mt-2 mb-6">
				Only support .excel, .csv
			</p>

			<div className="relative flex items-center gap-4 mb-6">
				<div className="h-px bg-gray-200 flex-1"></div>
				<span className="text-xs text-gray-400 uppercase">OR</span>
				<div className="h-px bg-gray-200 flex-1"></div>
			</div>

			{/* URL Input */}
			<div className="mb-6">
				<label className="block text-sm font-bold text-gray-900 mb-2">
					Upload from URL
				</label>
				<div className="relative py-5 text-sm font-bold text-gray-400 mb-2 flex items-center">
					<input
						type="url"
						value={url}
						onChange={(e) => {
							setUrl(e.target.value);
							setActiveTab("url");
							if (e.target.value) setFile(null);
						}}
						placeholder="https://sharefile.xyz/file.jpg"
						className="w-full px-4 py-3 pr-24 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
					/>
				</div>
				<button
					onClick={handleSubmit}
					disabled={isLoading || (!file && !url)}
					className="absolute right-8 p-8 py-2 bg-[#8B5CF6] text-white text-sm font-semibold rounded-lg hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isLoading ? "Uploading..." : "Upload"}
				</button>
				<button
					onClick={handleClose}
					className="absolute right-40 p-8 py-2 bg-[#8B5CF6] text-white text-sm font-semibold rounded-lg hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					Cancel
				</button>
			</div>
		</ASUploadPage>
	);
};

export default AddASUploadModal;
