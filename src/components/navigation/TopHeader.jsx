import React, { useState, useRef, useEffect } from "react";
import { Bell, Search, ChevronDown, LogOut, User } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useLogoutMutation } from "../../store/services/userAuthApi";
import { removeUser } from "../../store/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { showSuccess } from "../../utils/toastMsg";
const TopHeader = () => {
	const user = useSelector((state) => state.user);
	const [logout] = useLogoutMutation();
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	if (!user) return null;

	const handleLogout = () => {
		logout().unwrap();
		dispatch(removeUser());
		showSuccess("Logout successful");
		navigate("/login");
	};

	return (
		<header className="h-16 border-b border-[#EEF2F6] bg-white flex items-center justify-between px-8 sticky top-0 z-40 w-full">
			{/* Search Bar */}
			<div className="relative w-96">
				<div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
					<Search className="h-4 w-4 text-[#7C3AED]" />
				</div>
				<input
					type="text"
					placeholder="Search"
					className="w-full bg-white border border-[#7C3AED] rounded-md py-2 pl-10 pr-12 text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
				/>
				<div className="absolute inset-y-0 right-3 flex items-center space-x-1">
					<div className="flex items-center justify-center h-5 w-5 rounded bg-[#F3E8FF] text-[#7C3AED]">
						<span className="text-xs font-bold">⌘</span>
					</div>
					<div className="flex items-center justify-center h-5 w-5 rounded bg-[#F3E8FF] text-[#7C3AED]">
						<span className="text-xs font-bold">F</span>
					</div>
				</div>
			</div>

			{/* Right Actions */}
			<div className="flex items-center space-x-6">
				{/* Notification Icon */}
				{/* <button className="relative p-2 text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors bg-white">
					<Bell className="h-5 w-5" />
					<span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
				</button> */}

				{/* User Profile */}
				<div className="relative" ref={dropdownRef}>
					<button
						onClick={() => setIsDropdownOpen(!isDropdownOpen)}
						className="flex items-center space-x-3 hover:bg-gray-50 p-1 rounded-lg transition-colors focus:outline-none"
					>
						<div className="w-9 h-9 rounded-full bg-[#E0F2F1] overflow-hidden border-2 border-[#7C3AED]/20 p-0.5 shadow-sm">
							<img
								src={user.photoUrl || ""}
								alt="User"
								className="h-full w-full object-cover rounded-full"
							/>
						</div>
						<div className="flex flex-col items-start">
							<span className="text-sm font-bold text-gray-700 leading-none">
								{user.firstName}
							</span>
						</div>
						<ChevronDown
							className={`h-4 w-4 text-gray-400 ml-1 transition-transform duration-200 ${
								isDropdownOpen ? "transform rotate-180" : ""
							}`}
						/>
					</button>

					{/* Dropdown Menu */}
					{isDropdownOpen && (
						<div className="absolute right-0 mt-2 w-[80%] bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
							<button
								className="flex items-center leading-none w-full px-4 py-2 text-sm text-gray-700 hover:bg-[#F3E8FF] hover:text-[#7C3AED] transition-colors"
								onClick={() => {
									navigate("/dashboard");
									setIsDropdownOpen(false);
								}}
							>
								<User className="h-4 w-4 mr-2" />
								Profile
							</button>

							<button
								onClick={() => {
									handleLogout();
									setIsDropdownOpen(false);
								}}
								className="flex items-center leading-none w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
							>
								<LogOut className="h-4 w-4 mr-2" />
								Logout
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};

export default TopHeader;
