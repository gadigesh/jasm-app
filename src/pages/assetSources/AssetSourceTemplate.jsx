import React, { useState, useEffect } from "react";
import {
	FileSpreadsheet,
	ShoppingBag,
	Hand,
	UserCog,
	ArrowRight,
} from "lucide-react";
import PageHeader from "../../components/navigation/PageHeader";
import AsTemplateCard from "../../components/common/AsTemplateCard";
import { useNavigate } from "react-router-dom";
import { AddButton } from "../../components/navigation/HeaderActions";
import AddASTemplate from "../../components/modals/AddASTemplate";

const templates = [
	{
		id: "dynamic",
		title: "Dynamic",
		desc: "Standard row-column structure optimized for Google Sheets and Excel exports.",
		icon: FileSpreadsheet,
		iconColor: "text-orange-500",
		iconBg: "bg-orange-100/50",
	},
	{
		id: "ecommerce",
		title: "E-commerce",
		desc: "Designed for product feeds including SKU, pricing, variants, and image galleries.",
		icon: ShoppingBag,
		iconColor: "text-red-500",
		iconBg: "bg-red-100/50",
	},
	{
		id: "social",
		title: "Social",
		desc: "Templates for ad creatives, copy variations, targeting parameters, and CTA links.",
		icon: Hand,
		iconColor: "text-blue-500",
		iconBg: "bg-blue-100/50",
	},
	{
		id: "RMA",
		title: "RMA",
		desc: "Structures for subject lines, pre-headers, body copy, and dynamic fields.",
		icon: UserCog,
		iconColor: "text-teal-500",
		iconBg: "bg-teal-100/50",
	},
	{
		id: "Tempaltes",
		title: "Templates",
		desc: "Designed for product feeds including SKU, pricing, variants, and image galleries.",
		icon: ShoppingBag,
		iconColor: "text-red-500",
		iconBg: "bg-red-100/50",
	},
];

const AssetSourceTemplate = () => {
	const navigate = useNavigate();
	const [selectedId, setSelectedId] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const handleSelect = (id) => {
		setSelectedId(id);
	};

	const handleNext = () => {
		navigate("/asset-sources/create/" + selectedId);
	};

	return (
		<div className="flex flex-col h-full bg-[#fcfcfc] relative">
			<PageHeader
				title="Define Asset Source"
				subtitle="Select how you want to structure your asset data..."
				actions={[
					<AddButton
						key={"add-template"}
						label="Add Template"
						disabled={isLoading}
						onClick={() => setIsModalOpen(true)}
					/>,
				]}
			/>
			{/* Content */}
			<div className="flex flex-wrap gap-8 p-8 flex-1 overflow-auto">
				{templates.map((template) => (
					<AsTemplateCard
						key={template.id}
						Icon={template.icon}
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
