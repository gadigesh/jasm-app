import { ChevronsRight } from "lucide-react";
import { Link } from "react-router-dom";

const Breadcrumb = ({ items = [] }) => {
	return (
		<nav className="flex items-center text-sm text-gray-500">
			{items.map((item, index) => {
				const isLast = index === items.length - 1;

				return (
					<div key={item.label} className="flex items-center">
						{index !== 0 && (
							<ChevronsRight
								size={18}
								className="mx-2 text-gray-400"
							/>
						)}

						{isLast || !item.to ? (
							<span className="text-gray-900 font-medium">
								{item.label}
							</span>
						) : (
							<Link
								to={item.to}
								className="hover:text-purple-600 transition-colors"
							>
								{item.label}
							</Link>
						)}
					</div>
				);
			})}
		</nav>
	);
};

export default Breadcrumb;
