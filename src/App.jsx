import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store";

import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./layouts/ProtectedRoute";

import Login from "./pages/auth/LoginPage";
import Dashboard from "./pages/dashboard/Dashboard";

function AppContent() {
	return (
		<BrowserRouter>
			<Routes>
				{/* Public */}
				<Route path="/login" element={<Login />} />

				{/* Protected */}
				<Route element={<ProtectedRoute />}>
					<Route path="/" element={<MainLayout />}>
						<Route path="dashboard" element={<Dashboard />} />
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
		</Provider>
	);
}

export default App;
