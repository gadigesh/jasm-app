import api from "./api";

const assetUpload = api.injectEndpoints({
	endpoints: (builder) => ({
		getAssetUploads: builder.query({
			query: (accountId) => `/list/${accountId}`,
			transformResponse: (response) => response.data ?? [],
			providesTags: () => [{ type: "AssetUploads", id: "LIST" }, "AssetUploads"],
		}),

		getAssetSourceDraft: builder.query({
			query: (accountId) => `/source/draft/${accountId}`,
			transformResponse: (response) => response.data ?? null,
			providesTags: (_r, _e, accountId) => [
				{ type: "AssetUploads", id: `DRAFT-${accountId}` },
			],
		}),

		saveAssetSourceDraft: builder.mutation({
			query: (id) => ({
				url: `/source/${id}/save-draft`,
				method: "POST",
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: ["AssetUploads", "CopyMatrices"],
		}),

		discardAssetSourceDraft: builder.mutation({
			query: (id) => ({
				url: `/source/${id}/discard-draft`,
				method: "POST",
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: ["AssetUploads", "CopyMatrices"],
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
				{ type: "AssetUploads", id: "LIST" },
				{ type: "AssetUploads", id },
				{ type: "AssetSourceRows", id },
				{ type: "CopyMatrices", id: "LIST" },
			],
		}),

		checkAssetSourceUniqueColumn: builder.mutation({
			query: ({ id, column, rows = [] }) => ({
				url: `/source/${id}/check-unique-column`,
				method: "POST",
				body: { column, rows },
			}),
			transformResponse: (response) => response.data,
		}),

		finishAssetSource: builder.mutation({
			query: ({ id, ...body }) => ({
				url: `/source/${id}/finish`,
				method: "POST",
				body,
			}),
			invalidatesTags: (_r, _e, { id }) => [
				"AssetUploads",
				{ type: "AssetUploads", id: "LIST" },
				{ type: "AssetUploads", id },
				{ type: "AssetSourceRows", id },
				{ type: "CopyMatrices", id: "LIST" },
				"CopyMatrices",
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

		fillAssetSourceColumnSequence: builder.mutation({
			query: ({ id, column, rowIds }) => ({
				url: `/source/${id}/columns/fill-sequence`,
				method: "POST",
				body: { column, rowIds },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
			],
		}),

		copyAssetSourceColumnFrom: builder.mutation({
			query: ({
				id,
				targetColumn,
				sourceColumn,
				template,
				splitBy,
				rowIds,
			}) => ({
				url: `/source/${id}/columns/copy-from`,
				method: "POST",
				body: {
					targetColumn,
					sourceColumn,
					template,
					splitBy,
					rowIds,
				},
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
			],
		}),

		generateAssetSourceColumnText: builder.mutation({
			query: ({ id, targetColumn, template, rowIds }) => ({
				url: `/source/${id}/columns/generate-text`,
				method: "POST",
				body: {
					targetColumn,
					template,
					rowIds,
				},
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
			],
		}),

		uploadAssetSourceColumnImages: builder.mutation({
			query: ({ id, files, folder, targetColumn, rowIds }) => {
				const body = new FormData();
				if (folder) {
					body.append("folder", folder);
				}
				for (const file of files || []) {
					body.append("files", file);
				}
				const params = new URLSearchParams();
				if (targetColumn) {
					params.set("targetColumn", targetColumn);
				}
				if (Array.isArray(rowIds) && rowIds.length > 0) {
					params.set("rowIds", JSON.stringify(rowIds));
				}
				if (folder) {
					params.set("folder", folder);
				}
				const qs = params.toString();
				return {
					url: `/source/${id}/columns/update-images/upload${
						qs ? `?${qs}` : ""
					}`,
					method: "POST",
					body,
				};
			},
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id, rowIds }) =>
				Array.isArray(rowIds) && rowIds.length > 0
					? [
							"MindshareFolders",
							{ type: "AssetSourceRows", id },
							"AssetUploads",
					  ]
					: ["MindshareFolders"],
		}),

		setAssetSourceColumnCdnUrl: builder.mutation({
			query: ({ id, targetColumn, rowIds, cdnUrl }) => ({
				url: `/source/${id}/columns/update-images/set-cdn`,
				method: "POST",
				body: { targetColumn, rowIds, cdnUrl },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
				"AssetUploads",
			],
		}),

		getAssetSourceImageFolders: builder.query({
			query: (id) => `/source/${id}/columns/update-images/folders`,
			transformResponse: (response) => response.data,
		}),

		applyAssetSourceColumnImages: builder.mutation({
			query: ({
				id,
				targetColumn,
				prefixColumn,
				template,
				folder,
				rowIds,
				dryRun,
				rowSnapshots,
			}) => ({
				url: `/source/${id}/columns/update-images/apply`,
				method: "POST",
				body: {
					targetColumn,
					prefixColumn,
					template,
					folder,
					rowIds,
					dryRun,
					rowSnapshots,
				},
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id, dryRun }) =>
				dryRun
					? []
					: [{ type: "AssetSourceRows", id }, "AssetUploads"],
		}),

		fillAssetSourceColumnDate: builder.mutation({
			query: ({ id, column, dateValue, rowIds }) => ({
				url: `/source/${id}/columns/fill-date`,
				method: "POST",
				body: { column, dateValue, rowIds },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
			],
		}),

		replaceAssetSourceColumn: builder.mutation({
			query: ({ id, column, find, replace, mode, rowIds }) => ({
				url: `/source/${id}/columns/replace`,
				method: "POST",
				body: { column, find, replace, mode, rowIds },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, arg) =>
				arg?.mode === "find"
					? []
					: [{ type: "AssetSourceRows", id: arg.id }],
		}),

		applyAssetSourceColumnChanges: builder.mutation({
			query: ({ id, column, changes }) => ({
				url: `/source/${id}/columns/apply-changes`,
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
							assetUpload.util.updateQueryData(
								"getAssetSourceRows",
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
				{ type: "AssetSourceRows", id },
			],
		}),

		renameAssetSourceColumn: builder.mutation({
			query: ({ id, oldName, newName }) => ({
				url: `/source/${id}/columns/rename`,
				method: "PUT",
				body: { oldName, newName },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
				{ type: "AssetUploads", id },
			],
		}),

		deleteAssetSourceColumn: builder.mutation({
			query: ({ id, column }) => ({
				url: `/source/${id}/columns/delete`,
				method: "POST",
				body: { column },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
				{ type: "AssetUploads", id },
			],
		}),

		cloneAssetSourceColumn: builder.mutation({
			query: ({ id, sourceColumn, newColumnName }) => ({
				url: `/source/${id}/columns/clone`,
				method: "POST",
				body: { sourceColumn, newColumnName },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
				{ type: "AssetUploads", id },
			],
		}),

		reorderAssetSourceColumns: builder.mutation({
			query: ({ id, columns }) => ({
				url: `/source/${id}/columns/reorder`,
				method: "PUT",
				body: { columns },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
				{ type: "AssetUploads", id },
			],
		}),

		addAssetSourceRow: builder.mutation({
			query: ({ id, rowData }) => ({
				url: `/source/${id}/rows/add`,
				method: "POST",
				body: { rowData },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
				{ type: "AssetUploads", id },
			],
		}),

		deleteAssetSourceRow: builder.mutation({
			query: ({ id, rowId }) => ({
				url: `/source/${id}/rows/${rowId}`,
				method: "DELETE",
			}),
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
				{ type: "AssetUploads", id },
			],
		}),

		addAssetSourceColumn: builder.mutation({
			query: ({ id, columnName }) => ({
				url: `/source/${id}/columns/add`,
				method: "POST",
				body: { columnName },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
				{ type: "AssetUploads", id },
			],
		}),

		cloneAssetSourceRow: builder.mutation({
			query: ({ id, sourceRowId }) => ({
				url: `/source/${id}/rows/clone`,
				method: "POST",
				body: { sourceRowId },
			}),
			transformResponse: (response) => response.data,
			invalidatesTags: (_r, _e, { id }) => [
				{ type: "AssetSourceRows", id },
				{ type: "AssetUploads", id },
			],
		}),
	}),
	overrideExisting: true,
});

export const {
	useGetAssetUploadsQuery,
	useGetAssetSourceDraftQuery,
	useLazyGetAssetSourceDraftQuery,
	useSaveAssetSourceDraftMutation,
	useDiscardAssetSourceDraftMutation,
	useGetAssetSourceQuery,
	useGetAssetSourceRowsQuery,
	useUpdateAssetSourceRowsMutation,
	useCheckAssetSourceUniqueColumnMutation,
	useFinishAssetSourceMutation,
	useDeleteAssetSourceMutation,
	useCloneAssetSourceMutation,
	useRetryUploadMutation,
	useUploadAssetSourceMutation,
	useFillAssetSourceColumnSequenceMutation,
	useCopyAssetSourceColumnFromMutation,
	useGenerateAssetSourceColumnTextMutation,
	useUploadAssetSourceColumnImagesMutation,
	useSetAssetSourceColumnCdnUrlMutation,
	useGetAssetSourceImageFoldersQuery,
	useLazyGetAssetSourceImageFoldersQuery,
	useApplyAssetSourceColumnImagesMutation,
	useFillAssetSourceColumnDateMutation,
	useReplaceAssetSourceColumnMutation,
	useApplyAssetSourceColumnChangesMutation,
	useRenameAssetSourceColumnMutation,
	useDeleteAssetSourceColumnMutation,
	useCloneAssetSourceColumnMutation,
	useReorderAssetSourceColumnsMutation,
	useAddAssetSourceRowMutation,
	useDeleteAssetSourceRowMutation,
	useAddAssetSourceColumnMutation,
	useCloneAssetSourceRowMutation,
} = assetUpload;
