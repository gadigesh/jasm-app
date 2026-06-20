import api from "./api";

const copyMatrixApi = api.injectEndpoints({
	endpoints: (builder) => ({
		getCopyMatrices: builder.query({
			query: (accountId) => `/copy-matrix/list/${accountId}`,
			transformResponse: (response) => response.data ?? [],
			providesTags: ["CopyMatrices"],
		}),

		getCopyMatrix: builder.query({
			query: (id) => `/copy-matrix/${id}`,
			transformResponse: (response) => response.data,
			providesTags: (_result, _error, id) => [
				{ type: "CopyMatrices", id },
			],
		}),

		getCopyMatrixRows: builder.query({
			query: ({ id, page = 1, limit = 50 }) =>
				`/copy-matrix/${id}/rows?page=${page}&limit=${limit}`,
			transformResponse: (response) => response.data,
			providesTags: (_result, _error, { id }) => [
				{ type: "CopyMatrixRows", id },
			],
		}),

		previewCopyMatrix: builder.mutation({
			query: (formData) => ({
				url: "/copy-matrix/preview",
				method: "POST",
				body: formData,
			}),
		}),

		getGsheetTabs: builder.mutation({
			query: (fileRef) => ({
				url: "/copy-matrix/gsheet/sheets",
				method: "POST",
				body: { fileRef },
			}),
			transformResponse: (response) => response.data,
		}),

		finishCopyMatrix: builder.mutation({
			query: ({ id, ...body }) => ({
				url: `/copy-matrix/${id}/finish`,
				method: "POST",
				body,
			}),
			invalidatesTags: (_r, _e, { id }) => [
				"CopyMatrices",
				{ type: "CopyMatrices", id },
				"CopyMatrixRows",
				{ type: "CopyMatrixRows", id },
				"AssetUploads",
			],
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					const assetUploadId = data?.data?.assetUploadId;
					if (assetUploadId) {
						dispatch(
							copyMatrixApi.util.invalidateTags([
								{ type: "AssetUploads", id: assetUploadId },
								{
									type: "AssetSourceRows",
									id: assetUploadId,
								},
							])
						);
					}
				} catch {
					// ignore
				}
			},
		}),

		updateCopyMatrixRows: builder.mutation({
			query: ({ id, rows }) => ({
				url: `/copy-matrix/${id}/rows`,
				method: "PUT",
				body: { rows },
			}),
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
				{ type: "CopyMatrices", id },
			],
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					const assetUploadId = data?.data?.assetUploadId;
					if (assetUploadId) {
						dispatch(
							copyMatrixApi.util.invalidateTags([
								{ type: "AssetUploads", id: assetUploadId },
								{
									type: "AssetSourceRows",
									id: assetUploadId,
								},
							])
						);
					}
				} catch {
					// ignore
				}
			},
		}),

		deleteCopyMatrix: builder.mutation({
			query: (id) => ({
				url: `/copy-matrix/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: ["CopyMatrices"],
		}),

		updateCopyMatrix: builder.mutation({
			query: ({ id, ...body }) => ({
				url: `/copy-matrix/${id}`,
				method: "PUT",
				body,
			}),
			invalidatesTags: ["CopyMatrices"],
		}),

		saveAndContinueCopyMatrix: builder.mutation({
			query: ({ id, rows = [] }) => ({
				url: `/copy-matrix/${id}/save-and-continue`,
				method: "POST",
				body: { rows },
			}),
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
				{ type: "CopyMatrices", id },
				"AssetUploads",
			],
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					const assetUploadId = data?.data?.assetUploadId;
					if (assetUploadId) {
						dispatch(
							copyMatrixApi.util.invalidateTags([
								{ type: "AssetUploads", id: assetUploadId },
								{
									type: "AssetSourceRows",
									id: assetUploadId,
								},
							])
						);
					}
				} catch {
					// ignore
				}
			},
		}),
	}),
	overrideExisting: true,
});

export const {
	useGetCopyMatricesQuery,
	useGetCopyMatrixQuery,
	useGetCopyMatrixRowsQuery,
	usePreviewCopyMatrixMutation,
	useGetGsheetTabsMutation,
	useFinishCopyMatrixMutation,
	useDeleteCopyMatrixMutation,
	useUpdateCopyMatrixRowsMutation,
	useUpdateCopyMatrixMutation,
	useSaveAndContinueCopyMatrixMutation,
} = copyMatrixApi;
