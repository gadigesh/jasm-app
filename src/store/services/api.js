import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { showSuccess, showError } from "../../utils/toastMsg";

const BASE_URL =
	process.env.NODE_ENV === "production"
		? "https://jasm-app-sever.onrender.com"
		: "http://localhost:3333";

const baseQuery = fetchBaseQuery({
	baseUrl: BASE_URL,
	credentials: "include",
});

const baseQueryWithInterceptor = async (args, api, extraOptions) => {
	const result = await baseQuery(args, api, extraOptions);

	// if (result.error) {
	// 	console.log(result.error);
	// 	const errorMessage = result.error.data?.message || "An error occurred ";
	// 	if (!extraOptions?.silent) {
	// 		showError(errorMessage);
	// 	}
	// } else if (result.data) {
	// 	if (api.type === "mutation" && !extraOptions?.silent) {
	// 		showSuccess("Operation successful");
	// 	}
	// }
	return result;
};

const api = createApi({
	reducerPath: "api",
	baseQuery: baseQueryWithInterceptor,
	tagTypes: ["User", "AssetSources"],
	endpoints: () => ({}),
});

export default api;
