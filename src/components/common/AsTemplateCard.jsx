import { Check } from "lucide-react";

const AsTemplateCard = ({
	Icon,
	title,
	description,
	iconBg,
	iconColor,
	isSelected,
	onClick,
}) => {
	return (
		<div
			onClick={onClick}
			className={`w-full max-w-[340px] p-6 rounded-2xl border-2 flex flex-col items-start relative shadow-md hover:shadow-2xl transition-all cursor-pointer group ${
				isSelected
					? "border-[#7C3AED] bg-[#7C3AED]/5"
					: "border-gray-200 bg-gray-50 hover:border-gray-300"
			}`}
		>
			<div className="w-full flex justify-between items-start mb-4">
				<div
					className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}
				>
					<Icon
						className={`w-6 h-6 ${iconColor}`}
						strokeWidth={2.5}
					/>
				</div>
				<div
					className={`w-6 h-6 rounded-full border-[2px] transition-all flex items-center justify-center ${
						isSelected
							? "border-[#7C3AED] bg-[#7C3AED] text-white"
							: "border-gray-300 group-hover:border-gray-400 bg-transparent"
					}`}
				>
					{isSelected && <Check size={14} strokeWidth={3} />}
				</div>
			</div>
			<h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
			<p className="text-gray-500 text-[15px] leading-relaxed">
				{description}
			</p>
		</div>
	);
};

export default AsTemplateCard;
