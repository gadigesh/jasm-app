import { useLocation } from "react-router-dom";

export const useBreadCrumbs = () => {
	const location = useLocation();

	// 1. Split the URL and filter out empty segments
	const pathnames = location.pathname.split("/").filter((x) => x);

	// 2. Build the breadcrumbs array
	const crumbs = [];

	let currentPath = "";
	let skipNext = false;

	pathnames.forEach((value) => {
		currentPath += `/${value}`;
		// Filtering logic: Skip 'templates' and the segment immediately following it
		if (value === "templates" || value === "dashboard") {
			skipNext = true;
			return;
		}

		if (skipNext) {
			skipNext = false;
			return;
		}

		// Map segment to label using breadcrumbLabels or format it (e.g., "asset-source" -> "Asset Source")
		const label = value.replace(/-/g, " ");

		crumbs.push({
			label,
			path: currentPath,
		});
	});

	return crumbs;
};
