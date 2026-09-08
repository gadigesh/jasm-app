import React from "react";
import {
	Database,
	LayoutDashboard,
	Settings,
	LogOut,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";

const Sidebar = ({ onLogout, isOpen = true, toggleSidebar }) => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	// Active states derived from URL
	const isDashboard = pathname === "/" || pathname === "/dashboard";
	const isAssetSource =
		pathname.startsWith("/asset-sources") ||
		pathname.startsWith("/copy-matrix");
	const isSettings = pathname.startsWith("/settings");
	const handleNavigate = (view) => {
		if (view === "DASHBOARD") navigate("/dashboard");
		if (view === "SOURCE_LIST") navigate("/copy-matrix");
		if (view === "SETTINGS") navigate("/settings");
	}; 

	return (
		<aside
			className={`bg-white flex-col hidden text-xs lg:flex border-r border-[#EEF2F6] transition-all duration-300 ease-in-out relative ${
				isOpen ? "w-48" : "w-20"
			}`}
		>
			{/* Toggle Button */}
			<button
				type="button"
				onClick={toggleSidebar}
				aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
				className="absolute -right-3 top-6 bg-white border border-[#EEF2F6] rounded-full p-1 shadow-sm z-50 text-gray-500 hover:text-[#B600C9] transition-transform duration-300"
			>
				{isOpen ? (
					<ChevronLeft size={16} />
				) : (
					<ChevronRight size={16} />
				)}
			</button>

			<nav aria-label="Primary" className="flex-1 px-3 py-4 space-y-2 overflow-hidden">
				{/* Logo */}
				<div
					className={`h-12 w-full flex items-center shadow-sm transition-all duration-300 ${
						isOpen ? "pl-4 mb-6" : "justify-center mb-6 px-0"
					}`}
				>
					<BrandLogo
						priority
						className={`transition-all duration-300 absolute top-4 object-contain ${
							isOpen
								? "h-8 w-[104px] left-8"
								: "h-4 w-10 top-6 left-3"
						}`}
					/>
				</div>

				{/* Dashboard */}
				<button
					type="button"
					aria-current={isDashboard ? "page" : undefined}
					onClick={() => handleNavigate("DASHBOARD")}
					className={`w-full flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
						isDashboard
							? "bg-[#B600C9] text-white"
							: "text-[#64748B] hover:bg-gray-150"
					}`}
					aria-label="Dashboard"
					title={!isOpen ? "Dashboard" : ""}
				>
					<LayoutDashboard className="min-w-[20px] h-5" />
					<span
						className={`ml-3 font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
							isOpen
								? "opacity-100 max-w-xs"
								: "opacity-0 max-w-0 ml-0"
						}`}
					>
						Dashboard
					</span>
				</button>

				{/* Asset Sources */}
				<button
					type="button"
					aria-current={isAssetSource ? "page" : undefined}
					onClick={() => handleNavigate("SOURCE_LIST")}
					disabled={isDashboard}
					className={`w-full text-xs flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
						isAssetSource
							? "bg-[#B600C9] text-white"
							: isDashboard
							? "text-gray-300 cursor-not-allowed opacity-50"
							: "text-[#64748B] hover:bg-gray-150"
					}`}
					aria-label="Asset Sources"
					title={!isOpen ? "Asset Sources" : ""}
				>
					<Database className="min-w-[20px] h-5" />
					<span
						className={`ml-3 font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
							isOpen
								? "opacity-100 max-w-xs"
								: "opacity-0 max-w-0 ml-0"
						}`}
					>
						Asset Sources
					</span>
				</button>

				{/* Settings */}
				<button
					type="button"
					aria-current={isSettings ? "page" : undefined}
					onClick={() => handleNavigate("SETTINGS")}
					className={`w-full flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${
						isSettings
							? "bg-[#B600C9] text-white"
							: "text-[#64748B] hover:bg-gray-150"
					}`}
					aria-label="Settings"
					title={!isOpen ? "Settings" : ""}
				>
					<Settings className="min-w-[20px] h-5" />
					<span
						className={`ml-3 font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
							isOpen
								? "opacity-100 max-w-xs"
								: "opacity-0 max-w-0 ml-0"
						}`}
					>
						Settings
					</span>
				</button>
			</nav>

			{/* Logout */}
			<div className="p-3 mt-auto">
				<button
					type="button"
					onClick={onLogout}
					className="w-full flex items-center px-4 py-2 text-[#94A3B8] hover:text-[#B600C9] transition-all duration-300"
					aria-label="Logout"
					title={!isOpen ? "Logout" : ""}
				>
					<LogOut className="min-w-[20px] h-5" />
					<span
						className={`ml-3 font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
							isOpen
								? "opacity-100 max-w-xs"
								: "opacity-0 max-w-0 ml-0"
						}`}
					>
						Logout
					</span>
				</button>
			</div>
		</aside>
	);
};

export default Sidebar;
