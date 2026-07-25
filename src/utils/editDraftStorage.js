const keyFor = (type, accountId) =>
	`jasm:${type}-edit-draft:${String(accountId || "")}`;

export function readEditDraft(type, accountId) {
	if (!accountId || typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(keyFor(type, accountId));
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed?._id) return null;
		return {
			_id: String(parsed._id),
			name: parsed.name || "Untitled",
			isCreateDraft: Boolean(parsed.isCreateDraft),
			pendingEdits:
				parsed.pendingEdits && typeof parsed.pendingEdits === "object"
					? parsed.pendingEdits
					: {},
			updatedAt: parsed.updatedAt || null,
		};
	} catch {
		return null;
	}
}

export function writeEditDraft(type, accountId, draft) {
	if (!accountId || !draft?._id || typeof window === "undefined") return;
	window.localStorage.setItem(
		keyFor(type, accountId),
		JSON.stringify({
			_id: String(draft._id),
			name: draft.name || "Untitled",
			isCreateDraft: Boolean(draft.isCreateDraft),
			pendingEdits:
				draft.pendingEdits && typeof draft.pendingEdits === "object"
					? draft.pendingEdits
					: {},
			updatedAt: new Date().toISOString(),
		})
	);
}

export function clearEditDraft(type, accountId) {
	if (!accountId || typeof window === "undefined") return;
	window.localStorage.removeItem(keyFor(type, accountId));
}

/** Merge active cell edit into a plain pendingEdits map (no API flush). */
export function capturePendingEditsMap(pendingEditsRef, tableRef) {
	const flushed = tableRef?.current?.flushActiveEdit?.();
	const merged = { ...(pendingEditsRef?.current || {}) };
	if (flushed?.rowId) {
		merged[flushed.rowId] = {
			...merged[flushed.rowId],
			...flushed.rowData,
		};
	}
	return merged;
}
