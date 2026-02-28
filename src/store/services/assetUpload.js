import api from "./api";

const assetUpload = api.injectEndpoints({
	endpoints: (builder) => ({
		// 1. GET ALL UPLOADS
		getAssetUploads: builder.query({
			query: () => "/assetSource", // Adjust path based on your backend routes
			providesTags: ["AssetUploads"], // Uses your existing tag
		}),

		// 2. RETRY / REPLACE FILE
		retryUpload: builder.mutation({
			query: ({ id, formData }) => ({
				url: `/assetSource/retry/${id}`,
				method: "PUT",
				body: formData,
			}),
			invalidatesTags: ["AssetUploads"], // Triggers refresh of getAssetUploads
		}),

		// 3. CREATE NEW UPLOAD
		uploadAssetSource: builder.mutation({
			query: (formData) => ({
				url: "/asset-upload",
				method: "POST",
				body: formData,
			}),
			invalidatesTags: ["AssetUploads"],
		}),
	}),
	overrideExisting: false,
});

export const {
	useGetAssetUploadsQuery,
	useRetryUploadMutation,
	useUploadAssetSourceMutation,
} = assetUpload;
