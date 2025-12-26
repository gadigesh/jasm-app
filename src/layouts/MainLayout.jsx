import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import Sidebar from "../components/navigation/Sidebar";
import { removeUser } from "../store/slices/userSlice";
import TopHeader from "../components/navigation/Topheader";

const MainLayout = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useDispatch();
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

	// Determine current view for sidebar highlighting
	const currentPath = location.pathname;
	let currentView = "DASHBOARD";
	let pageTitle = "Dashboard";

	if (currentPath.includes("/asset-sources")) {
		currentView = "SOURCE_LIST";
		pageTitle = "Asset Sources";
	}
	if (currentPath.includes("/settings")) {
		currentView = "SETTINGS";
		pageTitle = "Settings";
	}

	const handleNavigate = (view) => {
		if (view === "DASHBOARD") navigate("/dashboard");
		if (view === "SOURCE_LIST") navigate("/asset-sources");
		if (view === "SETTINGS") navigate("/settings");
	};

	const handleLogout = () => {
		dispatch(removeUser());
		navigate("/login");
	};

	return (
		<div className="flex w-screen h-screen bg-[#F8FAFC] overflow-hidden">
			<Sidebar
				currentView={currentView}
				onNavigate={handleNavigate}
				onLogout={handleLogout}
				isOpen={isSidebarOpen}
				toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
			/>

			<div className="flex-1 flex flex-col h-full min-w-0">
				<TopHeader />
				{/* Main content area where pages (Dashboard, List, etc.) render */}
				<main className="flex-1 overflow-auto">
					<Outlet />
				</main>
			</div>
		</div>
	);
};

export default MainLayout;
