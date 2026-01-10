//export const BASE_URL = "https://jasm-app-sever.onrender.com";

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

// src/utils/constants.jsx
export const asListTableHeaders = [
	{
		key: "name",
		label: "Name",
	},
	{
		key: "updatedAt",
		label: "Last updated",
	},
	{
		key: "updatedBy",
		label: "Updated by",
	},
	{
		key: "status",
		label: "Status"
	}
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
	asset_source: {
		label: "Asset Source",
		path: "/asset-sources/create",
	},
	asset_source_template: {
		label: "Asset Source Template",
		path: "/asset-sources/templates",
	},
};






