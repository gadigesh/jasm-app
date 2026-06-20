import React, { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import api from "../../store/services/api";
import ASUploadPage from "../common/ASUploadPage";
import UploadProgressBar from "../common/UploadProgressBar";
import { CloudUpload, Edit } from "lucide-react";
import { showSuccess, showError } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { submitFormWithProgress } from "../../utils/uploadWithProgress";
import {
	formInputLgClass,
	modalCancelBtnClass,
} from "../../utils/formStyles";
import { useDropzone } from "react-dropzone";

const AddASUploadModal = ({ isOpen, onClose, accountId }) => {
	const dispatch = useDispatch();
	const [activeTab, setActiveTab] = useState("file");
	const [file, setFile] = useState(null);
	const [url, setUrl] = useState("");
	const [assetName, setAssetName] = useState("");
	const [uniqueColumn, setUniqueColumn] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadPhase, setUploadPhase] = useState("processing");

	const onDrop = useCallback((acceptedFiles) => {
		if (acceptedFiles?.length) {
			setFile(acceptedFiles[0]);
			setActiveTab("file");
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
		disabled: isSubmitting,
		accept: {
			"text/csv": [".csv"],
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				[".xlsx"],
			"application/vnd.ms-excel": [".xls"],
		},
		maxSize: 10 * 1024 * 1024,
	});

	const resetProgress = () => {
		setUploadProgress(0);
		setUploadPhase("processing");
	};

	const handleSubmit = async () => {
		if (isSubmitting) return;

		if (!assetName?.trim()) {
			showError("Please enter an asset source name");
			return;
		}
		if (!uniqueColumn.trim()) {
			showError("Please enter the unique column (primary key)");
			return;
		}
		if (activeTab === "file" && !file) {
			showError("Please select a file to upload");
			return;
		}
		if (activeTab === "url" && !url) {
			showError("Please enter a valid URL");
			return;
		}

		const formData = new FormData();
		formData.append("accountId", accountId);
		formData.append("assetName", assetName.trim());
		formData.append("uniqueColumn", uniqueColumn.trim());

		const isFileUpload = activeTab === "file";

		if (isFileUpload) {
			formData.append("inputType", "file");
			formData.append("file", file);
		} else {
			formData.append("inputType", "gsheet");
			formData.append("fileRef", url);
		}

		setIsSubmitting(true);
		resetProgress();

		try {
			const result = await submitFormWithProgress({
				path: "/upload",
				formData,
				hasFile: isFileUpload,
				onProgress: ({ percent, phase }) => {
					setUploadProgress(percent);
					setUploadPhase(phase);
				},
			});

			dispatch(api.util.invalidateTags(["AssetUploads"]));
			showSuccess(result?.message || "Upload completed successfully");
			handleClose();
		} catch (error) {
			showError(
				getApiErrorMessage(
					error,
					"Could not upload the asset source. Check your file and try again."
				)
			);
		} finally {
			setIsSubmitting(false);
			resetProgress();
		}
	};

	const handleClose = () => {
		if (isSubmitting) return;
		setFile(null);
		setUrl("");
		setAssetName("");
		setUniqueColumn("");
		setActiveTab("file");
		resetProgress();
		onClose();
	};

	return (
		<ASUploadPage
			isOpen={isOpen}
			onClose={handleClose}
			disableClose={isSubmitting}
			title="Asset source Upload"
			maxWidth="max-w-2xl"
		>
			<p className="text-gray-500 mb-4">Add your Asset source here.</p>

			<div className={isSubmitting ? "pointer-events-none select-none" : ""}>
			<div className="grid grid-cols-2 gap-4 mb-4">
				<div>
					<label className="block text-sm font-bold text-gray-900 mb-1">
						Asset Source Name{" "}
						<span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						value={assetName}
						onChange={(e) => setAssetName(e.target.value)}
						placeholder="e.g. Summer Campaign"
						autoComplete="new-password"
						className={formInputLgClass}
					/>
				</div>
				<div>
					<label className="block text-sm font-bold text-gray-900 mb-1">
						Unique Column <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						value={uniqueColumn}
						onChange={(e) => setUniqueColumn(e.target.value)}
						placeholder="e.g. SKU or product_id"
						autoComplete="new-password"
						className={formInputLgClass}
					/>
				</div>
			</div>

			<div
				{...getRootProps()}
				className={`
					border-2 border-dashed rounded-lg p-8 text-center transition-colors
					flex flex-col items-center justify-center gap-4 min-h-[200px]
					${isSubmitting ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
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
							type="button"
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

			<p className="text-xs text-gray-400 mt-2 mb-2">
				Only support .excel, .csv
			</p>

			<div className="relative flex items-center gap-4 mb-6">
				<div className="h-px bg-gray-200 flex-1"></div>
				<span className="text-xs text-gray-400 uppercase">OR</span>
				<div className="h-px bg-gray-200 flex-1"></div>
			</div>

			<div className="mb-4">
				<label className="block text-sm font-bold text-gray-900 mb-2">
					Upload from URL
				</label>
				<input
					type="url"
					value={url}
					onChange={(e) => {
						setUrl(e.target.value);
						setActiveTab("url");
						if (e.target.value) setFile(null);
					}}
					placeholder="https://docs.google.com/spreadsheets/d/..."
					className={formInputLgClass}
				/>
			</div>

			<UploadProgressBar
				visible={isSubmitting}
				percent={uploadProgress}
				phase={uploadPhase}
			/>
			</div>

			<div className="flex justify-end gap-3 mt-4">
				<button
					type="button"
					onClick={handleClose}
					disabled={isSubmitting}
					className={`${modalCancelBtnClass} disabled:opacity-40 disabled:cursor-not-allowed`}
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={isSubmitting || (!file && !url)}
					className="px-6 py-2 bg-[#8B5CF6] text-white text-sm font-semibold rounded-lg hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isSubmitting ? "Uploading..." : "Upload"}
				</button>
			</div>
		</ASUploadPage>
	);
};

export default AddASUploadModal;
