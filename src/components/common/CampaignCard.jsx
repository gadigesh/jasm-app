import React from "react";
import { timeAgo } from "../../utils/constants";

const CampaignCard = ({ name, client, lastUpdated, status }) => {
	return (
		<div className="bg-white cursor-pointer rounded-2xl shadow-lg border border-[#EEF2F6] overflow-hidden flex flex-col hover:shadow-2xl transition-shadow">
			{/* Top Section */}
			<div className="p-6 flex justify-between items-start">
				<div className="flex-1">
					{/* Status Badge */}
					<span
						className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-md mb-4 ${
							status === "Active"
								? "text-[#10B981] bg-[#ECFDF5]"
								: "text-[#EF4444] bg-[#FEF2F2]"
						}`}
					>
						{status}
					</span>

					{/* Title and Client */}
					<h3 className="text-xl font-bold text-[#1A1C1E] leading-tight mb-2">
						{name}
					</h3>
					<p className="text-sm text-[#64748B] font-medium">
						Client: {client}
					</p>
				</div>

				{/* Custom Decorative Icon (Megaphone + Media) */}
				<img
					className="w-16 h-16 relative right-4"
					src="https://cdn.jivox.com/files/57886/ClipBigMike.png"
					alt="ClipBigMike"
				/>
			</div>

			{/* Footer Section */}
			<div className="mt-auto bg-[#F8FAFC] px-6 py-4 flex justify-between items-center border-t border-[#EEF2F6]">
				<span className="text-xs text-[#94A3B8] font-medium">
					Last updated {timeAgo(lastUpdated)}
				</span>
				<button className="text-xs font-bold text-[#B600C9] hover:underline underline-offset-4 transition-all">
					View Details
				</button>
			</div>
		</div>
	);
};

export default CampaignCard;
