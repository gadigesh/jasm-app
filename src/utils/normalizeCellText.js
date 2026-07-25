/**
 * Normalize sheet cell text so view + edit stay in sync (CM + AS).
 * - Trims leading/trailing spaces only (keeps intentional spaces in the middle)
 * - Converts newlines/tabs/unicode spaces so <input> matches what the grid shows
 */
export function normalizeCellText(value) {
	if (value == null) return "";
	return (
		String(value)
			// Unify line breaks / tabs to a single space
			.replace(/\r\n/g, "\n")
			.replace(/[\r\n\u000b\u000c\u0085\u2028\u2029\t]+/g, " ")
			// Unicode spaces → regular space
			.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
			// Remove zero-width chars
			.replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
			// Strip only leading/trailing spaces — keep user spaces in the middle
			.trim()
	);
}

export function normalizeRowDataValues(rowData = {}) {
	const next = {};
	for (const [key, value] of Object.entries(rowData)) {
		next[key] =
			typeof value === "string" || value == null
				? normalizeCellText(value)
				: value;
	}
	return next;
}
