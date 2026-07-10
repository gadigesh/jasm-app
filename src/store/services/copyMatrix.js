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

		addCopyMatrixRow: builder.mutation({
			query: ({ id, rowData }) => ({
				url: `/copy-matrix/${id}/rows/add`,
				method: "POST",
				body: { rowData },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
				{ type: "CopyMatrices", id },
			],
		}),

		addCopyMatrixColumn: builder.mutation({
			query: ({ id, columnName }) => ({
				url: `/copy-matrix/${id}/columns/add`,
				method: "POST",
				body: { columnName },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
				{ type: "CopyMatrices", id },
			],
		}),

		cloneCopyMatrixRow: builder.mutation({
			query: ({ id, sourceRowId }) => ({
				url: `/copy-matrix/${id}/rows/clone`,
				method: "POST",
				body: { sourceRowId },
			}),
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
				{ type: "CopyMatrices", id },
			],
		}),

		cloneCopyMatrixColumn: builder.mutation({
			query: ({ id, sourceColumn, newColumnName }) => ({
				url: `/copy-matrix/${id}/columns/clone`,
				method: "POST",
				body: { sourceColumn, newColumnName },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
				{ type: "CopyMatrices", id },
			],
		}),

		fillCopyMatrixColumnSequence: builder.mutation({
			query: ({ id, column, rowIds }) => ({
				url: `/copy-matrix/${id}/columns/fill-sequence`,
				method: "POST",
				body: { column, rowIds },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
			],
		}),

		copyCopyMatrixColumnFrom: builder.mutation({
			query: ({ id, targetColumn, sourceColumn, rowIds }) => ({
				url: `/copy-matrix/${id}/columns/copy-from`,
				method: "POST",
				body: { targetColumn, sourceColumn, rowIds },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
			],
		}),

		fillCopyMatrixColumnDate: builder.mutation({
			query: ({ id, column, dateValue, rowIds }) => ({
				url: `/copy-matrix/${id}/columns/fill-date`,
				method: "POST",
				body: { column, dateValue, rowIds },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
			],
		}),

		replaceCopyMatrixColumn: builder.mutation({
			query: ({ id, column, find, replace, mode, rowIds }) => ({
				url: `/copy-matrix/${id}/columns/replace`,
				method: "POST",
				body: { column, find, replace, mode, rowIds },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, arg) =>
				arg?.mode === "find"
					? []
					: [{ type: "CopyMatrixRows", id: arg.id }],
		}),

		applyCopyMatrixColumnChanges: builder.mutation({
			query: ({ id, column, changes }) => ({
				url: `/copy-matrix/${id}/columns/apply-changes`,
				method: "POST",
				body: { column, changes },
			}),
			transformResponse: (response) => response.data,
			async onQueryStarted(
				{ id, column, changes, page, limit },
				{ dispatch, queryFulfilled }
			) {
				if (!column || !Array.isArray(changes) || !changes.length) {
					return;
				}
				const valueById = new Map(
					changes.map((c) => [String(c.rowId), c.value ?? ""])
				);
				const patches = [];
				if (page != null && limit != null) {
					patches.push(
						dispatch(
							copyMatrixApi.util.updateQueryData(
								"getCopyMatrixRows",
								{ id, page, limit },
								(draft) => {
									if (!draft?.rows) return;
									for (const row of draft.rows) {
										const key = String(row._id);
										if (valueById.has(key)) {
											row[column] = valueById.get(key);
										}
									}
								}
							)
						)
					);
				}
				try {
					await queryFulfilled;
				} catch {
					patches.forEach((p) => p.undo());
				}
			},
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
			],
		}),

		renameCopyMatrixColumn: builder.mutation({
			query: ({ id, oldName, newName }) => ({
				url: `/copy-matrix/${id}/columns/rename`,
				method: "PUT",
				body: { oldName, newName },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
				{ type: "CopyMatrices", id },
			],
		}),

		deleteCopyMatrixColumn: builder.mutation({
			query: ({ id, column }) => ({
				url: `/copy-matrix/${id}/columns/delete`,
				method: "POST",
				body: { column },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "CopyMatrixRows", id },
				{ type: "CopyMatrices", id },
			],
		}),

		checkCopyMatrixUniqueColumn: builder.mutation({
			query: ({ id, column }) => ({
				url: `/copy-matrix/${id}/check-unique-column`,
				method: "POST",
				body: { column },
			}),
			transformResponse: (response) => response.data,
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
	useAddCopyMatrixRowMutation,
	useAddCopyMatrixColumnMutation,
	useCloneCopyMatrixRowMutation,
	useCloneCopyMatrixColumnMutation,
	useFillCopyMatrixColumnSequenceMutation,
	useCopyCopyMatrixColumnFromMutation,
	useFillCopyMatrixColumnDateMutation,
	useReplaceCopyMatrixColumnMutation,
	useApplyCopyMatrixColumnChangesMutation,
	useRenameCopyMatrixColumnMutation,
	useDeleteCopyMatrixColumnMutation,
	useCheckCopyMatrixUniqueColumnMutation,
	useSaveAndContinueCopyMatrixMutation,
} = copyMatrixApi;
