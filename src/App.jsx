import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./layouts/ProtectedRoute";
import Login from "./pages/auth/LoginPage";
import Dashboard from "./pages/dashboard/Dashboard";
import AssetSourceTemplate from "./pages/assetSources/AssetSourceTemplate";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ASCreateLayout from "./layouts/ASCreateLayout";
import AssetSourceList from "./pages/assetSources/AssetSourceList";

function AppContent() {
	return (
		<BrowserRouter>
			<Routes>
				{/* Public */}
				<Route path="/login" element={<Login />} />

				{/* Protected */}
				<Route element={<ProtectedRoute />}>
					<Route path="/" element={<MainLayout />}>
						<Route index element={<Dashboard />} />
						<Route path="dashboard" element={<Dashboard />} />
						<Route
							path="asset-sources/templates"
							element={<AssetSourceTemplate />}
						/>
						<Route
							path="asset-sources/create/:templateId"
							element={<ASCreateLayout />}
						>
							<Route index element={<AssetSourceList />} />
						</Route>
					</Route>
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

function App() {
	return (
		<Provider store={store}>
			<AppContent />
			<ToastContainer
				position="top-right"
				autoClose={3000}
				closeButton={false}
				hideProgressBar
				toastClassName="!bg-transparent !shadow-none"
				bodyClassName="p-0"
				style={{ zIndex: 99999 }}
			/>
		</Provider>
	);
}

export default App;
