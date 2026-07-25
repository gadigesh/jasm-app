import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { showSuccess, showError } from "../../utils/toastMsg";
import { API_BASE_URL } from "../../utils/apiConfig";

const baseQuery = fetchBaseQuery({
	baseUrl: API_BASE_URL,
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
	tagTypes: ["User", "AssetSources", "AssetTemplates", "AssetUploads", "AssetSourceRows", "Accounts", "CopyMatrices", "CopyMatrixRows", "MindshareFolders"],
	endpoints: () => ({}),
});

export default api;
