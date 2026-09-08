import { Navigate, Outlet } from "react-router-dom";
import { useGetMeQuery } from "../store/services/userAuthApi";

const ProtectedRoute = () => {
	const { isLoading, isSuccess } = useGetMeQuery();

	if (!isLoading && !isSuccess) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
};

export default ProtectedRoute;
