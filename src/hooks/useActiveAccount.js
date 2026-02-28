import { useGetMeQuery } from "../store/services/userAuthApi";

const useActiveAccount = () => {
	const { data, isLoading } = useGetMeQuery();

	return {
		account: data?.activeAccount?.accountName,
		isLoading,
	};
};
export default useActiveAccount;
