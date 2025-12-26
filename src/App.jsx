import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Provider, useSelector } from "react-redux";
import store from "./store/store";

// Layouts & Protected Route
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./layouts/ProtectedRoute";

// Pages
import Login from "./pages/auth/LoginPage";
import Dashboard from "./pages/dashboard/Dashboard";
import AssetList from "./pages/assetSources/AssetList";
import AssetDetail from "./pages/assetSources/AssetDetail";

// Wizard Steps
import Step1Template from "./pages/assetSources/createASFlow/Step1Template";
import Step2Upload from "./pages/assetSources/createASFlow/Step2Template";
import Step3Mapping from "./pages/assetSources/createASFlow/Step3Template";
import Step4Success from "./pages/assetSources/createASFlow/Step4Template";

function AppContent() {
	// Get auth status from your Redux store
	const user = useSelector((store) => store.user);
	const isAuthenticated = !!user;

	return (
		<BrowserRouter basename="/">
			<Routes>
				{/* Public Route */}
				<Route
					path="/login"
					element={
						!isAuthenticated ? (
							<Login />
						) : (
							<Navigate to="/dashboard" />
						)
					}
				/>

				{/* Protected Routes (Requires Authentication) */}
				<Route
					element={
						<ProtectedRoute isAuthenticated={isAuthenticated} />
					}
				>
					<Route element={<MainLayout />}>
						<Route
							path="/"
							element={<Navigate to="/dashboard" replace />}
						/>
						<Route path="/dashboard" element={<Dashboard />} />

						{/* Asset Source Routes */}
						<Route path="/asset-sources">
							<Route index element={<AssetList />} />
							<Route path=":id" element={<AssetDetail />} />

							{/* Create Wizard Routes */}
							<Route
								path="create/template"
								element={<Step1Template />}
							/>
							<Route
								path="create/upload"
								element={<Step2Upload />}
							/>
							<Route
								path="create/mapping"
								element={<Step3Mapping />}
							/>
							<Route
								path="create/success"
								element={<Step4Success />}
							/>
						</Route>
					</Route>
				</Route>

				{/* Catch-all redirect */}
				<Route path="*" element={<Navigate to="/dashboard" />} />
			</Routes>
		</BrowserRouter>
	);
}

function App() {
	return (
		<Provider store={store}>
			<AppContent />
		</Provider>
	);
}

export default App;
