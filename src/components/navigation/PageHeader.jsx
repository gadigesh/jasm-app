import Breadcrumbs from "./BreadCrumbs";

const PageHeader = ({ title, subtitle, actions = [], breadcrumbs = [] }) => {
	return (
		<div className="bg-white px-8 py-2 border-b sticky top-0 z-50">
			<Breadcrumbs items={breadcrumbs} />

			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl text-[#413d42] font-bold">
						{title}
					</h1>
					{subtitle && (
						<p className="text-sm text-gray-500">{subtitle}</p>
					)}
				</div>

				<div className="flex gap-3">{actions}</div>
			</div>
		</div>
	);
};

export default PageHeader;
