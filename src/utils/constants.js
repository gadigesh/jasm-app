export const timeAgo = (date) => {
	const diff = Date.now() - new Date(date).getTime();
	const sec = Math.floor(diff / 1000);
	const min = Math.floor(sec / 60);
	const hr = Math.floor(min / 60);
	const day = Math.floor(hr / 24);

	if (sec < 60) return "just now";
	if (min < 60) return `${min} min ago`;
	if (hr < 24) return `${hr} hr ago`;
	return `${day} day${day > 1 ? "s" : ""} ago`;
};

export const AUTO_ROW_ID_COLUMN = "Row ID";

export function formatListDate(date) {
	if (!date) return "—";
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return "—";

	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	let hours = d.getHours();
	const ampm = hours >= 12 ? "PM" : "AM";
	hours = hours % 12 || 12;
	const min = String(d.getMinutes()).padStart(2, "0");

	return `${yyyy}-${mm}-${dd} ${String(hours).padStart(2, "0")}:${min} ${ampm}`;
}

// src/utils/constants.jsx
export const asListTableHeaders = [
	{
		key: "name",
		label: "Asset Source Name",
		align: "left",
	},
	{ key: "mappedCm", label: "Mapped CM", align: "center" },
	{
		key: "updatedAt",
		label: "Last updated",
		align: "center",
	},
	{
		key: "updatedBy",
		label: "Updated by",
		align: "center",
	},
	{
		key: "status",
		label: "Status",
		align: "center",
	},
];

export const copyMatrixListHeaders = [
	{ key: "name", label: "Copy Matrix Name", align: "left" },
	{ key: "mappedAs", label: "Mapped AS", align: "center" },
	{ key: "updatedAt", label: "Last updated", align: "center" },
	{ key: "createdBy", label: "Updated by", align: "center" },
	{ key: "status", label: "Status", align: "center" },
];

import {
	FileSpreadsheet,
	ShoppingBag,
	Hand,
	UserCog,
	ShoppingCart,
	Target,
	Share2,
	Settings,
	ArrowRight,
	User,
} from "lucide-react";

export const ICON_MAP = {
	FileSpreadsheet,
	ShoppingBag,
	Hand,
	UserCog,
	ShoppingCart,
	Target,
	Share2,
	Settings,
	ArrowRight,
	User
};

export const NAVIGATION_META = {
	dashboard: {
		label: "Dashboard",
		path: "/dashboard",
	},
	copy_matrix: {
		label: "Copy Matrix",
		path: "/copy-matrix",
	},
	asset_source: {
		label: "Asset Sources",
		path: "/asset-sources",
	},
};






