export function isFinalizedCopyMatrix(status) {
	return ["completed", "partial_success", "Active"].includes(status);
}

export function isCopyMatrixRecreateMode(matrix) {
	if (!matrix) return false;
	if (typeof matrix.canRecreateAssetSource === "boolean") {
		return matrix.canRecreateAssetSource;
	}
	if (matrix.assetUploadId) return false;

	const status = matrix.rawStatus || matrix.status;
	return isFinalizedCopyMatrix(status);
}

/** True when this copy matrix has one or more linked asset sources. */
export function isCopyMatrixSynced(matrix) {
	if (!matrix) return false;
	if (matrix.assetUploadId) return true;
	if ((matrix.mappedAssetSources?.length ?? 0) > 0) return true;
	if (matrix.mappedAssetSource?.id) return true;
	return false;
}

export const DELETED_ASSET_SOURCE_NAME_MESSAGE =
	"This name was used by a deleted asset source. Please choose a different name.";

export function namesMatch(a, b) {
	if (!a || !b) return false;
	return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export function normalizeDeletedAssetSourceNames(deletedNames) {
	const values = Array.isArray(deletedNames)
		? deletedNames
		: deletedNames
		? [deletedNames]
		: [];

	const seen = new Set();
	const normalized = [];

	for (const value of values) {
		const trimmed = String(value || "").trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		normalized.push(trimmed);
	}

	return normalized;
}

export function getDeletedAssetSourceNames(source) {
	if (!source) return [];

	const names = normalizeDeletedAssetSourceNames(
		source.deletedAssetSourceNames
	);

	const legacy = String(source.lastDeletedAssetSourceName || "").trim();
	if (legacy && !names.some((name) => namesMatch(name, legacy))) {
		names.push(legacy);
	}

	return names;
}

export function isDeletedAssetSourceName(name, deletedNames) {
	const blocked = normalizeDeletedAssetSourceNames(deletedNames);
	return blocked.some((blockedName) => namesMatch(name, blockedName));
}

/** Build upload id → copy matrix entries from copy matrix list data. */
export function buildMappedCopyMatrixByUploadId(matrices = []) {
	const map = new Map();

	for (const matrix of matrices) {
		if (!matrix?._id) continue;

		const info = {
			id: matrix._id,
			name: matrix.name,
			status: matrix.rawStatus || matrix.status,
		};

		for (const source of matrix.mappedAssetSources || []) {
			const uploadId = source?.id ? String(source.id) : "";
			if (!uploadId) continue;

			if (!map.has(uploadId)) {
				map.set(uploadId, []);
			}

			const list = map.get(uploadId);
			if (!list.some((entry) => String(entry.id) === String(matrix._id))) {
				list.push(info);
			}
		}
	}

	return map;
}

export function mergeMappedCopyMatrices(uploadId, apiMatrices = [], fromCopyMatrixList) {
	const merged = [];
	const seen = new Set();

	const add = (matrix) => {
		if (!matrix?.id || !matrix?.name) return;
		const key = String(matrix.id);
		if (seen.has(key)) return;
		seen.add(key);
		merged.push(matrix);
	};

	for (const matrix of fromCopyMatrixList?.get(String(uploadId)) || []) {
		add(matrix);
	}

	for (const matrix of apiMatrices || []) {
		add(matrix);
	}

	return merged;
}

/** Edit Sheet always opens copy matrix preview. */
export function resolveCopyMatrixEditPath(matrix) {
	if (!matrix?._id) return null;
	return `/copy-matrix/${matrix._id}/preview`;
}
