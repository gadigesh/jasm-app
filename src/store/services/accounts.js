import api from "../services/api";

const accountsApi = api.injectEndpoints({
	endpoints: (builder) => ({
		// GET ALL ACCOUNTS
		getAccounts: builder.query({
			query: () => "/accounts",
			providesTags: ["Accounts"],
		}),
		createAccount: builder.mutation({
			query: (account) => ({
				url: "/accounts/create",
				method: "POST",
				body: account,
			}),
			invalidatesTags: ["Accounts"],
		}),
		switchAccount: builder.mutation({
			query: (accountId) => ({
				url: "/switch-account",
				method: "POST",
				body: { accountId },
			}),
			invalidatesTags: ["User"], // 🔥 refetch /me
		}),
		// Cached per account; UI polls every hour and uploads invalidate
		getMindshareFolders: builder.query({
			query: (accountId) => `/accounts/${accountId}/mindshare/folders`,
			transformResponse: (response) => response.data,
			keepUnusedDataFor: 3600,
			providesTags: (_r, _e, accountId) => [
				{ type: "MindshareFolders", id: accountId },
			],
		}),
		getMindshareAssets: builder.query({
			query: ({
				accountId,
				page = 1,
				limit = 10,
				folder = "",
				search = "",
			}) => ({
				url: `/accounts/${accountId}/mindshare/assets`,
				params: {
					page,
					limit,
					...(folder ? { folder } : {}),
					...(search ? { search } : {}),
				},
			}),
			transformResponse: (response) => response.data,
			keepUnusedDataFor: 300,
		}),
	}),
});

export const {
	useCreateAccountMutation,
	useGetAccountsQuery,
	useSwitchAccountMutation,
	useGetMindshareFoldersQuery,
	useGetMindshareAssetsQuery,
} = accountsApi;
