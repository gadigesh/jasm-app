import { API_BASE_URL } from "./apiConfig";

export function getUploadProgressLabel(phase, mode = "upload") {
	if (mode === "save") {
		switch (phase) {
			case "saving":
				return "Saving changes...";
			case "processing":
				return "Creating asset source...";
			case "complete":
				return "Complete";
			default:
				return "Saving copy matrix...";
		}
	}

	switch (phase) {
		case "uploading":
			return "Uploading file...";
		case "processing":
			return "Processing data...";
		case "complete":
			return "Complete";
		default:
			return "Preparing...";
	}
}

function createProgressTracker(onProgress, initialPhase = "processing") {
	let processingTimer = null;
	let currentPercent = 0;

	const setProgress = (percent, phase = initialPhase) => {
		currentPercent = Math.max(currentPercent, Math.min(100, percent));
		onProgress?.({ percent: currentPercent, phase });
	};

	const startProcessingAnimation = (from, cap = 92, phase = initialPhase) => {
		if (processingTimer) clearInterval(processingTimer);
		setProgress(from, phase);
		processingTimer = setInterval(() => {
			if (currentPercent < cap) {
				setProgress(currentPercent + 1, phase);
			}
		}, 350);
	};

	const cleanup = () => {
		if (processingTimer) {
			clearInterval(processingTimer);
			processingTimer = null;
		}
	};

	return { setProgress, startProcessingAnimation, cleanup, getCurrentPercent: () => currentPercent };
}

function parseXhrResponse(xhr, reject) {
	let data;
	try {
		data = JSON.parse(xhr.responseText || "{}");
	} catch {
		reject({
			data: {
				message:
					xhr.status >= 400
						? `Server error (${xhr.status}). Please try again.`
						: "Invalid server response",
			},
		});
		return null;
	}

	if (xhr.status >= 200 && xhr.status < 300) {
		return data;
	}

	reject({ status: xhr.status, data });
	return null;
}

export function submitJsonWithProgress({
	path,
	method = "POST",
	body,
	onProgress,
	phase = "processing",
}) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const { setProgress, startProcessingAnimation, cleanup } =
			createProgressTracker(onProgress, phase);

		xhr.addEventListener("load", () => {
			cleanup();
			setProgress(100, "complete");
			const data = parseXhrResponse(xhr, reject);
			if (data) resolve(data);
		});

		xhr.addEventListener("error", () => {
			cleanup();
			reject({ data: { message: "Network error while saving" } });
		});

		xhr.addEventListener("abort", () => {
			cleanup();
			reject({ data: { message: "Save cancelled" } });
		});

		xhr.open(method, `${API_BASE_URL}${path}`);
		xhr.withCredentials = true;
		xhr.setRequestHeader("Content-Type", "application/json");

		startProcessingAnimation(8, 92, phase);
		xhr.send(JSON.stringify(body ?? {}));
	});
}

export async function runJsonStepsWithProgress(steps, onProgress) {
	const total = steps.length;
	let lastResult = null;

	for (let i = 0; i < total; i++) {
		const stepStart = Math.round((i / total) * 100);
		const stepEnd = Math.round(((i + 1) / total) * 100);

		lastResult = await submitJsonWithProgress({
			...steps[i],
			onProgress: ({ percent, phase }) => {
				const mapped = Math.round(
					stepStart + (percent / 100) * (stepEnd - stepStart)
				);
				onProgress?.({ percent: mapped, phase });
			},
		});
	}

	onProgress?.({ percent: 100, phase: "complete" });
	return lastResult;
}

export function submitFormWithProgress({
	path,
	formData,
	onProgress,
	hasFile = false,
}) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const { setProgress, startProcessingAnimation, cleanup, getCurrentPercent } =
			createProgressTracker(onProgress, hasFile ? "uploading" : "processing");

		xhr.upload.addEventListener("progress", (event) => {
			if (!hasFile || !event.lengthComputable) return;
			const uploadPart = Math.round((event.loaded / event.total) * 75);
			setProgress(uploadPart, "uploading");
		});

		xhr.upload.addEventListener("loadend", () => {
			if (hasFile) {
				startProcessingAnimation(
					Math.max(getCurrentPercent(), 75),
					92,
					"processing"
				);
			}
		});

		xhr.addEventListener("load", () => {
			cleanup();
			setProgress(100, "complete");

			const data = parseXhrResponse(xhr, reject);
			if (data) resolve(data);
		});

		xhr.addEventListener("error", () => {
			cleanup();
			reject({ data: { message: "Network error during upload" } });
		});

		xhr.addEventListener("abort", () => {
			cleanup();
			reject({ data: { message: "Upload cancelled" } });
		});

		xhr.open("POST", `${API_BASE_URL}${path}`);
		xhr.withCredentials = true;

		if (!hasFile) {
			startProcessingAnimation(8, 92, "processing");
		}

		xhr.send(formData);
	});
}
