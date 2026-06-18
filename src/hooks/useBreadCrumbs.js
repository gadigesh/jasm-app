import { useLocation } from "react-router-dom";
import { useGetMeQuery } from "../store/services/userAuthApi";
import { NAVIGATION_META } from "../utils/constants";

const useBreadcrumbs = () => {
	const location = useLocation();
	const { data } = useGetMeQuery();

	const breadcrumbs = [];

	// 1️ Dashboard (root)
	breadcrumbs.push({
		label: NAVIGATION_META.dashboard.label,
		to: NAVIGATION_META.dashboard.path,
	});

	// 2️ Active Account (clicked account)
	if (data?.activeAccount?.accountName) {
		breadcrumbs.push({
			label: data.activeAccount.accountName,
			to: `/copy-matrix`,
		});
	}

	// 3️ Copy Matrix
	if (location.pathname.startsWith("/copy-matrix")) {
		breadcrumbs.push({
			label: NAVIGATION_META.copy_matrix.label,
			to: NAVIGATION_META.copy_matrix.path,
		});

		const workflowMatch = location.pathname.match(
			/^\/copy-matrix\/([^/]+)\/(workflow|preview)$/
		);
		if (workflowMatch) {
			breadcrumbs.push({
				label:
					workflowMatch[2] === "preview"
						? "Preview"
						: "Workflow",
				to: location.pathname,
			});
		}
	}

	// 4️ Asset Source List
	if (location.pathname.startsWith("/asset-sources")) {
		breadcrumbs.push({
			label: NAVIGATION_META.asset_source.label,
			to: NAVIGATION_META.asset_source.path,
		});

		const asPreviewMatch = location.pathname.match(
			/^\/asset-sources\/([^/]+)\/preview$/
		);
		if (asPreviewMatch) {
			breadcrumbs.push({
				label: "Preview",
				to: location.pathname,
			});
		}
	}

	return breadcrumbs;
};

export default useBreadcrumbs;
