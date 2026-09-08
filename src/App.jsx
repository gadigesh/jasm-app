import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./layouts/ProtectedRoute";

const Login = lazy(() => import("./pages/auth/LoginPage"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const AssetSourceList = lazy(() =>
	import("./pages/assetSources/AssetSourceList")
);
const AssetSourcePreviewRoute = lazy(() =>
	import("./pages/assetSources/AssetSourcePreviewRoute")
);
const AssetSourceCreatedSuccess = lazy(() =>
	import("./pages/assetSources/AssetSourceCreatedSuccess")
);
const AssetSourceReviewChanges = lazy(() =>
	import("./pages/assetSources/AssetSourceReviewChanges")
);
const CopyMatrixList = lazy(() =>
	import("./pages/copyMatrix/CopyMatrixList")
);
const CopyMatrixPreview = lazy(() =>
	import("./pages/copyMatrix/CopyMatrixPreview")
);
const CopyMatrixWorkflow = lazy(() =>
	import("./pages/copyMatrix/CopyMatrixWorkflow")
);

const RouteLoading = () => (
	<div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
		Loading…
	</div>
);

function AppContent() {
	return (
		<BrowserRouter>
			<Suspense fallback={<RouteLoading />}>
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
								path="asset-sources/:id/success"
								element={<AssetSourceCreatedSuccess />}
							/>
							<Route
								path="asset-sources/:id/review"
								element={<AssetSourceReviewChanges />}
							/>
							<Route
								path="asset-sources"
								element={<AssetSourceList />}
							/>
						</Route>
					</Route>
				</Routes>
			</Suspense>
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
