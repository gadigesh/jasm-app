import React, { useMemo, useState } from "react";
import {
	ArrowLeft,
	Check,
	ExternalLink,
	Loader2,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
	useGetAssetSourceQuery,
	useUpdateAssetSourceRowsMutation,
} from "../../store/services/assetUpload";
import { useGetMeQuery } from "../../store/services/userAuthApi";
import { clearEditDraft } from "../../utils/editDraftStorage";
import { showError, showSuccess } from "../../utils/toastMsg";

const REVIEW_STORAGE_PREFIX = "jasm:asset-source-review:";

const readStoredReview = (id) => {
	if (typeof window === "undefined" || !id) return null;
	try {
		const raw = window.sessionStorage.getItem(
			`${REVIEW_STORAGE_PREFIX}${id}`
		);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
};

const formatValue = (value) => {
	const text = String(value ?? "").trim();
	return text || "—";
};

const isImageChange = (change) =>
	/image|bg/i.test(String(change?.column || "")) ||
	/^https?:\/\//i.test(String(change?.previousValue || "")) ||
	/^https?:\/\//i.test(String(change?.updatedValue || ""));

const isImageUrl = (value) => /^https?:\/\//i.test(String(value || ""));

const statusStyles = {
	Added: "text-emerald-600",
	Modified: "text-amber-500",
	Removed: "text-red-500",
};

const ImageValue = ({ value, label }) => {
	const text = String(value || "").trim();
	if (!isImageUrl(text)) {
		return <span className="text-xs text-gray-400">—</span>;
	}

	return (
		<div className="flex min-h-24 flex-col gap-1">
			<span className="text-[10px] font-medium text-gray-400">{label}</span>
			<img
				src={text}
				alt={label}
				className="h-20 w-32 rounded border border-gray-200 bg-gray-50 object-contain"
						width="128"
						height="80"
						loading="lazy"
						decoding="async"
				onError={(event) => {
					event.currentTarget.style.display = "none";
				}}
			/>
		</div>
	);
};

const AssetSourceReviewChanges = () => {
	const { id } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const [isConfirming, setIsConfirming] = useState(false);
	const { data: asset, isLoading: isAssetLoading } =
		useGetAssetSourceQuery(id, { skip: !id });
	const { data: meData } = useGetMeQuery();
	const [updateRows] = useUpdateAssetSourceRowsMutation();

	const review = useMemo(
		() => location.state?.review || readStoredReview(id) || {},
		[location.state?.review, id]
	);
	const changes = useMemo(
		() => (Array.isArray(review.changes) ? review.changes : []),
		[review.changes]
	);
	const edits = Array.isArray(review.edits) ? review.edits : [];
	const fieldChanges = changes.filter((change) => !isImageChange(change));
	const imageMappings = changes.filter(isImageChange);
	const counts = useMemo(
		() => ({
			added: changes.filter((change) => change.status === "Added").length,
			modified: changes.filter((change) => change.status === "Modified")
				.length,
			removed: changes.filter((change) => change.status === "Removed")
				.length,
		}),
		[changes]
	);

	const accountId = String(
		asset?.accountId?._id ||
			asset?.accountId ||
			meData?.activeAccount?._id ||
			""
	);
	const assetName = asset?.name || review.assetName || "Asset Source";
	const campaignName =
		asset?.copyMatrixName || review.campaignName || "—";
	const updatedAt = asset?.updatedAt
		? new Date(asset.updatedAt).toLocaleString()
		: "—";

	const clearReview = () => {
		try {
			window.sessionStorage.removeItem(`${REVIEW_STORAGE_PREFIX}${id}`);
		} catch {
			// Ignore storage cleanup failures.
		}
	};

	const handleBackToEdit = () => {
		clearReview();
		navigate(`/asset-sources/${id}/preview`, { replace: true });
	};

	const handleGoToAssetSources = () => {
		clearReview();
		navigate("/asset-sources", { replace: true });
	};

	const handleConfirm = async () => {
		if (isConfirming) return;
		setIsConfirming(true);
		try {
			if (edits.length > 0) {
				await updateRows({ id, rows: edits }).unwrap();
			}
			clearEditDraft("as", accountId, { entityId: id });
			clearReview();
			showSuccess("Asset source updated successfully");
			navigate(`/asset-sources/${id}/success?mode=updated`, {
				replace: true,
			});
		} catch (error) {
			showError(error?.message || "Failed to update asset source");
		} finally {
			setIsConfirming(false);
		}
	};

	if (isAssetLoading) {
		return (
			<div className="flex min-h-full items-center justify-center">
				<Loader2 className="animate-spin text-violet-600" size={28} />
			</div>
		);
	}

	return (
		<div className="min-h-full bg-white px-4 py-4 sm:px-8">
			<div className="mx-auto max-w-[1180px]">
				<div className="mb-2 text-[10px] text-gray-400">
					Dashboard <span className="px-1">›</span> AS{" "}
					<span className="px-1">›</span> Asset Sources{" "}
					<span className="px-1">›</span>{" "}
					<span className="text-violet-600">Review Changes</span>
				</div>

				<div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
					<div>
						<h1 className="text-xl font-bold text-gray-800">
							Review Changes
						</h1>
						<p className="mt-1 text-xs text-gray-500">
							Review the changes before updating the asset source.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={handleBackToEdit}
							className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
						>
							<ArrowLeft size={14} />
							Go Back to Edit
						</button>
						<button
							type="button"
							onClick={handleGoToAssetSources}
							className="rounded-md border border-violet-300 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50"
						>
							Go To Asset Sources
						</button>
						<button
							type="button"
							onClick={handleConfirm}
							disabled={isConfirming}
							className="flex items-center gap-1.5 rounded-md bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60"
						>
							{isConfirming ? (
								<Loader2 size={14} className="animate-spin" />
							) : (
								<Check size={14} />
							)}
							Confirm and Update
						</button>
					</div>
				</div>

				<div className="grid gap-1 border-b border-gray-200 py-3 text-xs text-gray-600 sm:grid-cols-3">
					<p>
						<span className="font-semibold text-gray-700">Campaign:</span>{" "}
						{campaignName}
					</p>
					<p>
						<span className="font-semibold text-gray-700">
							Asset Source:
						</span>{" "}
						{assetName}
					</p>
					<p>
						<span className="font-semibold text-gray-700">
							Last updated:
						</span>{" "}
						{updatedAt}
					</p>
				</div>

				<div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-3">
					{[
						["added", "Added", "border-emerald-300 text-emerald-600"],
						["modified", "Modified", "border-amber-300 text-amber-500"],
						["removed", "Removed", "border-red-300 text-red-500"],
					].map(([key, label, styles]) => (
						<div
							key={key}
							className={`rounded-lg border px-4 py-3 ${styles}`}
						>
							<div className="text-xl font-semibold">{counts[key]}</div>
							<div className="text-xs">{label}</div>
						</div>
					))}
				</div>

				<ReviewSection
					title="Field Changes"
					subtitle="Review the modified asset source fields."
					emptyMessage="No non-image field changes."
					hasChanges={fieldChanges.length > 0}
				>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[680px] border-collapse text-xs">
							<thead>
								<tr className="bg-violet-50 text-left text-gray-600">
									<th className="px-3 py-2">Row Number</th>
									<th className="px-3 py-2">Field Name</th>
									<th className="px-3 py-2">Previous Value</th>
									<th className="px-3 py-2">Updated Value</th>
									<th className="px-3 py-2">Status</th>
								</tr>
							</thead>
							<tbody>
								{fieldChanges.map((change, index) => (
									<tr
										key={`${change.rowId}-${change.column}-${index}`}
										className="border-b border-gray-100"
									>
										<td className="px-3 py-3 text-gray-600">
											{formatValue(change.rowNumber)}
										</td>
										<td className="px-3 py-3 font-medium text-gray-700">
											{change.column}
										</td>
										<td className="max-w-[240px] px-3 py-3 text-gray-500">
											{formatValue(change.previousValue)}
										</td>
										<td className="max-w-[240px] px-3 py-3 text-gray-700">
											{formatValue(change.updatedValue)}
										</td>
										<td
											className={`px-3 py-3 font-semibold ${
												statusStyles[change.status] ||
												"text-gray-500"
											}`}
										>
											{change.status}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</ReviewSection>

				<ReviewSection
					title="Image Mapping"
					subtitle="Review image URL changes for the asset source."
					emptyMessage="No image mapping changes."
					hasChanges={imageMappings.length > 0}
				>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[680px] border-collapse text-xs">
							<thead>
								<tr className="bg-violet-50 text-left text-gray-600">
									<th className="px-3 py-2">Row Number</th>
									<th className="px-3 py-2">Field Name</th>
									<th className="px-3 py-2">Previous</th>
									<th className="px-3 py-2">New</th>
									<th className="px-3 py-2">Status</th>
								</tr>
							</thead>
							<tbody>
								{imageMappings.map((change, index) => (
									<tr
										key={`${change.rowId}-${change.column}-${index}`}
										className="border-b border-gray-100"
									>
										<td className="px-3 py-3 text-gray-600">
											{formatValue(change.rowNumber)}
										</td>
										<td className="px-3 py-3 font-medium text-violet-700">
											{change.column}
										</td>
										<td className="px-3 py-3">
											<ImageValue
												value={change.previousValue}
												label="Previous"
											/>
										</td>
										<td className="px-3 py-3">
											<ImageValue
												value={change.updatedValue}
												label="New"
											/>
										</td>
										<td
											className={`px-3 py-3 font-semibold ${
												statusStyles[change.status] ||
												"text-gray-500"
											}`}
										>
											{change.status}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</ReviewSection>

				<div className="flex justify-end border-t border-gray-200 py-4">
					<button
						type="button"
						onClick={handleGoToAssetSources}
						className="flex items-center gap-2 text-xs font-medium text-violet-700 hover:text-violet-900"
					>
						<ExternalLink size={14} />
						Go To Asset Sources
					</button>
				</div>
			</div>
		</div>
	);
};

const ReviewSection = ({
	title,
	subtitle,
	emptyMessage,
	hasChanges,
	children,
}) => {
	return (
		<section className="mb-5">
			<div className="mb-2">
				<h2 className="text-sm font-semibold text-gray-700">{title}</h2>
				<p className="text-[10px] text-gray-400">{subtitle}</p>
			</div>
			{hasChanges ? (
				children
			) : (
				<div className="rounded border border-dashed border-gray-200 px-4 py-8 text-center text-xs text-gray-400">
					{emptyMessage}
				</div>
			)}
		</section>
	);
};

export default AssetSourceReviewChanges;
