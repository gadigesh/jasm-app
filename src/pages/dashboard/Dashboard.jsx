import React, { useState, useMemo } from "react";
import CampaignCard from "../../components/common/CampaignCard";
import PageHeader from "../../components/navigation/PageHeader";
import AddAccountModal from "../../components/modals/AddAccountModal";
import { useGetAccountsQuery } from "../../store/services/accounts";

import { useNavigate } from "react-router-dom";

const Dashboard = () => {
	const navigate = useNavigate();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [sortType, setSortType] = useState("recent");
	const [filterType, setFilterType] = useState("all");

	const { data, isLoading, isError, error } = useGetAccountsQuery();

	// backend response: { data: [...] }
	const accounts = data?.data ? data.data : [];

	const handleCardClick = () => {
		navigate("/assetSources");
	};

	const displayedCampaigns = useMemo(() => {
		let result = [...accounts];

		// Filter
		if (filterType !== "all") {
			result = result.filter(
				(c) => c.accountStatus?.toLowerCase() === filterType
			);
		}

		// Sort
		if (sortType === "az") {
			result.sort((a, b) => a.accountName.localeCompare(b.accountName));
		} else if (sortType === "za") {
			result.sort((a, b) => b.accountName.localeCompare(a.accountName));
		} else {
			// Recent (backend timestamp)
			result.sort(
				(a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)
			);
		}

		return result;
	}, [accounts, sortType, filterType]);

	return (
		<div className="flex flex-col h-full bg-[#F8FAFC]">
			<PageHeader
				title="Dashboard"
				onAddAction={() => setIsModalOpen(true)}
				actionLabel="Add Account"
				onSort={setSortType}
				onFilter={setFilterType}
				currentSort={sortType}
				currentFilter={filterType}
			/>

			<div className="flex-1 p-8 overflow-auto">
				{/* Loading */}
				{isLoading && (
					<p className="text-center text-gray-500">
						Loading accounts...
					</p>
				)}

				{/* Error */}
				{isError && (
					<p className="text-center text-red-500">
						{error?.data?.message || "Failed to load accounts"}
					</p>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{displayedCampaigns.map((campaign) => (
						<CampaignCard
							key={campaign.id}
							name={campaign.accountName}
							client={campaign.clientName}
							lastUpdated={campaign.lastUpdated}
							status={campaign.accountStatus}
							onClick={handleCardClick}
						/>
					))}
				</div>
			</div>

			<AddAccountModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</div>
	);
};

export default Dashboard;
