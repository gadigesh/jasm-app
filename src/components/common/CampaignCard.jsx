import React from "react";

const CampaignCard = ({ name, client, lastUpdated, status = "Active" }) => {
	return (
		<div className="bg-white rounded-2xl shadow-lg border border-[#EEF2F6] overflow-hidden flex flex-col hover:shadow-2xl transition-shadow">
			{/* Top Section */}
			<div className="p-6 flex justify-between items-start">
				<div className="flex-1">
					{/* Status Badge */}
					<span className="inline-block px-2.5 py-1 text-[10px] font-bold text-[#10B981] bg-[#ECFDF5] rounded-md mb-4">
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
				<div className="text-[#B600C9] opacity-40 ml-4">
					<svg
						width="80"
						height="80"
						viewBox="0 0 80 80"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle
							cx="25"
							cy="25"
							r="10"
							stroke="currentColor"
							strokeWidth="1.5"
						/>
						<path
							d="M23 21L29 25L23 29V21Z"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinejoin="round"
						/>
						<rect
							x="40"
							y="15"
							width="20"
							height="2"
							rx="1"
							fill="currentColor"
						/>
						<rect
							x="40"
							y="20"
							width="20"
							height="2"
							rx="1"
							fill="currentColor"
						/>
						<rect
							x="40"
							y="25"
							width="12"
							height="2"
							rx="1"
							fill="currentColor"
						/>
						<path
							d="M20 50L35 40V60L20 50Z"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinejoin="round"
						/>
						<path
							d="M35 45H55C58 45 60 47 60 50C60 53 58 55 55 55H35"
							stroke="currentColor"
							strokeWidth="1.5"
						/>
						<path
							d="M45 55L42 65"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
				</div>
			</div>

			{/* Footer Section */}
			<div className="mt-auto bg-[#F8FAFC] px-6 py-4 flex justify-between items-center border-t border-[#EEF2F6]">
				<span className="text-xs text-[#94A3B8] font-medium">
					Last updated {lastUpdated}
				</span>
				<button className="text-xs font-bold text-[#B600C9] hover:underline underline-offset-4 transition-all">
					View Details
				</button>
			</div>
		</div>
	);
};

export default CampaignCard;
