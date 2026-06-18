import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./layouts/ProtectedRoute";
import Login from "./pages/auth/LoginPage";
import Dashboard from "./pages/dashboard/Dashboard";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AssetSourceList from "./pages/assetSources/AssetSourceList";
import AssetSourcePreviewRoute from "./pages/assetSources/AssetSourcePreviewRoute";
import CopyMatrixList from "./pages/copyMatrix/CopyMatrixList";
import CopyMatrixPreview from "./pages/copyMatrix/CopyMatrixPreview";
import CopyMatrixWorkflow from "./pages/copyMatrix/CopyMatrixWorkflow";

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
							path="copy-matrix"
							element={<CopyMatrixList />}
						/>
						<Route
							path="copy-matrix/:id/preview"
							element={<CopyMatrixPreview />}
						/>
						<Route
							path="copy-matrix/:id/workflow"
							element={<CopyMatrixWorkflow />}
						/>
						<Route
							path="asset-sources/:id/preview"
							element={<AssetSourcePreviewRoute />}
						/>
						<Route
							path="asset-sources"
							element={<AssetSourceList />}
						/>
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
