import React from "react";
import PageHeader from "../../components/navigation/PageHeader";

const AssetListPage = () => {
	const addAssetSource = () => {
		console.log("Add Asset Source");
	};
	return (
		<div className="flex flex-col h-full bg-[#F8FAFC]">
			<PageHeader
				title="Asset Sources"
				onAddAction={() => addAssetSource()}
				actionLabel="Add Asset Source"
			/>
			<div className="flex-1 p-8">
				{/* Asset list content would go here */}
			</div>
		</div>
	);
};
export default AssetListPage;
