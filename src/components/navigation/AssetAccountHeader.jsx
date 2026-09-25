import { useLocation } from "react-router-dom";
import Breadcrumbs from "./BreadCrumbs";
import AssetViewTabs from "./AssetViewTabs";

const LISTING_PATHS = ["/copy-matrix", "/asset-sources"];

const AssetAccountHeader = ({ breadcrumbs = [], actions = [] }) => {
	const { pathname } = useLocation();
	const title = pathname.startsWith("/copy-matrix")
		? "Copy Matrix"
		: "Asset Sources";
	const showViewTabs = LISTING_PATHS.includes(pathname);

	return (
		<div className="sticky top-0 z-50 border-b bg-white px-8 py-2">
			<Breadcrumbs items={breadcrumbs} />
			<h1 className="sr-only">{title}</h1>

			{showViewTabs || actions.length > 0 ? (
				<div className="flex justify-between items-center mt-2">
					{showViewTabs ? <AssetViewTabs /> : <div />}
					<div className="flex gap-3">{actions}</div>
				</div>
			) : null}
		</div>
	);
};

export default AssetAccountHeader;
