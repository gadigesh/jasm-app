import React from "react";
import PageHeader from "../../components/navigation/PageHeader";
import {
	SortAction,
	FilterAction,
	AddButton,
} from "../../components/navigation/HeaderActions";
const AssetSourceList = () => {
	return (
		<div>
			<PageHeader
				breadcrumb="Dashboard > AMR > Asset Source"
				title="Asset Sources"
				actions={[
					<SortAction key="SortAction" />,
					<FilterAction key="FilterAction" />,
					<AddButton
						key="AddButton"
						label="Add New"
						onClick={() => {}}
					/>,
				]}
			/>
		</div>
	);
};

export default AssetSourceList;
