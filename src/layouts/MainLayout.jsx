import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import Sidebar from "../components/navigation/Sidebar";
import { removeUser } from "../store/slices/userSlice";
import TopHeader from "../components/navigation/Topheader";
import {
	useGetMeQuery,
	useLogoutMutation,
} from "../store/services/userAuthApi";
import { addUser } from "../store/slices/userSlice";
import { showSuccess } from "../utils/toastMsg";
import Footer from "../components/navigation/Footer";
import { writeActiveAccountId } from "../utils/activeAccountStorage";

const MainLayout = () => {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const { data, isSuccess } = useGetMeQuery();
	const [logout] = useLogoutMutation();

	useEffect(() => {
		if (isSuccess && data) {
			dispatch(addUser(data));
			writeActiveAccountId(data.activeAccount?._id);
		}
	}, [isSuccess, data, dispatch]);
	const handleLogout = () => {
		logout().unwrap();
		dispatch(removeUser());
		writeActiveAccountId();
		navigate("/login", {
			replace: true,
		});
		showSuccess("Logout successful");
	};

	return (
		<div className="flex w-screen h-screen bg-[#F8FAFC] overflow-hidden">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-violet-700"
			>
				Skip to main content
			</a>
			<Sidebar
				onLogout={handleLogout}
				isOpen={isSidebarOpen}
				toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
			/>

			<div className="flex-1 flex flex-col h-full min-w-0">
				<TopHeader />
				<main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
					<Outlet />
				</main>
				<Footer />
			</div>
		</div>
	);
};

export default MainLayout;
