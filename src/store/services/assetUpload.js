import api from "./api";

const assetUpload = api.injectEndpoints({
	endpoints: (builder) => ({
		getAssetUploads: builder.query({
			query: (accountId) => `/list/${accountId}`,
			transformResponse: (response) => response.data ?? [],
			providesTags: ["AssetUploads"],
		}),

		getAssetSource: builder.query({
			query: (id) => `/source/${id}`,
			transformResponse: (response) => response.data,
			providesTags: (_result, _error, id) => [
				{ type: "AssetUploads", id },
			],
		}),

		getAssetSourceRows: builder.query({
			query: ({ id, page = 1, limit = 50 }) =>
				`/source/${id}/rows?page=${page}&limit=${limit}`,
			transformResponse: (response) => response.data,
			providesTags: (_result, _error, { id }) => [
				{ type: "AssetSourceRows", id },
			],
		}),

		updateAssetSourceRows: builder.mutation({
			query: ({ id, rows }) => ({
				url: `/source/${id}/rows`,
				method: "PUT",
				body: { rows },
			}),
			invalidatesTags: (_r, _e, { id }) => [
				"AssetUploads",
				{ type: "AssetUploads", id },
				{ type: "AssetSourceRows", id },
			],
		}),

		finishAssetSource: builder.mutation({
			query: ({ id, ...body }) => ({
				url: `/source/${id}/finish`,
				method: "POST",
				body,
			}),
			invalidatesTags: (_r, _e, { id }) => [
				"AssetUploads",
				{ type: "AssetUploads", id },
				{ type: "AssetSourceRows", id },
			],
		}),

		deleteAssetSource: builder.mutation({
			query: (id) => ({
				url: `/source/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: ["AssetUploads", "CopyMatrices"],
		}),

		cloneAssetSource: builder.mutation({
			query: ({ id, name }) => ({
				url: `/source/${id}/clone`,
				method: "POST",
				body: { name },
			}),
			invalidatesTags: ["AssetUploads", "AssetSourceRows"],
		}),

		retryUpload: builder.mutation({
			query: ({ id, formData }) => ({
				url: `/retry/${id}`,
				method: "PUT",
				body: formData,
			}),
			invalidatesTags: ["AssetUploads"],
		}),

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
	useGetAssetSourceQuery,
	useGetAssetSourceRowsQuery,
	useUpdateAssetSourceRowsMutation,
	useFinishAssetSourceMutation,
	useDeleteAssetSourceMutation,
	useCloneAssetSourceMutation,
	useRetryUploadMutation,
	useUploadAssetSourceMutation,
} = assetUpload;
