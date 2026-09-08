import { useLocation } from "react-router-dom";
import Breadcrumbs from "./BreadCrumbs";
import AssetViewTabs from "./AssetViewTabs";

const AssetAccountHeader = ({ breadcrumbs = [], actions = [] }) => {
	const { pathname } = useLocation();
	const title = pathname.startsWith("/copy-matrix")
		? "Copy Matrix"
		: "Asset Sources";

	return (
		<div className="bg-white px-8 py-2 border-b sticky top-0 z-50">
			<Breadcrumbs items={breadcrumbs} />
			<h1 className="sr-only">{title}</h1>

			<div className="flex justify-between items-center mt-2">
				<AssetViewTabs />
				<div className="flex gap-3">{actions}</div>
			</div>
		</div>
	);
};

export default AssetAccountHeader;
