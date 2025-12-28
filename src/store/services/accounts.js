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
	}),
});

export const { useCreateAccountMutation, useGetAccountsQuery } = accountsApi;
