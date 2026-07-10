import { useLocation, useNavigate } from "react-router-dom";

const TABS = [
	{ key: "copy-matrix", label: "Copy Matrix", path: "/copy-matrix" },
	{ key: "asset-sources", label: "Asset Source", path: "/asset-sources" },
];

const AssetViewTabs = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();

	return (
		<div className="flex gap-3">
			{TABS.map((tab) => {
				const isActive = pathname.startsWith(tab.path);

				return (
					<button
						key={tab.key}
						onClick={() => navigate(tab.path)}
						className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
							isActive
								? "bg-[#B600C9] text-white hover:bg-[#9a00ab]"
								: "bg-white text-[#B600C9] border border-[#B600C9] hover:bg-purple-50"
						}`}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
};

export default AssetViewTabs;
