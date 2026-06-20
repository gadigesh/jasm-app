import React from "react";
import { getUploadProgressLabel } from "../../utils/uploadWithProgress";

const UploadProgressBar = ({
	percent = 0,
	phase = "processing",
	visible = false,
	mode = "upload",
	helperText,
}) => {
	if (!visible) return null;

	const message =
		helperText ||
		(mode === "save"
			? "Please wait while we save your copy matrix."
			: "Please wait while we upload and process your file.");

	return (
		<div
			className="mt-4 mb-2"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(percent)}
			aria-label={getUploadProgressLabel(phase, mode)}
		>
			<div className="flex justify-between text-xs text-gray-600 mb-1.5">
				<span>{getUploadProgressLabel(phase, mode)}</span>
				<span>{Math.round(percent)}%</span>
			</div>
			<div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
				<div
					className="h-full bg-[#B600C9] transition-all duration-300 ease-out rounded-full"
					style={{ width: `${percent}%` }}
				/>
			</div>
			<p className="text-xs text-gray-400 mt-1.5">{message}</p>
		</div>
	);
};

export default UploadProgressBar;
