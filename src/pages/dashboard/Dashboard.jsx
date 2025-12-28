import React, { useState, useMemo } from "react";
import CampaignCard from "../../components/common/CampaignCard";
import PageHeader from "../../components/navigation/PageHeader";
import AddAccountModal from "../../components/modals/AddAccountModal";

const initialCampaigns = [
	{
		id: 1,
		name: "AMR Hotels",
		client: "85SIXTY",
		lastUpdated: "2 days ago",
		status: "Active",
	},
	{
		id: 2,
		name: "Swiftly",
		client: "Swiftly",
		lastUpdated: "4 days ago",
		status: "Active",
	},
	{
		id: 3,
		name: "Mazda",
		client: "Mazda",
		lastUpdated: "a day ago",
		status: "Active",
	},
	{
		id: 4,
		name: "Nordstrom Enterprise",
		client: "Nordstrom",
		lastUpdated: "4 days ago",
		status: "Active",
	},
	{
		id: 5,
		name: "WSI",
		client: "WSI",
		lastUpdated: "2 days ago",
		status: "Active",
	},
	{
		id: 6,
		name: "Cathay",
		client: "Cathay Pacific Travel",
		lastUpdated: "9 days ago",
		status: "Active",
	},
	{
		id: 7,
		name: "Giant Eagle",
		client: "Giant Eagle",
		lastUpdated: "10 days ago",
		status: "Active",
	},
	{
		id: 8,
		name: "Marriot",
		client: "Marriot",
		lastUpdated: "15 days ago",
		status: "Active",
	},
	{
		id: 9,
		name: "Bob's",
		client: "Bob's",
		lastUpdated: "18 days ago",
		status: "Active",
	},
];

const Dashboard = () => {
	const [campaigns, setCampaigns] = useState(initialCampaigns);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [sortType, setSortType] = useState("recent");
	const [filterType, setFilterType] = useState("all");

	const handleAddAccount = (newAccount) => {
		const account = {
			id: Date.now(),
			status: "Active",
			...newAccount,
		};
		setCampaigns([account, ...campaigns]);
		setSortType("recent");
		setFilterType("all");
	};

	const displayedCampaigns = useMemo(() => {
		let result = [...campaigns];

		// Filter
		if (filterType !== "all") {
			result = result.filter(
				(c) => c.status.toLowerCase() === filterType
			);
		}

		// Sort
		if (sortType === "az") {
			result.sort((a, b) => a.name.localeCompare(b.name));
		} else if (sortType === "za") {
			result.sort((a, b) => b.name.localeCompare(a.name));
		} else {
			// Default: Most recent (based on ID since we don't have real dates)
			result.sort((a, b) => b.id - a.id);
		}

		return result;
	}, [campaigns, sortType, filterType]);

	return (
		<div className="flex flex-col h-full bg-[#F8FAFC]">
			<PageHeader
				title="Dashboard"
				onAddAction={() => setIsModalOpen(true)}
				actionLabel="Add Account"
				onSort={setSortType}
				onFilter={setFilterType}
			/>

			<div className="flex-1 p-8 overflow-auto">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{displayedCampaigns.map((campaign) => (
						<CampaignCard
							key={campaign.id}
							name={campaign.name}
							client={campaign.client}
							lastUpdated={campaign.lastUpdated}
						/>
					))}
				</div>
			</div>

			<AddAccountModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onAdd={handleAddAccount}
			/>
		</div>
	);
};

export default Dashboard;
