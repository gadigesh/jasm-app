import React, { useState, useMemo, lazy, Suspense } from "react";
import CampaignCard from "../../components/common/CampaignCard";
import PageHeader from "../../components/navigation/PageHeader";

const AddAccountModal = lazy(() =>
	import("../../components/modals/AddAccountModal")
);
import {
	useGetAccountsQuery,
	useSwitchAccountMutation,
} from "../../store/services/accounts";
import {
	SortAction,
	FilterAction,
	AddButton,
} from "../../components/navigation/HeaderActions";

import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";

const Dashboard = () => {
	const navigate = useNavigate();
	usePageTitle("Dashboard");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [sortType, setSortType] = useState("recent");
	const [filterType, setFilterType] = useState("all");

	const { data, isLoading, isError, error } = useGetAccountsQuery();

	// backend response: { data: [...] }
	const accounts = data?.data ? data.data : [];
	const [switchAccount] = useSwitchAccountMutation();

	const handleCardClick = async (accountId) => {
		await switchAccount(accountId);
		navigate("/copy-matrix");
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
				actions={[
					<SortAction
						key="SortAction"
						onSort={setSortType}
						currentSort={sortType}
					/>,
					<FilterAction
						key="FilterAction"
						onFilter={setFilterType}
						currentFilter={filterType}
					/>,
					<AddButton
						key="AddButton"
						label="Add Account"
						onClick={() => setIsModalOpen(true)}
					/>,
				]}
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

				{!isLoading && !isError && displayedCampaigns.length === 0 ? (
					<div className="flex flex-1 min-h-[280px] items-center justify-center">
						<div className="text-center max-w-md">
							<p className="text-lg font-semibold text-[#1A1C1E]">
								{accounts.length === 0
									? "No accounts yet"
									: "No accounts match the selected filter"}
							</p>
							<p className="mt-2 text-sm text-gray-500">
								{accounts.length === 0
									? "Add an account to get started. Accounts created here are available to every user."
									: "Try a different filter to see your accounts."}
							</p>
							{accounts.length === 0 ? (
								<button
									type="button"
									onClick={() => setIsModalOpen(true)}
									className="mt-6 px-6 py-3 bg-[#B600C9] text-white font-bold rounded-xl hover:bg-[#9E00AD] shadow-lg shadow-[#B600C9]/20 transition-all"
								>
									Add Account
								</button>
							) : null}
						</div>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{displayedCampaigns.map((campaign, index) => (
							<CampaignCard
								key={campaign.id}
								name={campaign.accountName}
								client={campaign.clientName}
								lastUpdated={campaign.lastUpdated}
								status={campaign.accountStatus}
								priority={index === 0}
								onClick={() => handleCardClick(campaign.id)}
							/>
						))}
					</div>
				)}
			</div>
			{isModalOpen ? (
				<Suspense fallback={null}>
					<AddAccountModal
						isOpen={isModalOpen}
						onClose={() => setIsModalOpen(false)}
					/>
				</Suspense>
			) : null}
		</div>
	);
};

export default Dashboard;
