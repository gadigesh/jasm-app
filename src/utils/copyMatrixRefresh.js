export const REFRESH_STORAGE_PREFIX = "jasm:copy-matrix-refresh:";

export function readRefreshReview(id) {
	if (typeof window === "undefined" || !id) return null;
	try {
		const raw = window.sessionStorage.getItem(
			`${REFRESH_STORAGE_PREFIX}${id}`
		);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function writeRefreshReview(id, review) {
	if (typeof window === "undefined" || !id) return;
	try {
		window.sessionStorage.setItem(
			`${REFRESH_STORAGE_PREFIX}${id}`,
			JSON.stringify(review || {})
		);
	} catch {
		// Ignore storage quota failures.
	}
}

export function openRefreshReview(navigate, id, review) {
	writeRefreshReview(id, review);
	navigate(`/copy-matrix/${id}/refresh`, { state: { review } });
}

export function clearRefreshReview(id) {
	if (typeof window === "undefined" || !id) return;
	try {
		window.sessionStorage.removeItem(`${REFRESH_STORAGE_PREFIX}${id}`);
	} catch {
		// Ignore storage cleanup failures.
	}
}
