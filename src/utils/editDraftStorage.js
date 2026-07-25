const legacyKeyFor = (type, accountId) =>
	`jasm:${type}-edit-draft:${String(accountId || "")}`;

const createKeyFor = (type, accountId) =>
	`jasm:${type}-draft:create:${String(accountId || "")}`;

const editKeyFor = (type, accountId, entityId) =>
	`jasm:${type}-draft:edit:${String(accountId || "")}:${String(
		entityId || ""
	)}`;

function parseDraft(raw) {
	if (!raw) return null;
	try {
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

function readKey(key) {
	return parseDraft(window.localStorage.getItem(key));
}

function scopedKey(type, accountId, draft) {
	return draft?.isCreateDraft
		? createKeyFor(type, accountId)
		: editKeyFor(type, accountId, draft?._id);
}

function migrateLegacyDraft(type, accountId) {
	const legacyKey = legacyKeyFor(type, accountId);
	const legacyDraft = readKey(legacyKey);
	if (!legacyDraft) return;
	window.localStorage.setItem(
		scopedKey(type, accountId, legacyDraft),
		JSON.stringify(legacyDraft)
	);
	window.localStorage.removeItem(legacyKey);
}

/**
 * Read only the draft belonging to the action that opened the screen.
 * Add reads the create slot; Edit reads only that entity's edit slot.
 */
export function readEditDraft(type, accountId, options = {}) {
	if (!accountId || typeof window === "undefined") return null;
	migrateLegacyDraft(type, accountId);

	const mode = options.mode;
	const entityId = options.entityId ? String(options.entityId) : "";
	let draft = null;

	if (mode === "add") {
		draft = readKey(createKeyFor(type, accountId));
	} else if (mode === "edit" && entityId) {
		draft = readKey(editKeyFor(type, accountId, entityId));
	} else if (entityId) {
		draft = readKey(editKeyFor(type, accountId, entityId));
		if (!draft) {
			const createDraft = readKey(createKeyFor(type, accountId));
			if (createDraft?._id === entityId) draft = createDraft;
		}
	}

	return draft;
}

export function writeEditDraft(type, accountId, draft) {
	if (!accountId || !draft?._id || typeof window === "undefined") return;
	migrateLegacyDraft(type, accountId);
	const normalized = {
		_id: String(draft._id),
		name: draft.name || "Untitled",
		isCreateDraft: Boolean(draft.isCreateDraft),
		pendingEdits:
			draft.pendingEdits && typeof draft.pendingEdits === "object"
				? draft.pendingEdits
				: {},
		updatedAt: new Date().toISOString(),
	};
	window.localStorage.setItem(
		scopedKey(type, accountId, normalized),
		JSON.stringify(normalized)
	);
	window.localStorage.removeItem(legacyKeyFor(type, accountId));
}

export function clearEditDraft(type, accountId, options = {}) {
	if (!accountId || typeof window === "undefined") return;
	migrateLegacyDraft(type, accountId);

	const mode = options.mode;
	const entityId = options.entityId ? String(options.entityId) : "";
	if (mode === "add") {
		window.localStorage.removeItem(createKeyFor(type, accountId));
	} else if (mode === "edit" && entityId) {
		window.localStorage.removeItem(editKeyFor(type, accountId, entityId));
	} else if (entityId) {
		window.localStorage.removeItem(editKeyFor(type, accountId, entityId));
		const createDraft = readKey(createKeyFor(type, accountId));
		if (createDraft?._id === entityId) {
			window.localStorage.removeItem(createKeyFor(type, accountId));
		}
	}
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
