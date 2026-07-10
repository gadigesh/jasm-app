import { useEffect, useState } from "react";
import { API_BASE_URL } from "../utils/apiConfig";
import { DUPLICATE_NAME_ERROR } from "../utils/formStyles";

export function useDuplicateNameCheck({
	accountId,
	name,
	type = "assetSource",
	excludeId = null,
	excludeUploadId = null,
	enabled = true,
	debounceMs = 400,
}) {
	const [error, setError] = useState("");
	const [isChecking, setIsChecking] = useState(false);

	useEffect(() => {
		if (!enabled || !accountId) {
			setError("");
			setIsChecking(false);
			return;
		}

		const trimmed = String(name || "").trim();
		if (!trimmed) {
			setError("");
			setIsChecking(false);
			return;
		}

		let cancelled = false;
		const timer = setTimeout(async () => {
			setIsChecking(true);
			try {
				const params = new URLSearchParams({
					name: trimmed,
				});
				if (excludeId) params.set("excludeId", String(excludeId));
				if (excludeUploadId) {
					params.set("excludeUploadId", String(excludeUploadId));
				}

				const path =
					type === "copyMatrix"
						? `/copy-matrix/check-name/${accountId}?${params}`
						: `/source/check-name/${accountId}?${params}`;

				const response = await fetch(`${API_BASE_URL}${path}`, {
					credentials: "include",
				});
				const payload = await response.json();

				if (cancelled) return;

				if (!response.ok) {
					setError("");
					return;
				}

				setError(
					payload?.data?.available
						? ""
						: payload?.data?.message ||
								payload?.message ||
								DUPLICATE_NAME_ERROR
				);
			} catch {
				if (!cancelled) setError("");
			} finally {
				if (!cancelled) setIsChecking(false);
			}
		}, debounceMs);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [
		accountId,
		name,
		type,
		excludeId,
		excludeUploadId,
		enabled,
		debounceMs,
	]);

	return {
		error,
		isChecking,
		isDuplicate: Boolean(error),
	};
}
