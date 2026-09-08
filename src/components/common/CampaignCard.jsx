import React from "react";
import { timeAgo } from "../../utils/constants";

const CampaignCard = ({
	name,
	client,
	lastUpdated,
	status,
	onClick,
	priority = false,
}) => {
	const handleKeyDown = (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onClick?.();
		}
	};

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onClick}
			onKeyDown={handleKeyDown}
			className="bg-white cursor-pointer rounded-2xl shadow-lg border border-[#EEF2F6] overflow-hidden flex flex-col hover:shadow-2xl transition-shadow"
		>
			<div className="p-6 flex justify-between items-start">
				<div className="flex-1">
					<span
						className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-md mb-4 ${
							status === "Active"
								? "text-[#10B981] bg-[#ECFDF5]"
								: "text-[#EF4444] bg-[#FEF2F2]"
						}`}
					>
						{status}
					</span>

					<h3 className="text-xl font-bold text-[#1A1C1E] leading-tight mb-2">
						{name}
					</h3>
					<p className="text-sm text-[#64748B] font-medium">
						Client: {client}
					</p>
				</div>

				<img
					className="h-16 w-auto object-contain relative right-4"
					src="/clip-big-mike.png"
					alt="ClipBigMike"
					width="106"
					height="109"
					loading={priority ? "eager" : "lazy"}
					fetchPriority={priority ? "high" : "low"}
					decoding={priority ? "sync" : "async"}
				/>
			</div>

			<div className="mt-auto bg-[#F8FAFC] px-6 py-4 flex justify-between items-center border-t border-[#EEF2F6]">
				<span className="text-xs text-[#94A3B8] font-medium">
					Last updated {timeAgo(lastUpdated)}
				</span>
				<button
					type="button"
					className="text-xs font-bold text-[#B600C9] hover:underline underline-offset-4 transition-all"
				>
					View Details
				</button>
			</div>
		</div>
	);
};

export default CampaignCard;
