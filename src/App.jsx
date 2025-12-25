import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/auth/LoginPage";
import store from "./store/store";

import Dashboard from "./pages/dashboard/Dashboard";
import { Provider } from "react-redux";
function App() {
	return (
		<Provider store={store}>
			<BrowserRouter basename="/">
				<Routes>
					<Route path="/login" element={<Login />} />
				</Routes>
			</BrowserRouter>
		</Provider>
	);
}

export default App;
