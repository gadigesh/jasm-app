import { useLocation, useNavigate } from "react-router-dom";

const TABS = [
	{ key: "copy-matrix", label: "Copy Matrix", path: "/copy-matrix" },
	{ key: "asset-sources", label: "Asset Source", path: "/asset-sources" },
];

const AssetViewTabs = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();

	return (
		<div
			className="inline-flex h-10 overflow-hidden rounded-md border border-[#751FD4] bg-white"
			aria-label="Workspace views"
		>
			{TABS.map((tab, index) => {
				const isActive = pathname.startsWith(tab.path);

				return (
					<button
						key={tab.key}
						type="button"
						aria-current={isActive ? "page" : undefined}
						onClick={() => navigate(tab.path)}
						className={`h-full w-[200px] text-sm font-medium transition-colors ${
							index > 0 ? "border-l border-[#751FD4]" : ""
						} ${
							isActive
								? "bg-[#751FD4] text-white hover:bg-[#6419BC]"
								: "bg-white text-[#751FD4] hover:bg-[#F4EDFC]"
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
