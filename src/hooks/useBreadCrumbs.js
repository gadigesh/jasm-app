import { useLocation } from "react-router-dom";
import { useGetMeQuery } from "../store/services/userAuthApi";
import { NAVIGATION_META } from "../utils/constants";

const useBreadcrumbs = () => {
	const location = useLocation();
	const { data } = useGetMeQuery();

	const breadcrumbs = [];

	// 1️⃣ Dashboard (root)
	breadcrumbs.push({
		label: NAVIGATION_META.dashboard.label,
		to: NAVIGATION_META.dashboard.path,
	});

	// 2️⃣ Active Account (clicked account)
	if (data?.activeAccount?.accountName) {
		breadcrumbs.push({
			label: data.activeAccount.accountName,
			to: `/asset-sources/templates`,
		});
	}

	// 3️⃣ Asset Source module (ALL sub routes)
	if (location.pathname.startsWith("/asset-sources/templates")) {
		breadcrumbs.push({
			label: NAVIGATION_META.asset_source_template.label,
			to: NAVIGATION_META.asset_source_template.path,
		});
	}

	// 4️⃣ Asset Source Template (ALL sub routes)
	if (location.pathname.startsWith("/asset-sources/create/")) {
		breadcrumbs.push({
			label: NAVIGATION_META.asset_source.label,
			to: NAVIGATION_META.asset_source.path,
		});
	}

	return breadcrumbs;
};

export default useBreadcrumbs;
