export function formatColumnStructureMessage(payload = {}) {
	const deleted = Array.isArray(payload.deletedColumns)
		? payload.deletedColumns.filter(Boolean)
		: [];
	const edited = Array.isArray(payload.editedColumns)
		? payload.editedColumns
		: [];
	const parts = [];

	if (deleted.length) {
		parts.push(`Deleted columns: ${deleted.join(", ")}`);
	}
	if (edited.length) {
		const labels = edited
			.map((item) => {
				if (typeof item === "string") return item;
				if (item?.updatedName && item.updatedName !== item.column) {
					return `${item.column} → ${item.updatedName}`;
				}
				return item?.column || "";
			})
			.filter(Boolean);
		if (labels.length) {
			parts.push(`Edited columns: ${labels.join(", ")}`);
		}
	}

	return parts.join(". ") || String(payload.message || "").trim();
}

export function isGoogleSheetMatrix(row) {
	return row?.inputType === "gsheet" || row?.fileType === "GSheet";
}
