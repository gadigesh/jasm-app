import api from "./api";

function mapCopyMatrixListStatus(status) {
	if (status === "completed" || status === "partial_success") return "Active";
	if (status === "failed") return "Inactive";
	if (status === "processing" || status === "pending" || status === "draft") {
		return "Processing";
	}
	return status;
}

const copyMatrixApi = api.injectEndpoints({
	endpoints: (builder) => ({
		getCopyMatrices: builder.query({
			query: (accountId) => `/copy-matrix/list/${accountId}`,
			serializeQueryArgs: ({ queryArgs }) =>
				queryArgs != null ? String(queryArgs) : queryArgs,
			transformResponse: (response) => response.data ?? [],
			providesTags: () => [{ type: "CopyMatrices", id: "LIST" }],
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
				{ type: "CopyMatrices", id: "LIST" },
				{ type: "CopyMatrices", id },
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
			invalidatesTags: [{ type: "CopyMatrices", id: "LIST" }],
		}),

		cloneCopyMatrix: builder.mutation({
			query: ({ id, name }) => ({
				url: `/copy-matrix/${id}/clone`,
				method: "POST",
				body: { name },
			}),
			invalidatesTags: [
				{ type: "CopyMatrices", id: "LIST" },
				"CopyMatrixRows",
			],
		}),

		updateCopyMatrix: builder.mutation({
			query: ({ id, accountId: _accountId, ...body }) => ({
				url: `/copy-matrix/${id}`,
				method: "PUT",
				body,
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: [],
			async onQueryStarted(
				{ id, accountId, name, status },
				{ dispatch, queryFulfilled, getState }
			) {
				try {
					const { data: updated } = await queryFulfilled;
					const patch = {
						...(updated || {}),
						...(name?.trim() ? { name: name.trim() } : {}),
						...(status ? { status } : {}),
					};

					if (Object.keys(patch).length > 0) {
						applyCopyMatrixUpdateToCaches(
							dispatch,
							getState,
							id,
							patch,
							accountId
						);
					}
				} catch {
					dispatch(
						copyMatrixApi.util.invalidateTags([
							{ type: "CopyMatrices", id: "LIST" },
						])
					);
				}
			},
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

function patchCopyMatricesListCache(dispatch, getState, id, patchFn) {
	const cachedArgs = copyMatrixApi.util.selectCachedArgsForQuery(
		getState(),
		"getCopyMatrices"
	);

	if (!cachedArgs.length) return false;

	for (const accountId of cachedArgs) {
		dispatch(
			copyMatrixApi.util.updateQueryData(
				"getCopyMatrices",
				accountId,
				(draft) => {
					const item = draft.find((m) => String(m._id) === String(id));
					if (item) patchFn(item);
				}
			)
		);
	}

	return true;
}

export function applyCopyMatrixUpdateToCaches(
	dispatch,
	getState,
	id,
	updated,
	accountId = null
) {
	if (!updated) return;

	const patchItem = (item) => {
		if (updated.name) item.name = updated.name;
		if (updated.status) {
			item.rawStatus = updated.status;
			item.status = mapCopyMatrixListStatus(updated.status);
		}
		if (updated.updatedAt) item.updatedAt = updated.updatedAt;
	};

	if (accountId != null) {
		dispatch(
			copyMatrixApi.util.updateQueryData(
				"getCopyMatrices",
				String(accountId),
				(draft) => {
					const item = draft.find((m) => String(m._id) === String(id));
					if (item) patchItem(item);
				}
			)
		);
	}

	patchCopyMatricesListCache(dispatch, getState, id, patchItem);

	dispatch(
		copyMatrixApi.util.updateQueryData("getCopyMatrix", id, (draft) => {
			if (!draft) return;
			if (updated.name) draft.name = updated.name;
			if (updated.status) draft.status = updated.status;
			if (updated.updatedAt) draft.updatedAt = updated.updatedAt;
		})
	);
}

export const {
	useGetCopyMatricesQuery,
	useGetCopyMatrixQuery,
	useGetCopyMatrixRowsQuery,
	usePreviewCopyMatrixMutation,
	useGetGsheetTabsMutation,
	useFinishCopyMatrixMutation,
	useDeleteCopyMatrixMutation,
	useCloneCopyMatrixMutation,
	useUpdateCopyMatrixRowsMutation,
	useUpdateCopyMatrixMutation,
	useSaveAndContinueCopyMatrixMutation,
} = copyMatrixApi;
