import React from "react";
import { getUploadProgressLabel } from "../../utils/uploadWithProgress";

const OperationProgressOverlay = ({
	visible = false,
	percent = 0,
	phase = "processing",
	mode = "upload",
	title = "Please wait",
	helperText,
}) => {
	if (!visible) return null;

	const message =
		helperText ||
		(mode === "save"
			? "Please wait while we save your copy matrix and sync the asset source."
			: "Please wait while we upload and process your file.");

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
			<div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4">
				<h3 className="text-base font-semibold text-gray-900 mb-4">
					{title}
				</h3>
				<div
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
					<p className="text-xs text-gray-400 mt-3">{message}</p>
				</div>
			</div>
		</div>
	);
};

export default OperationProgressOverlay;
