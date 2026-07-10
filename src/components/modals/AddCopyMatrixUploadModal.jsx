import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useGetGsheetTabsMutation } from "../../store/services/copyMatrix";
import api from "../../store/services/api";
import ASUploadPage from "../common/ASUploadPage";
import UploadProgressBar from "../common/UploadProgressBar";
import { CloudUpload, Edit } from "lucide-react";
import { showError } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { submitFormWithProgress } from "../../utils/uploadWithProgress";
import {
	formInputLgClass,
	formSelectClass,
	modalCancelBtnClass,
} from "../../utils/formStyles";
import { useDropzone } from "react-dropzone";

const AddCopyMatrixUploadModal = ({ isOpen, onClose, accountId }) => {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const [getGsheetTabs, { isLoading: isLoadingTabs }] =
		useGetGsheetTabsMutation();
	const [activeTab, setActiveTab] = useState("file");
	const [file, setFile] = useState(null);
	const [url, setUrl] = useState("");
	const [sheetTabs, setSheetTabs] = useState([]);
	const [selectedSheetGid, setSelectedSheetGid] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadPhase, setUploadPhase] = useState("processing");

	const onDrop = useCallback((acceptedFiles) => {
		if (acceptedFiles?.length) {
			setFile(acceptedFiles[0]);
			setActiveTab("file");
			setUrl("");
			setSheetTabs([]);
			setSelectedSheetGid("");
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
		disabled: isSubmitting,
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
		(activeTab === "file" && file) ||
		(activeTab === "url" && url.trim() && selectedSheetGid !== "");

	const resetProgress = () => {
		setUploadProgress(0);
		setUploadPhase("processing");
	};

	const loadSheetTabs = async (sheetUrl) => {
		const trimmed = sheetUrl.trim();
		if (!trimmed) {
			setSheetTabs([]);
			setSelectedSheetGid("");
			return;
		}

		try {
			const data = await getGsheetTabs(trimmed).unwrap();
			const tabs = data?.sheets || [];
			setSheetTabs(tabs);

			const defaultGid =
				data?.defaultGid != null
					? String(data.defaultGid)
					: tabs[0]
					? String(tabs[0].sheetId)
					: "";

			const hasDefault = tabs.some(
				(tab) => String(tab.sheetId) === defaultGid
			);
			setSelectedSheetGid(
				hasDefault ? defaultGid : tabs[0] ? String(tabs[0].sheetId) : ""
			);
		} catch (error) {
			setSheetTabs([]);
			setSelectedSheetGid("");
			showError(
				getApiErrorMessage(
					error,
					"Could not load Google Sheet tabs. Check the URL and try again."
				)
			);
		}
	};

	const handleClose = () => {
		if (isSubmitting) return;
		setFile(null);
		setUrl("");
		setActiveTab("file");
		setSheetTabs([]);
		setSelectedSheetGid("");
		resetProgress();
		onClose();
	};

	const handleNext = async () => {
		if (!canProceed || isSubmitting) return;

		const formData = new FormData();
		formData.append("accountId", accountId);

		const isFileUpload = activeTab === "file";

		if (isFileUpload) {
			formData.append("inputType", "file");
			formData.append("file", file);
		} else {
			formData.append("inputType", "gsheet");
			formData.append("fileRef", url.trim());
			formData.append("sheetGid", selectedSheetGid);
		}

		setIsSubmitting(true);
		resetProgress();

		try {
			const result = await submitFormWithProgress({
				path: "/copy-matrix/preview",
				formData,
				hasFile: isFileUpload,
				onProgress: ({ percent, phase }) => {
					setUploadProgress(percent);
					setUploadPhase(phase);
				},
			});

			dispatch(api.util.invalidateTags(["CopyMatrices"]));
			handleClose();
			navigate(`/copy-matrix/${result.data.copyMatrixId}/preview`);
		} catch (error) {
			showError(
				getApiErrorMessage(
					error,
					"Could not parse the copy matrix. Check your file and try again."
				)
			);
		} finally {
			setIsSubmitting(false);
			resetProgress();
		}
	};

	return (
		<ASUploadPage
			isOpen={isOpen}
			onClose={handleClose}
			disableClose={isSubmitting}
			title="Upload your Copy Matrix here."
			maxWidth="max-w-2xl"
		>
			<div className={isSubmitting ? "pointer-events-none select-none" : ""}>
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
					onBlur={(e) => loadSheetTabs(e.target.value)}
					placeholder="https://docs.google.com/spreadsheets/d/..."
					className={formInputLgClass}
				/>
				{activeTab === "url" && url.trim() && (
					<div className="mt-3">
						<label className="block text-sm font-semibold text-gray-700 mb-1">
							Sheet tab
						</label>
						{isLoadingTabs ? (
							<p className="text-sm text-gray-500">Loading tabs...</p>
						) : sheetTabs.length > 0 ? (
							<select
								value={selectedSheetGid}
								onChange={(e) =>
									setSelectedSheetGid(e.target.value)
								}
								className={formSelectClass}
							>
								{sheetTabs.map((tab) => (
									<option
										key={tab.sheetId}
										value={String(tab.sheetId)}
									>
										{tab.title} ({tab.rowCount} rows)
									</option>
								))}
							</select>
						) : (
							<p className="text-sm text-gray-500">
								Click outside the URL field to load tabs
							</p>
						)}
					</div>
				)}
			</div>

			<div className="relative flex items-center gap-4 my-6">
				<div className="h-px bg-gray-200 flex-1" />
				<span className="text-xs text-gray-400 uppercase">OR</span>
				<div className="h-px bg-gray-200 flex-1" />
			</div>

			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors flex flex-col items-center justify-center gap-4 min-h-[220px] ${
					isSubmitting
						? "cursor-not-allowed opacity-60 border-gray-200 bg-gray-50"
						: "cursor-pointer"
				} ${
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

			<p className="text-xs text-gray-400 mt-3 mb-2">
				CSV, XLS, XLSX, and TXT files are supported
			</p>

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
					onClick={handleNext}
					disabled={isSubmitting || !canProceed}
					className="px-6 py-2 bg-[#B600C9] text-white text-sm font-semibold rounded-lg hover:bg-[#9a00ab] disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{isSubmitting ? "Processing..." : "Next"}
				</button>
			</div>
		</ASUploadPage>
	);
};

export default AddCopyMatrixUploadModal;
