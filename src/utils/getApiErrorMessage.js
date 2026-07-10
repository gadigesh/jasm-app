import { DUPLICATE_NAME_ERROR } from "./formStyles";

const GENERIC_API_MESSAGES = new Set([
	"Processing failed",
	"Preview failed",
	"File upload failed",
	"Failed to fetch Google Sheet tabs",
	"Failed to parse copy matrix",
	"Failed to upload asset source",
	"Failed to save copy matrix",
	"Failed to save asset source",
	"Failed to update rows",
	"Failed to update asset source",
	"Failed to save changes",
	"Something went wrong",
	"Invalid server response",
	"Network error during upload",
	"Could not save the copy matrix.",
]);

function collectErrorCandidates(error) {
	const payload = error?.data ?? error;
	const candidates = [];

	const push = (value) => {
		if (value == null) return;
		const text = String(value).trim();
		if (text) candidates.push(text);
	};

	push(error?.error);
	push(typeof payload === "string" ? payload : null);
	push(payload?.message);
	push(payload?.reason);
	push(payload?.error);
	push(payload?.details);
	push(payload?.detail);

	if (Array.isArray(payload?.errors)) {
		for (const item of payload.errors) {
			push(item?.message || item);
		}
	}

	push(error?.message);

	return candidates;
}

export function getApiErrorMessage(error, fallback = "Something went wrong") {
	if (!error) return fallback;

	const candidates = collectErrorCandidates(error);

	for (const candidate of candidates) {
		if (!GENERIC_API_MESSAGES.has(candidate)) {
			return candidate;
		}
	}

	if (error?.status === 409) {
		return DUPLICATE_NAME_ERROR;
	}

	if (candidates.length > 0) {
		return candidates[0];
	}

	return fallback;
}
