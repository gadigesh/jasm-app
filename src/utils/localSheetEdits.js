/**
 * Client-side sheet edits that stay in pendingEdits until Save.
 */

/** Support both API-flat rows and legacy `{ rowData }` rows. */
export function rowValues(row) {
	if (row?.rowData && typeof row.rowData === "object") {
		return row.rowData;
	}
	return row && typeof row === "object" ? row : {};
}

export function mergePendingIntoRows(serverRows = [], pendingEdits = {}) {
	return (serverRows || []).map((row) => {
		const edit = pendingEdits[row._id];
		if (!edit) return row;
		if (!row?.rowData || typeof row.rowData !== "object") {
			return { ...row, ...edit };
		}
		return {
			...row,
			rowData: {
				...(row.rowData || {}),
				...edit,
			},
		};
	});
}

export function selectTargetRows(rows = [], rowIds) {
	if (!Array.isArray(rowIds) || rowIds.length === 0) return rows;
	const wanted = new Set(rowIds.map(String));
	return rows.filter((row) => wanted.has(String(row._id)));
}

/** Apply per-row patches into a pendingEdits map. */
export function applyRowPatches(pendingEdits, patches) {
	const next = { ...(pendingEdits || {}) };
	for (const patch of patches || []) {
		const rowId = String(patch.rowId || patch._id || "");
		if (!rowId || !patch.rowData || typeof patch.rowData !== "object") {
			continue;
		}
		next[rowId] = {
			...next[rowId],
			...patch.rowData,
		};
	}
	return next;
}

export function cellText(value) {
	if (value == null) return "";
	return String(value)
		.replace(/\r\n/g, "\n")
		.replace(/[\r\n\u000b\u000c\u0085\u2028\u2029\t]+/g, " ")
		.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
		.replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
		.trim();
}

export function fillSequenceLocal(rows, column, rowIds) {
	const targets = selectTargetRows(rows, rowIds);
	return targets.map((row, index) => ({
		rowId: String(row._id),
		rowData: { [column]: String(index + 1) },
	}));
}

export function fillDateLocal(rows, column, dateValue, rowIds) {
	const value = cellText(dateValue);
	const targets = selectTargetRows(rows, rowIds);
	return targets.map((row) => ({
		rowId: String(row._id),
		rowData: { [column]: value },
	}));
}

export function fillColumnValueLocal(rows, column, value, rowIds) {
	const next = cellText(value);
	const targets = selectTargetRows(rows, rowIds);
	return targets.map((row) => ({
		rowId: String(row._id),
		rowData: { [column]: next },
	}));
}

/** Expand [Column] / [SN] template using row data. */
export function expandTemplate(template, rowData, sn) {
	return cellText(
		String(template || "").replace(/\[([^\[\]]+)\]/g, (_m, column) => {
			if (String(column).trim().toUpperCase() === "SN") {
				return String(sn);
			}
			return cellText(rowData?.[String(column).trim()]);
		})
	);
}

export function generateTextLocal(rows, targetColumn, template, rowIds) {
	const targets = selectTargetRows(rows, rowIds);
	return targets.map((row, index) => ({
		rowId: String(row._id),
		rowData: {
			[targetColumn]: expandTemplate(template, rowValues(row), index + 1),
		},
	}));
}

/**
 * Simple extract: use template if provided, else copy sourceColumn.
 * splitBy: take first segment when set.
 */
export function copyFromColumnLocal(
	rows,
	targetColumn,
	sourceColumn,
	template,
	splitBy,
	rowIds
) {
	const targets = selectTargetRows(rows, rowIds);
	const custom = cellText(template);
	return targets.map((row, index) => {
		const values = rowValues(row);
		let value = custom
			? expandTemplate(custom, values, index + 1)
			: cellText(values[sourceColumn]);
		if (splitBy) {
			const parts = String(value).split(String(splitBy));
			value = cellText(parts[0] ?? "");
		}
		return {
			rowId: String(row._id),
			rowData: { [targetColumn]: value },
		};
	});
}

export function replaceInColumnLocal(rows, column, findText, replaceText, rowIds) {
	const find = String(findText ?? "");
	const replacement = String(replaceText ?? "");
	const targets = selectTargetRows(rows, rowIds);
	const patches = [];
	for (const row of targets) {
		const current = cellText(rowValues(row)[column]);
		const matches =
			find === "" ? current === "" : current.includes(find);
		if (!matches) continue;
		const next =
			find === "" ? replacement : current.split(find).join(replacement);
		patches.push({
			rowId: String(row._id),
			rowData: { [column]: next },
		});
	}
	return patches;
}
