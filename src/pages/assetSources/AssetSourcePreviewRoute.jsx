import { useParams, useLocation, useSearchParams } from "react-router-dom";
import AssetSourcePreview from "./AssetSourcePreview";

const AssetSourcePreviewRoute = () => {
	const { id } = useParams();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const readOnly = searchParams.get("mode") === "view";
	const remountKey = location.state?.syncedAt ?? id;

	return (
		<AssetSourcePreview key={remountKey} readOnly={readOnly} />
	);
};

export default AssetSourcePreviewRoute;
