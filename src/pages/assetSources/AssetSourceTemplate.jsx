import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import PageHeader from "../../components/navigation/PageHeader";
import AsTemplateCard from "../../components/common/AsTemplateCard";
import { useNavigate } from "react-router-dom";
import { AddButton } from "../../components/navigation/HeaderActions";
import AddASTemplate from "../../components/modals/AddASTemplate";
import { useGetAssetTemplatesQuery } from "../../store/services/assetTemplate";
import { ICON_MAP } from "../../utils/constants";
import useBreadcrumbs from "../../hooks/useBreadCrumbs";

const AssetSourceTemplate = () => {
	const navigate = useNavigate();
	const breadcrumbs = useBreadcrumbs();
	const [selectedId, setSelectedId] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleSelect = (id) => {
		setSelectedId(id);
	};

	const handleNext = () => {
		navigate("/asset-sources/create/" + selectedId);
	};

	const { data: templates, isLoading: templatesLoading } =
		useGetAssetTemplatesQuery();

	return (
		<div className="flex flex-col h-full bg-[#fcfcfc] relative">
			<PageHeader
				breadcrumbs={breadcrumbs}
				title="Define Asset Source"
				subtitle="Select how you want to structure your asset data..."
				actions={[
					<AddButton
						key={"add-template"}
						label="Add Template"
						disabled={!templatesLoading}
						onClick={() => setIsModalOpen(true)}
					/>,
				]}
			/>
			{/* Content */}
			<div className="flex flex-wrap gap-8 p-8 flex-1 overflow-auto">
				{templates?.map((template) => (
					<AsTemplateCard
						key={template.id}
						Icon={ICON_MAP[template.icon]}
						iconBg={template.iconBg}
						iconColor={template.iconColor}
						title={template.title}
						description={template.desc}
						isSelected={selectedId === template.id}
						onClick={() => handleSelect(template.id)}
					/>
				))}
			</div>
			<AddASTemplate
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
			<div className="absolute bottom-0 right-0 flex justify-end p-8">
				<button
					disabled={!selectedId}
					onClick={handleNext}
					className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg active:scale-95 ${
						selectedId
							? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
							: "bg-gray-100 text-gray-400 cursor-not-allowed"
					}`}
				>
					<span>Next</span>
					<ArrowRight size={18} />
				</button>
			</div>
		</div>
	);
};

export default AssetSourceTemplate;
