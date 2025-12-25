import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
const api = createApi({
	reducerPath: "api",
	baseQuery: fetchBaseQuery({
		baseUrl: "http://localhost:5000/api/",
		credentials: "include",
	}),
	tagTypes: ["User", "AssetSources"],
	endpoints: () => ({}),
});
export default api;
