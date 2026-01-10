import React, { useState, useMemo } from "react";
import PageHeader from "../../components/navigation/PageHeader";
import {
	SortAction,
	FilterAction,
	AddButton,
} from "../../components/navigation/HeaderActions";
import ListTable from "../../components/common/ListTable";
import RowPerPage from "../../components/common/RowPerPage";
import Pagination from "../../components/common/Pagination";
import useBreadcrumbs from "../../hooks/useBreadCrumbs";
import { asListTableHeaders } from "../../utils/constants";
import Breadcrumb from "../../components/navigation/BreadCrumbs";
const data = [
	{
		name: "AMR_PRSP_Live",
		updatedAt: "2025-12-01 07:15 PM",
		updatedBy: "Gadigesh",
		status: "Active",
	},
	{
		name: "AMR_RTG_Live",
		updatedAt: "2025-12-01 02:10 PM",
		updatedBy: "Gadigesh",
		status: "Active",
	},
	{
		name: "Mazda",
		updatedAt: "2025-12-01 07:15 PM",
		updatedBy: "Gadigesh",
		status: "Inactive",
	},
	{
		name: "Nordstrom",
		updatedAt: "2025-12-01 02:10 PM",
		updatedBy: "Gadigesh",
		status: "Active",
	},
];

const AssetSourceList = () => {
	const breadcrumbs = useBreadcrumbs();
	const [sortBy, setSortBy] = useState("recent");
	const [filterStatus, setFilterStatus] = useState("all");

	const filteredAndSortedData = useMemo(() => {
		let result = [...data];

		// Filter
		if (filterStatus !== "all") {
			result = result.filter(
				(item) =>
					item.status.toLowerCase() === filterStatus.toLowerCase()
			);
		}

		// Sort
		result.sort((a, b) => {
			if (sortBy === "az") {
				return a.name.localeCompare(b.name);
			} else if (sortBy === "za") {
				return b.name.localeCompare(a.name);
			}
			return 0; // Default order for 'recent'
		});

		return result;
	}, [sortBy, filterStatus]);

	return (
		<div className="bg-white">
			<PageHeader
				title="Asset Sources"
				breadcrumbs={breadcrumbs}
				actions={[
					<SortAction
						key="SortAction"
						currentSort={sortBy}
						onSort={setSortBy}
					/>,
					<FilterAction
						key="FilterAction"
						currentFilter={filterStatus}
						onFilter={setFilterStatus}
					/>,
					<AddButton
						key="AddButton"
						label="Add New"
						onClick={() => {}}
					/>,
				]}
			/>

			<div className="min-h-0 flex-1 flex flex-col">
				<ListTable
					columns={asListTableHeaders}
					rows={filteredAndSortedData}
					loading={false}
				/>
				<div className="px-6">
					<div className="flex items-center justify-between">
						<RowPerPage value={5} onChange={() => {}} />
						<Pagination
							currentPage={1}
							totalPages={10}
							onPageChange={() => {}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AssetSourceList;
