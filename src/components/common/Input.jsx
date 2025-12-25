import React from "react";

const LoginPage = ({ onLogin }) => {
	const handleSubmit = (e) => {
		e.preventDefault();
		onLogin();
	};

	return (
		<div
			className="sticky min-h-screen w-full bg-no-repeat bg-cover bg-center"
			style={{
				backgroundImage:
					"url('https://cdn.jivox.com/files/57886/updatedLogin%20BG.png')",
			}}
		>
			{/* LOGO */}
			<div className="absolute top-6 left-8 z-40">
				<img
					src="https://jvx.app.jivox.com/studio/images/jivox_logo.png"
					alt="Jivox"
					className="h-8"
				/>
			</div>

			{/* LEFT TEXT */}
			<div className="relative top-24 left-50 md:left-80 z-30 max-w-lg">
				<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-4xl font-bold text-slate-900 leading-snug">
					Build Smarter <br /> Asset Sources, Faster.
				</h1>
			</div>

			{/* LOGIN CARD */}
			<div className="relative z-40 min-h-screen flex items-center justify-center px-4 sm:px-8">
				<div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 items-center gap-8">
					<div className="hidden md:block">
						{/* Empty left column for spacing */}
					</div>

					<div className="flex justify-center md:justify-end">
						<div className="w-full max-w-sm bg-white rounded-xl shadow-xl px-6 sm:px-8 py-8 sm:py-10">
							<h2 className="text-lg font-semibold text-slate-900 mb-6">
								Sign In
							</h2>

							<form onSubmit={handleSubmit} className="space-y-5">
								<div>
									<label className="block text-sm text-slate-600 mb-1">
										Email Address
									</label>
									<input
										type="email"
										placeholder="you@jivox.com"
										className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
										required
									/>
								</div>

								<div>
									<label className="block text-sm text-slate-600 mb-1">
										Password
									</label>
									<input
										type="password"
										placeholder="••••••••"
										className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
										required
									/>
								</div>

								<button
									type="submit"
									className="w-full bg-[#8b3cf1] hover:bg-[#7a2de3] text-white py-2.5 rounded-md font-medium transition"
								>
									Sign In
								</button>
							</form>

							<div className="mt-4 text-center">
								<button
									type="button"
									className="text-sm text-purple-600 hover:underline"
								>
									Forgot password?
								</button>
							</div>

							<div className="mt-8 text-center text-xs text-slate-400">
								© 2025 Asset Source Creator. All rights
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
