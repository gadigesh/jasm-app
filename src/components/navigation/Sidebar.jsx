import React from "react";
import {
	Database,
	LayoutDashboard,
	Settings,
	LogOut,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";

// If you are using standard strings for views instead of a TS Enum:
// e.g., 'DASHBOARD', 'SOURCE_LIST', 'SETTINGS'

const Sidebar = ({
	currentView,
	onNavigate,
	onLogout,
	isOpen = true,
	toggleSidebar,
}) => {
	// Helper to check if Asset Sources should be highlighted
	const isAssetSourceActive =
		currentView === "SOURCE_LIST" ||
		(currentView && currentView.toString().startsWith("SOURCE_CREATE"));

	return (
		<div
			className={`bg-white flex-col hidden lg:flex border-r border-[#EEF2F6] transition-all duration-300 relative ${
				isOpen ? "w-64" : "w-20"
			}`}
		>
			{/* Toggle Button */}
			<button
				onClick={toggleSidebar}
				className="absolute -right-3 top-8 bg-white border border-[#EEF2F6] rounded-full p-1 shadow-sm z-50 text-gray-500 hover:text-[#B600C9] transition-colors"
			>
				{isOpen ? (
					<ChevronLeft size={16} />
				) : (
					<ChevronRight size={16} />
				)}
			</button>

			<nav className="flex-1 px-3 py-4 space-y-2 overflow-hidden ">
				{/* Logo Area */}
				<div
					className={`h-12 w-full flex shadow-sm items-center ${
						isOpen ? "pl-4 mb-6" : "justify-center mb-6"
					}`}
				>
					<img
						src="https://jvx.app.jivox.com/studio/images/jivox_logo.png"
						alt="Jivox"
						className={`transition-all duration-300 ${
							isOpen ? "h-8" : "h-6"
						}`}
					/>
				</div>

				{/* Dashboard Link */}
				<button
					onClick={() => onNavigate("DASHBOARD")}
					className={`w-full flex items-center ${
						isOpen ? "space-x-3 px-4" : "justify-center px-0"
					} py-3 rounded-lg transition-all ${
						currentView === "DASHBOARD"
							? "bg-[#B600C9] text-[#fff]"
							: "text-[#64748B] hover:bg-gray-150"
					}`}
					title={!isOpen ? "Dashboard" : ""}
				>
					<LayoutDashboard className="min-w-[24px]" />
					<span
						className={`font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
							isOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
						}`}
					>
						Dashboard
					</span>
				</button>

				{/* Asset Sources Link */}
				<button
					onClick={() => onNavigate("SOURCE_LIST")}
					className={`w-full flex items-center ${
						isOpen ? "space-x-3 px-4" : "justify-center px-0"
					} py-3 rounded-lg transition-all ${
						isAssetSourceActive
							? "bg-[#B600C9] text-[#fff]"
							: "text-[#64748B] hover:bg-gray-150"
					}`}
					title={!isOpen ? "Asset Sources" : ""}
				>
					<Database className="min-w-[24px]" />
					<span
						className={`font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
							isOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
						}`}
					>
						Asset Sources
					</span>
				</button>

				{/* Settings Link */}
				<button
					onClick={() => onNavigate("SETTINGS")}
					className={`w-full flex items-center ${
						isOpen ? "space-x-3 px-4" : "justify-center px-0"
					} py-3 rounded-lg transition-all ${
						currentView == "SETTINGS"
							? "bg-[#B600C9] text-[#fff]"
							: "text-[#64748B] hover:bg-gray-150"
					}`}
					title={!isOpen ? "Settings" : ""}
				>
					<Settings className="min-w-[24px]" />
					<span
						className={`font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
							isOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
						}`}
					>
						Settings
					</span>
				</button>
			</nav>

			{/* Logout Button */}
			<div className="p-4 mt-auto overflow-hidden">
				<button
					onClick={onLogout}
					className={`w-full flex items-center ${
						isOpen ? "space-x-3 px-4" : "justify-center px-0"
					} py-3 text-[#94A3B8] hover:text-[#B600C9] transition-all`}
					title={!isOpen ? "Logout" : ""}
				>
					<LogOut className="min-w-[24px]" />
					<span
						className={`font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
							isOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
						}`}
					>
						Logout
					</span>
				</button>
			</div>
		</div>
	);
};

export default Sidebar;
