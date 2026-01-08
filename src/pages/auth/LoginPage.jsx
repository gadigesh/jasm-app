import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	useLoginMutation,
	useSignupMutation,
} from "../../store/services/userAuthApi";
import { useDispatch } from "react-redux";
import { addUser } from "../../store/slices/userSlice";
import { showError, showSuccess } from "../../utils/toastMsg";
const LoginPage = () => {
	const [emailId, setEmail] = useState("12345@gmail.com");
	const [password, setPassword] = useState("Jiv0x@Secure#2025!");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [isLoginForm, setIsLogInForm] = useState(false);
	const navigate = useNavigate();
	const [login, { isLoading }] = useLoginMutation();
	const [signup] = useSignupMutation();
	const dispatch = useDispatch();
	const handleLogin = async () => {
		try {
			const response = await login({ emailId, password }).unwrap();
			dispatch(addUser(response));
			navigate("/dashboard", {
				replace: true,
			});
			showSuccess("Login successful");
		} catch (err) {
			showError(
				"Login Failed Please check the entered details once again"
			);
		}
	};
	const handleSignUp = async () => {
		try {
			const response = await signup({
				emailId,
				password,
				firstName,
				lastName,
			}).unwrap();
			dispatch(addUser(response));
			navigate("/dashboard", {
				replace: true,
			});
			showSuccess("Signup successful");
		} catch (err) {
			showError(
				"Signup Failed Please check the entered details once again"
			);
		}
	};
	const handleSubmit = (e) => {
		e.preventDefault();
		isLoginForm ? handleSignUp() : handleLogin();
	};

	return (
		<div className="w-screen h-screen flex items-center justify-center bg-black">
			<div
				className="
					w-full h-full
					bg-[url('https://cdn.jivox.com/files/57886/updatedLogin%20BG.png')]
					bg-cover bg-no-repeat bg-center
					"
			/>
			<div className="absolute top-6 left-8 z-40">
				<img
					src="https://jvx.app.jivox.com/studio/images/jivox_logo.png"
					alt="Jivox"
					className="h-8"
				/>
			</div>
			<div className="absolute top-20 left-1/3 transform -translate-x-1/2 z-30 max-w-lg">
				<h1 className="text-3xl font-bold text-slate-900 leading-snug">
					Build Smarter <br /> Asset Sources, Faster.
				</h1>
			</div>
			<div className="absolute right-28 z-40 min-h-screen flex items-center justify-center px-4 sm:px-8">
				<div className="w-full max-w-7xl items-center gap-8">
					<div className="flex justify-center md:justify-end">
						<div className="w-full max-w-sm bg-white rounded-xl shadow-xl px-6 sm:px-8 py-8 sm:py-10">
							<h2 className="text-lg font-semibold text-slate-900 mb-6">
								{isLoginForm ? "Sign Up" : "Sign In"}
							</h2>

							<form onSubmit={handleSubmit} className="space-y-3">
								{isLoginForm && (
									<>
										<div>
											<label className="block text-sm text-slate-600 mb-1">
												First Name
											</label>
											<input
												type="text"
												placeholder="First Name"
												className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
												required
												value={firstName}
												onChange={(e) =>
													setFirstName(e.target.value)
												}
											/>
										</div>
										<div>
											<label className="block text-sm text-slate-600 mb-1">
												Last Name
											</label>
											<input
												type="text"
												placeholder="Last Name"
												className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
												value={lastName}
												onChange={(e) =>
													setLastName(e.target.value)
												}
											/>
										</div>
									</>
								)}
								<div>
									<label className="block text-sm text-slate-600 mb-1">
										Email Address
									</label>
									<input
										type="email"
										placeholder="you@jivox.com"
										className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
										required
										value={emailId}
										onChange={(e) =>
											setEmail(e.target.value)
										}
									/>
								</div>
								<div>
									<label className="block text-sm text-slate-600 mb-1">
										Password
									</label>
									<input
										type="password"
										placeholder="••••••••"
										className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
										required
										value={password}
										onChange={(e) =>
											setPassword(e.target.value)
										}
									/>
								</div>
								<div className="mt-4 text-right">
									<button
										type="button"
										className="text-sm text-purple-600 hover:underline"
									>
										<span>Forgot password?</span>
									</button>
								</div>
								{/* {backendError && (
									<div className="rounded-md bg-red-5 border border-red-600 p-2 text-sm text-red-600">
										{backendError}
									</div>
								)} */}
								<button
									type="submit"
									disabled={isLoading}
									className="w-full bg-[#8b3cf1] hover:bg-[#7a2de3] text-white py-2.5 rounded-md font-medium transition"
								>
									{isLoading
										? "Processing..."
										: isLoginForm
										? "Sign Up"
										: "Sign In"}
								</button>
							</form>

							<div className="mt-4 text-center">
								<button
									type="button"
									className="text-sm text-purple-600 hover:underline"
									onClick={() =>
										setIsLogInForm((val) => !val)
									}
								>
									{isLoginForm
										? "Existing? Sign in"
										: "Don’t have an account? Sign Up"}
								</button>
							</div>

							<div className="mt-8 text-center text-xs text-slate-400">
								© 2025 Asset Source Manager. All rights
								reserved.
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LoginPage;