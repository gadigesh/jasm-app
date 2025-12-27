import { Navigate, Outlet } from "react-router-dom";
import { useGetMeQuery } from "../store/services/userAuthApi";

const ProtectedRoute = () => {
	const { isLoading, isSuccess } = useGetMeQuery();

	if (isLoading) {
		return <p>Checking authentication...</p>;
	}

	return isSuccess ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
