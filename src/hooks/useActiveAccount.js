import { useGetMeQuery } from "../store/services/userAuthApi";

const useActiveAccount = () => {
	const { data, isLoading } = useGetMeQuery();
	console.log("ME API DATA123:", data?.activeAccount?.accountName);

	return {
		account: data?.activeAccount?.accountName,
		isLoading,
	};
};
export default useActiveAccount;
