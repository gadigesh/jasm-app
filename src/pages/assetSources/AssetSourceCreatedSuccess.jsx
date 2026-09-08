import React, { useState } from "react";
import { CheckCircle2, Download, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
	useCreateAssetSourceGoogleSheetMutation,
	useGetAssetSourceQuery,
} from "../../store/services/assetUpload";
import { downloadFromApi } from "../../utils/downloadCsv";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { showError, showSuccess } from "../../utils/toastMsg";

const AssetSourceCreatedSuccess = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [downloading, setDownloading] = useState("");
	const [createGoogleSheet, { isLoading: isCreatingGoogleSheet }] =
		useCreateAssetSourceGoogleSheetMutation();
	const { data: asset, isLoading, isError } = useGetAssetSourceQuery(id, {
		skip: !id,
	});

	const assetName = asset?.name || "Asset Source";
	const isUpdated = searchParams.get("mode") === "updated";

	const handleOpenGoogleSheet = async () => {
		if (isCreatingGoogleSheet) return;
		const popup = window.open("about:blank", "_blank");
		if (!popup) {
			showError("Please allow popups to open the Google Sheet");
			return;
		}

		try {
			const result = await createGoogleSheet(id).unwrap();
			if (result?.authorizationRequired && result.authorizationUrl) {
				popup.location.href = result.authorizationUrl;
				showSuccess(
					"Authorize Google access in the new window, then click Open GSheet again."
				);
				return;
			}
			if (!result?.url) {
				throw new Error("Google Sheet URL was not returned");
			}
			popup.location.href = result.url;
		} catch (error) {
			popup.close();
			showError(
				getApiErrorMessage(
					error,
					isUpdated
						? "Failed to update Google Sheet"
						: "Failed to create Google Sheet"
				)
			);
		}
	};

	const handleDownload = async (format) => {
		if (downloading) return;
		setDownloading(format);
		try {
			const isExcel = format === "excel";
			await downloadFromApi(
				isExcel
					? `/source/${id}/export/excel`
					: `/source/${id}/export`,
				assetName,
				isExcel ? ".xlsx" : ".csv"
			);
			showSuccess(`Download ${isExcel ? "Excel" : "CSV"} started`);
		} catch (error) {
			showError(error?.message || "Failed to download asset source");
		} finally {
			setDownloading("");
		}
	};

	if (isLoading) {
		return (
			<div className="flex min-h-full items-center justify-center">
				<Loader2 className="animate-spin text-violet-600" size={28} />
			</div>
		);
	}

	if (isError || !asset) {
		return (
			<div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
				<p className="text-sm text-red-600">
					Unable to load the created asset source.
				</p>
				<button
					type="button"
					onClick={() => navigate("/asset-sources", { replace: true })}
					className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700"
				>
					Back to Asset Sources
				</button>
			</div>
		);
	}

	return (
		<div className="flex min-h-full items-center justify-center bg-white px-4 py-8">
			<div className="w-full max-w-[446px] rounded-xl border border-violet-400 bg-white px-9 py-6 shadow-sm">
				<div className="flex justify-center">
					<CheckCircle2
						size={64}
						strokeWidth={1.8}
						className="text-gray-500"
					/>
				</div>
				<h1 className="mt-3 text-center text-[21px] font-bold text-violet-700">
					{isUpdated
						? "Asset Source Updated Successfully"
						: "Asset Source Created Successfully"}
				</h1>
				<p className="mx-auto mt-2 max-w-[330px] text-center text-xs leading-4 text-gray-500">
					Your asset source has been successfully{" "}
					{isUpdated ? "updated" : "generated"} and is ready for use. You
					can access it through the links below.
				</p>

				<div className="mt-7 space-y-4">
					<div className="flex items-center justify-between gap-4">
						<span className="text-sm font-medium text-violet-700">
							Google Sheet Link
						</span>
						<button
							type="button"
							onClick={handleOpenGoogleSheet}
							disabled={isCreatingGoogleSheet}
							className="flex min-w-[128px] items-center justify-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:cursor-wait disabled:opacity-60"
						>
							{isCreatingGoogleSheet ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<ExternalLink size={15} />
							)}
							{isCreatingGoogleSheet
								? isUpdated
									? "Updating..."
									: "Creating..."
								: "Open GSheet"}
						</button>
					</div>

					<div className="flex items-center justify-between gap-4">
						<span className="text-sm font-medium text-violet-700">
							Download Excel
						</span>
						<button
							type="button"
							onClick={() => handleDownload("excel")}
							disabled={Boolean(downloading)}
							className="flex min-w-[128px] items-center justify-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:cursor-wait disabled:opacity-60"
						>
							{downloading === "excel" ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<Download size={15} />
							)}
							Download Excel
						</button>
					</div>

					<div className="flex items-center justify-between gap-4">
						<span className="text-sm font-medium text-violet-700">
							Download CSV
						</span>
						<button
							type="button"
							onClick={() => handleDownload("csv")}
							disabled={Boolean(downloading)}
							className="flex min-w-[128px] items-center justify-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:cursor-wait disabled:opacity-60"
						>
							{downloading === "csv" ? (
								<Loader2 size={15} className="animate-spin" />
							) : (
								<Download size={15} />
							)}
							Download CSV
						</button>
					</div>
				</div>

				<div className="mt-7 space-y-2">
					<button
						type="button"
						onClick={() => navigate("/asset-sources", { replace: true })}
						className="w-full rounded-md bg-violet-700 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-800"
					>
						Go To Asset Sources
					</button>
					<button
						type="button"
						onClick={() => navigate("/dashboard", { replace: true })}
						className="w-full rounded-md bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200"
					>
						Back To Dashboard
					</button>
				</div>
			</div>
		</div>
	);
};

export default AssetSourceCreatedSuccess;
