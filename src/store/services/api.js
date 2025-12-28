import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../../utils/constants";
import { showSuccess, showError } from "../../utils/toastMsg";

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
	// 	// Optional: Handling global success message if needed
	// 	if (api.type === "mutation" && !extraOptions?.silent) {
	// 		// We can potentially show success messages here if desired
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
