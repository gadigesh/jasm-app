const GENERIC_API_MESSAGES = new Set([
	"Processing failed",
	"Preview failed",
	"File upload failed",
	"Failed to fetch Google Sheet tabs",
	"Failed to parse copy matrix",
	"Failed to upload asset source",
	"Failed to save copy matrix",
	"Failed to save asset source",
	"Something went wrong",
	"Invalid server response",
	"Network error during upload",
]);

export function getApiErrorMessage(error, fallback = "Something went wrong") {
	if (!error) return fallback;

	const payload = error?.data ?? error;

	if (typeof payload === "string" && payload.trim()) {
		return payload.trim();
	}

	const detail =
		payload?.error ||
		payload?.details ||
		payload?.detail ||
		(Array.isArray(payload?.errors) &&
			(payload.errors[0]?.message || payload.errors[0]));

	const message = payload?.message;

	if (message && detail && GENERIC_API_MESSAGES.has(message)) {
		return String(detail);
	}

	if (message && !GENERIC_API_MESSAGES.has(message)) {
		return String(message);
	}

	if (detail) return String(detail);
	if (message) return String(message);

	return fallback;
}
