import { Link } from "react-router-dom";
import { useBreadCrumbs } from "../../hooks/useBreadCrumbs";

const BreadCrumbs = () => {
	const crumbs = useBreadCrumbs();

	if (!crumbs.length) return null;

	return (
		<div className="text-sm text-[#6B7280] mb-1 flex items-center gap-1">
			{crumbs.map((crumb, idx) => (
				<span key={crumb.path}>
					{idx > 0 && <span className="mx-1">›</span>}
					{idx === crumbs.length - 1 ? (
						<span className="text-[#7C3AED]">{crumb.label}</span>
					) : (
						<Link to={crumb.path} className="hover:underline">
							{crumb.label}
						</Link>
					)}
				</span>
			))}
		</div>
	);
};

export default BreadCrumbs;
