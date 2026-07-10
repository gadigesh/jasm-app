import React, { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useGetCopyMatrixQuery } from "../../store/services/copyMatrix";

const CopyMatrixWorkflow = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const readOnlyQuery = searchParams.get("mode") === "view";

	const { isLoading, isFetching, data: matrix } = useGetCopyMatrixQuery(id, {
		refetchOnMountOrArgChange: true,
	});

	const matrixReady = !isLoading && !isFetching && Boolean(matrix);

	useEffect(() => {
		if (!matrixReady) return;
		const query = readOnlyQuery ? "?mode=view" : "";
		navigate(`/copy-matrix/${id}/preview${query}`, { replace: true });
	}, [matrixReady, id, navigate, readOnlyQuery]);

	return (
		<div className="bg-white min-h-full flex items-center justify-center">
			<span className="loading loading-spinner loading-lg text-primary" />
		</div>
	);
};

export default CopyMatrixWorkflow;
