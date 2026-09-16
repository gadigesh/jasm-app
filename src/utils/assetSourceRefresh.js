export const AS_REFRESH_STORAGE_PREFIX = "jasm:asset-source-refresh:";

export function readAssetSourceRefreshReview(id) {
	if (typeof window === "undefined" || !id) return null;
	try {
		const raw = window.sessionStorage.getItem(
			`${AS_REFRESH_STORAGE_PREFIX}${id}`
		);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function writeAssetSourceRefreshReview(id, review) {
	if (typeof window === "undefined" || !id) return;
	try {
		window.sessionStorage.setItem(
			`${AS_REFRESH_STORAGE_PREFIX}${id}`,
			JSON.stringify(review || {})
		);
	} catch {
		// Ignore storage quota failures.
	}
}

export function openAssetSourceRefreshReview(navigate, id, review) {
	writeAssetSourceRefreshReview(id, review);
	navigate(`/asset-sources/${id}/refresh`, { state: { review } });
}

export function clearAssetSourceRefreshReview(id) {
	if (typeof window === "undefined" || !id) return;
	try {
		window.sessionStorage.removeItem(`${AS_REFRESH_STORAGE_PREFIX}${id}`);
	} catch {
		// Ignore storage cleanup failures.
	}
}
