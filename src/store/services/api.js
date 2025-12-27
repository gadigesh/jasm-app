import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_URL } from "../../utils/constants";
const api = createApi({
	reducerPath: "api",
	baseQuery: fetchBaseQuery({
		baseUrl: BASE_URL,
		credentials: "include",
	}),
	tagTypes: ["User", "AssetSources"],
	endpoints: () => ({}),
});
export default api;
