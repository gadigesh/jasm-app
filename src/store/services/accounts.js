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
	}),
});

export const {
	useCreateAccountMutation,
	useGetAccountsQuery,
	useSwitchAccountMutation,
} = accountsApi;
