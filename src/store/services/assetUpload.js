import api from "./api";

const assetUpload = api.injectEndpoints({
	endpoints: (builder) => ({
		// 1. GET ALL UPLOADS — requires accountId from active session
		getAssetUploads: builder.query({
			query: (accountId) => `/list/${accountId}`,
			transformResponse: (response) => response.data ?? [],
			providesTags: ["AssetUploads"],
		}),

		// 2. RETRY / REPLACE FILE — PUT /retry/:id
		retryUpload: builder.mutation({
			query: ({ id, formData }) => ({
				url: `/retry/${id}`,
				method: "PUT",
				body: formData,
			}),
			invalidatesTags: ["AssetUploads"],
		}),

		// 3. CREATE NEW UPLOAD — POST /upload
		uploadAssetSource: builder.mutation({
			query: (formData) => ({
				url: "/upload",
				method: "POST",
				body: formData,
			}),
			invalidatesTags: ["AssetUploads"],
		}),
	}),
	overrideExisting: true,
});

export const {
	useGetAssetUploadsQuery,
	useRetryUploadMutation,
	useUploadAssetSourceMutation,
} = assetUpload;
