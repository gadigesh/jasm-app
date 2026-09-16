import React, { useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useApplyAssetSourceRefreshMutation } from "../../store/services/assetUpload";
import {
	clearAssetSourceRefreshReview,
	readAssetSourceRefreshReview,
} from "../../utils/assetSourceRefresh";
import { showError, showSuccess } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

const formatValue = (value) => {
	const text = String(value ?? "").trim();
	return text || "—";
};

const statusStyles = {
	Added: "text-emerald-600",
	Modified: "text-amber-500",
	Removed: "text-red-500",
};

const AssetSourceRefreshReview = () => {
	const { id } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const [isApplying, setIsApplying] = useState(false);
	const [applyRefresh] = useApplyAssetSourceRefreshMutation();

	const review = useMemo(
		() =>
			location.state?.review ||
			readAssetSourceRefreshReview(id) ||
			{},
		[location.state?.review, id]
	);
	const changes = useMemo(
		() => (Array.isArray(review.changes) ? review.changes : []),
		[review.changes]
	);
	const counts = review.summary || {
		added: changes.filter((change) => change.status === "Added").length,
		modified: changes.filter((change) => change.status === "Modified")
			.length,
		removed: changes.filter((change) => change.status === "Removed")
			.length,
	};

	const goToEdit = (highlights = null) => {
		clearAssetSourceRefreshReview(id);
		navigate(`/asset-sources/${id}/preview`, {
			replace: true,
			state: highlights
				? { refreshHighlights: highlights, skipEditDraft: true }
				: { skipEditDraft: true },
		});
	};

	const handleReject = () => {
		goToEdit(null);
	};

	const handleApprove = async () => {
		if (isApplying) return;
		setIsApplying(true);
		try {
			const result = await applyRefresh(id).unwrap();
			showSuccess(
				result?.hasChanges === false
					? "Asset source is already up to date"
					: "Asset source updated from copy matrix"
			);
			goToEdit(result?.highlights || null);
		} catch (error) {
			showError(
				getApiErrorMessage(error, "Failed to apply copy matrix updates")
			);
		} finally {
			setIsApplying(false);
		}
	};

	return (
		<div className="min-h-full bg-white px-4 py-4 sm:px-8">
			<div className="mx-auto max-w-[1180px]">
				<div className="mb-2 text-[10px] text-gray-400">
					Dashboard <span className="px-1">›</span> Asset Sources{" "}
					<span className="px-1">›</span>{" "}
					<span className="text-violet-600">Review Updates</span>
				</div>

				<div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
					<div>
						<h1 className="text-xl font-bold text-gray-800">
							Review Copy Matrix Updates
						</h1>
						<p className="mt-1 text-xs text-gray-500">
							Approve to update this asset source in place, or
							reject to keep the current data. Both open the edit
							page.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={handleReject}
							disabled={isApplying}
							className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
						>
							<X size={14} />
							Reject
						</button>
						<button
							type="button"
							onClick={handleApprove}
							disabled={isApplying}
							className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
						>
							{isApplying ? (
								<Loader2 size={14} className="animate-spin" />
							) : (
								<Check size={14} />
							)}
							Approve
						</button>
					</div>
				</div>

				<div className="grid gap-1 border-b border-gray-200 py-3 text-xs text-gray-600 sm:grid-cols-3">
					<p>
						<span className="font-semibold text-gray-700">
							Asset Source:
						</span>{" "}
						{review.name || "—"}
					</p>
					<p>
						<span className="font-semibold text-gray-700">
							Copy Matrix:
						</span>{" "}
						{review.copyMatrixName || review.fileName || "—"}
					</p>
					<p>
						<span className="font-semibold text-gray-700">
							Rows:
						</span>{" "}
						{review.currentRowCount ?? "—"} →{" "}
						{review.sourceRowCount ?? "—"}
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
							<div className="text-xl font-semibold">
								{counts[key] || 0}
							</div>
							<div className="text-xs">{label}</div>
						</div>
					))}
				</div>

				<section className="mb-5">
					<div className="mb-2">
						<h2 className="text-sm font-semibold text-gray-700">
							Updated fields
						</h2>
						<p className="text-[10px] text-gray-400">
							These values changed in the linked copy matrix.
						</p>
					</div>
					{changes.length > 0 ? (
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
									{changes.map((change, index) => (
										<tr
											key={`${change.rowIndex}-${change.column}-${index}`}
											className="border-b border-gray-100"
										>
											<td className="px-3 py-3 text-gray-600">
												{formatValue(change.rowIndex)}
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
					) : (
						<div className="rounded border border-dashed border-gray-200 px-4 py-8 text-center text-xs text-gray-400">
							No copy matrix updates to review.
						</div>
					)}
				</section>
			</div>
		</div>
	);
};

export default AssetSourceRefreshReview;
