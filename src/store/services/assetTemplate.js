import api from "../services/api";

export const assetTemplatesApi = api.injectEndpoints({
	endpoints: (builder) => ({
		getAssetTemplates: builder.query({
			query: () => "/asset-sources/templates",
			providesTags: ["AssetTemplates"],
		}),
	}),
	overrideExisting: false,
});

export const { useGetAssetTemplatesQuery } = assetTemplatesApi;
