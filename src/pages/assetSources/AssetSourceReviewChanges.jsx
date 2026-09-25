import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	ArrowLeft,
	Check,
	Download,
	ExternalLink,
	Loader2,
	Pencil,
	Plus,
	X,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
	useGetAssetSourceQuery,
	useUpdateAssetSourceRowsMutation,
	useApplyAssetSourceRefreshMutation,
} from "../../store/services/assetUpload";
import { useGetMeQuery } from "../../store/services/userAuthApi";
import { clearEditDraft } from "../../utils/editDraftStorage";
import { showError, showSuccess } from "../../utils/toastMsg";
import Breadcrumbs from "../../components/navigation/BreadCrumbs";
import useBreadcrumbs from "../../hooks/useBreadCrumbs";
import { API_BASE_URL } from "../../utils/apiConfig";

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
	/image|bg/i.test(String(change?.column || ""));

const isImageUrl = (value) => /^https?:\/\//i.test(String(value || ""));

const statusStyles = {
	Added: "text-emerald-600",
	Updated: "text-amber-500",
	Removed: "text-red-500",
	Cloned: "text-violet-600",
};

const ImageValue = ({ value }) => {
	const text = String(value || "").trim();
	if (!isImageUrl(text)) {
		return <span className="text-sm text-gray-400">—</span>;
	}

	return (
		<div className="flex w-full items-center justify-center">
			<img
				src={text}
				alt=""
				className="mx-auto h-20 w-32 rounded border border-gray-200 bg-gray-50 object-contain"
				width="128"
				height="80"
				loading="eager"
				decoding="async"
				onError={(event) => {
					event.currentTarget.style.display = "none";
				}}
			/>
		</div>
	);
};

const AssetSourceNameLabel = ({ name }) => {
	const textRef = useRef(null);
	const [truncated, setTruncated] = useState(false);

	useEffect(() => {
		const element = textRef.current;
		if (!element) return undefined;
		const measure = () => {
			setTruncated(element.scrollWidth > element.clientWidth + 1);
		};
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, [name]);

	return (
		<div className="group relative min-w-0 max-w-md">
			<p
				ref={textRef}
				className="truncate text-left text-sm text-gray-700"
			>
				<span className="font-semibold text-gray-800">AS Name :</span>{" "}
				{name}
			</p>
			{truncated && (
				<div className="absolute left-1/2 top-full z-50 hidden -translate-x-1/2 pt-1 group-hover:block">
					<p className="max-w-sm cursor-text select-text whitespace-normal break-all rounded bg-gray-900 px-2 py-1 text-left text-xs text-white shadow">
						{name}
					</p>
				</div>
			)}
		</div>
	);
};

const AssetSourceReviewChanges = () => {
	const { id } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const [isConfirming, setIsConfirming] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const breadcrumbs = useBreadcrumbs();
	const { data: asset, isLoading: isAssetLoading } =
		useGetAssetSourceQuery(id, { skip: !id });
	const { data: meData } = useGetMeQuery();
	const [updateRows] = useUpdateAssetSourceRowsMutation();
	const [applyAssetSourceRefresh] = useApplyAssetSourceRefreshMutation();

	const review = useMemo(
		() => location.state?.review || readStoredReview(id) || {},
		[location.state?.review, id]
	);
	const changes = useMemo(
		() => (Array.isArray(review.changes) ? review.changes : []),
		[review.changes]
	);
	const edits = Array.isArray(review.edits) ? review.edits : [];
	const fieldChanges = useMemo(
		() => changes.filter((change) => !isImageChange(change)),
		[changes]
	);
	const imageChanges = useMemo(
		() => changes.filter((change) => isImageChange(change)),
		[changes]
	);
	const variationRows = useMemo(
		() => groupReviewChanges(fieldChanges),
		[fieldChanges]
	);
	const imageRows = useMemo(
		() => groupReviewChanges(imageChanges),
		[imageChanges]
	);
	const counts = useMemo(() => {
		const tally = { added: 0, modified: 0, removed: 0 };
		for (const group of groupReviewChanges(changes)) {
			const status = variationStatus(group);
			if (status === "Added") tally.added += 1;
			else if (status === "Removed") tally.removed += 1;
			else tally.modified += 1;
		}
		return tally;
	}, [changes]);

	const accountId = String(
		asset?.accountId?._id ||
			asset?.accountId ||
			meData?.activeAccount?._id ||
			""
	);
	const assetName = asset?.name || review.assetName || "Asset Source";
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
		const editorState = review.editorState || null;
		clearReview();
		navigate(`/asset-sources/${id}/preview`, {
			replace: true,
			state: editorState || undefined,
		});
	};

	const handleDownloadPdf = async () => {
		if (isDownloading) return;
		setIsDownloading(true);
		try {
			const { jsPDF } = await import("jspdf");
			const { default: autoTable } = await import("jspdf-autotable");
			const imageAliases = new Map();
			const aliasForImage = (dataUrl) => {
				if (!imageAliases.has(dataUrl)) {
					imageAliases.set(dataUrl, `review-img-${imageAliases.size + 1}`);
				}
				return imageAliases.get(dataUrl);
			};
			let imageMap = new Map();
			try {
				imageMap = await loadPdfImages(imageRows);
			} catch {
				imageMap = new Map();
			}
			const doc = new jsPDF({
				orientation: "landscape",
				unit: "mm",
				format: "a4",
			});
			const pageWidth = doc.internal.pageSize.getWidth();
			const margin = 10;
			const contentWidth = pageWidth - margin * 2;
			const crumb = breadcrumbs.map((item) => item.label).join("  >  ");

			doc.setFont("helvetica", "normal");
			doc.setFontSize(9);
			doc.setTextColor(107, 114, 128);
			const crumbLines = doc.splitTextToSize(crumb, contentWidth * 0.62);
			doc.text(crumbLines, margin, 12);
			doc.text(`Last updated: ${updatedAt}`, pageWidth - margin, 12, {
				align: "right",
			});

			let cursorY = 14 + crumbLines.length * 4;
			doc.setFont("helvetica", "bold");
			doc.setFontSize(16);
			doc.setTextColor(31, 41, 55);
			doc.text("Review Changes", margin, cursorY);
			doc.setFont("helvetica", "normal");
			doc.setFontSize(8);
			doc.setTextColor(107, 114, 128);
			doc.text(
				"Review the changes before updating the asset source.",
				margin,
				cursorY + 5
			);

			doc.setFont("helvetica", "bold");
			doc.setFontSize(10);
			doc.setTextColor(31, 41, 55);
			const nameLabel = "AS Name : ";
			const nameX = margin + 92;
			doc.text(nameLabel, nameX, cursorY);
			doc.setFont("helvetica", "normal");
			const nameLines = doc.splitTextToSize(
				String(assetName || ""),
				Math.max(40, contentWidth - 92 - doc.getTextWidth(nameLabel))
			);
			doc.text(nameLines, nameX + doc.getTextWidth(nameLabel), cursorY);
			cursorY += Math.max(14, nameLines.length * 4 + 8);

			const gap = 4;
			const boxWidth = (contentWidth - gap * 2) / 3;
			const boxHeight = 22;
			const summaryIcons = {
				plus: await svgToPngDataUrl(SUMMARY_ICON_SVG.plus),
				pencil: await svgToPngDataUrl(SUMMARY_ICON_SVG.pencil),
				x: await svgToPngDataUrl(SUMMARY_ICON_SVG.x),
			};
			[
				["added", "Added", [22, 163, 74], "plus"],
				["modified", "Modified", [245, 158, 11], "pencil"],
				["removed", "Removed", [239, 68, 68], "x"],
			].forEach(([key, label, color, icon], index) => {
				const x = margin + index * (boxWidth + gap);
				doc.setDrawColor(...color);
				doc.setLineWidth(0.45);
				doc.roundedRect(x, cursorY, boxWidth, boxHeight, 2, 2);
				const iconSize = 9;
				doc.addImage(
					summaryIcons[icon],
					"PNG",
					x + 6,
					cursorY + (boxHeight - iconSize) / 2,
					iconSize,
					iconSize,
					`summary-${icon}`,
					"NONE"
				);
				const textX = x + 18;
				doc.setFont("helvetica", "bold");
				doc.setFontSize(16);
				doc.setTextColor(...color);
				const value = String(counts[key]).padStart(2, "0");
				doc.text(value, textX, cursorY + 9);
				const valueWidth = doc.getTextWidth(value);
				doc.setFontSize(9);
				doc.text("Rows", textX + 2 + valueWidth, cursorY + 9);
				doc.setFont("helvetica", "normal");
				doc.setFontSize(10);
				doc.setTextColor(31, 41, 55);
				doc.text(label, textX, cursorY + 16);
			});
			cursorY += boxHeight + 8;

			const valueWidth = (contentWidth - 28 - 42 - 28) / 2;
			const writeSection = (title, subtitle, groups, images) => {
				if (!groups.length) return;
				if (cursorY > doc.internal.pageSize.getHeight() - 30) {
					doc.addPage();
					cursorY = 14;
				}
				doc.setFont("helvetica", "bold");
				doc.setFontSize(11);
				doc.setTextColor(31, 41, 55);
				doc.text(title, margin, cursorY);
				doc.setFont("helvetica", "normal");
				doc.setFontSize(8);
				doc.setTextColor(156, 163, 175);
				doc.text(subtitle, margin, cursorY + 4);
				autoTable(doc, {
					startY: cursorY + 7,
					margin: { left: margin, right: margin },
					tableWidth: contentWidth,
					head: [
						[
							"Row Number",
							"Field Name",
							"Previous Value",
							"Updated Value",
							"Status",
						],
					],
					body: buildPdfBody(groups, images),
					theme: "grid",
					rowPageBreak: "avoid",
					styles: {
						font: "helvetica",
						fontSize: 8,
						cellPadding: 2,
						overflow: "linebreak",
						halign: "center",
						valign: "middle",
						textColor: [55, 65, 81],
						lineColor: [229, 231, 235],
						lineWidth: 0.15,
					},
					headStyles: {
						fillColor: [243, 238, 249],
						textColor: [31, 41, 55],
						fontStyle: "bold",
						halign: "center",
					},
					columnStyles: {
						0: { cellWidth: 28 },
						1: { cellWidth: 42 },
						2: { cellWidth: valueWidth },
						3: { cellWidth: valueWidth },
						4: { cellWidth: 28 },
					},
					didDrawCell: (data) => {
						const image = data.cell.raw?.image;
						if (!image || data.section !== "body") return;
						const frameWidth = 34;
						const frameHeight = 21;
						const frameX =
							data.cell.x + (data.cell.width - frameWidth) / 2;
						const frameY =
							data.cell.y + (data.cell.height - frameHeight) / 2;
						doc.setFillColor(249, 250, 251);
						doc.setDrawColor(229, 231, 235);
						doc.setLineWidth(0.2);
						doc.roundedRect(
							frameX,
							frameY,
							frameWidth,
							frameHeight,
							1,
							1,
							"FD"
						);
						const innerPad = 1;
						const boxWidth = frameWidth - innerPad * 2;
						const boxHeight = frameHeight - innerPad * 2;
						const scale = Math.min(
							boxWidth / image.width,
							boxHeight / image.height
						);
						const drawWidth = image.width * scale;
						const drawHeight = image.height * scale;
						try {
							doc.addImage(
								image.dataUrl,
								image.format || "PNG",
								frameX + innerPad + (boxWidth - drawWidth) / 2,
								frameY + innerPad + (boxHeight - drawHeight) / 2,
								drawWidth,
								drawHeight,
								aliasForImage(image.dataUrl),
								"NONE"
							);
						} catch {
							// Skip an image the PDF engine cannot embed.
						}
					},
					showHead: "everyPage",
				});
				cursorY = doc.lastAutoTable.finalY + 8;
			};

			writeSection(
				"Field Changes",
				"Review All Modifications To Asset Source Fields",
				variationRows,
				new Map()
			);
			writeSection(
				"Image Changes",
				"Review All Modifications To Asset Source Images",
				imageRows,
				imageMap
			);

			const safeName =
				String(assetName || "review-changes")
					.replace(/[^\w\s-]/g, "")
					.trim()
					.replace(/\s+/g, "-") || "review-changes";
			doc.save(`${safeName}-review.pdf`);
		} catch (error) {
			showError(error?.message || "Failed to download PDF");
		} finally {
			setIsDownloading(false);
		}
	};

	const handleGoToAssetSources = () => {
		clearReview();
		navigate("/asset-sources", { replace: true });
	};

	const handleConfirm = async () => {
		if (isConfirming) return;
		setIsConfirming(true);
		try {
			if (review.copyMatrixRefresh) {
				await applyAssetSourceRefresh({
					id,
					addedRowPatches: review.addedRowPatches || [],
				}).unwrap();
			}
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
		<div className="min-h-full bg-white px-4 sm:px-8">
			<button
				type="button"
				onClick={handleDownloadPdf}
				disabled={isDownloading}
				aria-label="Download PDF"
				title="Download PDF"
				className="fixed bottom-20 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#751FD4] text-white shadow-md transition hover:bg-[#6419BC] disabled:cursor-wait disabled:opacity-70"
			>
				{isDownloading ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					<Download size={16} />
				)}
			</button>
			<div className="w-full">
				<div className="sticky top-0 z-40 -mx-4 bg-white px-4 sm:-mx-8 sm:px-8">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 py-3">
					<Breadcrumbs items={breadcrumbs} />
					<p className="text-xs text-gray-600">
						<span className="font-semibold text-gray-700">
							Last updated:
						</span>{" "}
						{updatedAt}
					</p>
				</div>

				<div className="flex items-center gap-6 border-b border-gray-200 py-4">
					<div className="shrink-0">
						<h1 className="whitespace-nowrap text-xl font-bold text-gray-800">
							Review Changes
						</h1>
						<p className="mt-1 text-xs text-gray-500">
							Review the changes before updating the asset source.
						</p>
					</div>
					<div className="min-w-0 flex-1">
						<AssetSourceNameLabel name={assetName} />
					</div>
					<div className="flex shrink-0 flex-nowrap items-center gap-2">
						<button
							type="button"
							onClick={handleBackToEdit}
							className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
						>
							<ArrowLeft size={14} />
							Go Back to Edit
						</button>
						<button
							type="button"
							onClick={handleGoToAssetSources}
							className="shrink-0 whitespace-nowrap rounded-md border border-violet-300 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50"
						>
							Go To Asset Sources
						</button>
						<button
							type="button"
							onClick={handleConfirm}
							disabled={isConfirming}
							className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60"
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
				</div>

				<div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-3">
					{[
						{
							key: "added",
							label: "Added",
							className: "border-green-500 text-green-600",
							icon: (
								<span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current">
									<Plus size={16} strokeWidth={2.5} />
								</span>
							),
						},
						{
							key: "modified",
							label: "Modified",
							className: "border-amber-400 text-amber-500",
							icon: <Pencil size={22} strokeWidth={2} />,
						},
						{
							key: "removed",
							label: "Removed",
							className: "border-red-400 text-red-500",
							icon: (
								<span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current">
									<X size={16} strokeWidth={2.5} />
								</span>
							),
						},
					].map((card) => (
						<div
							key={card.key}
							className={`flex items-center gap-4 rounded-lg border bg-white px-5 py-4 ${card.className}`}
						>
							{card.icon}
							<div>
								<div className="flex items-baseline gap-1.5 font-semibold leading-none">
									<span className="text-2xl">
										{String(counts[card.key]).padStart(2, "0")}
									</span>
									<span className="text-sm">Rows</span>
								</div>
								<div className="mt-1 text-sm font-medium text-gray-800">
									{card.label}
								</div>
							</div>
						</div>
					))}
				</div>

				{variationRows.length > 0 ? (
					<VariationReviewTable
						title="Field Changes"
						subtitle="Review All Modifications To Asset Source Fields"
						rows={variationRows}
					/>
				) : null}

				{imageRows.length > 0 && (
					<VariationReviewTable
						title="Image Changes"
						subtitle="Review All Modifications To Asset Source Images"
						rows={imageRows}
					/>
				)}

				{changes.length === 0 && (
					<div className="rounded border border-dashed border-gray-200 px-4 py-8 text-center text-xs text-gray-400">
						No changes to review.
					</div>
				)}

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

const SUMMARY_ICON_SVG = {
	plus: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="rgb(22,163,74)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`,
	pencil: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="rgb(245,158,11)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>`,
	x: `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="rgb(239,68,68)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
};

const svgToPngDataUrl = (svg) =>
	new Promise((resolve, reject) => {
		const blob = new Blob([svg], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = 96;
			canvas.height = 96;
			const context = canvas.getContext("2d");
			context.drawImage(img, 0, 0, 96, 96);
			URL.revokeObjectURL(url);
			resolve(canvas.toDataURL("image/png"));
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Unable to draw summary icon"));
		};
		img.src = url;
	});

const groupReviewChanges = (changes) => {
	const groups = [];
	const indexByRow = new Map();

	for (const change of changes) {
		const key = String(change.rowId ?? change.rowNumber ?? "");
		if (!indexByRow.has(key)) {
			indexByRow.set(key, groups.length);
			groups.push([]);
		}
		groups[indexByRow.get(key)].push(change);
	}

	return groups;
};

const pdfValueCell = (change, which, imageMap) => {
	const value = which === "previous" ? change.previousValue : change.updatedValue;
	const text = String(value ?? "").trim();
	if (isImageChange(change) && isImageUrl(text)) {
		const image = imageMap.get(text);
		if (image) {
			return {
				content: " ",
				image,
				styles: { minCellHeight: 26, valign: "middle", halign: "center" },
			};
		}
		return "—";
	}
	if (which === "updated" && updatedValueClass(change).includes("#0369A1")) {
		return {
			content: formatValue(text),
			styles: { textColor: [3, 105, 161], fontStyle: "bold" },
		};
	}
	return formatValue(text);
};

const buildPdfBody = (groups, imageMap = new Map()) =>
	groups.flatMap((group) => {
		const status = variationStatus(group);
		const statusColor = {
			Added: [22, 163, 74],
			Updated: [217, 119, 6],
			Removed: [220, 38, 38],
			Cloned: [124, 58, 237],
		}[status] || [107, 114, 128];
		return group.map((change, index) => [
			index === 0 ? formatValue(group[0]?.rowNumber) : "",
			formatValue(change.column),
			pdfValueCell(change, "previous", imageMap),
			pdfValueCell(change, "updated", imageMap),
			index === 0
				? {
						content: status,
						styles: {
							fontStyle: "bold",
							textColor: statusColor,
						},
					}
				: "",
		]);
	});

const blobToDataUrl = (blob) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ""));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

const sniffImageFormat = async (blob) => {
	const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
	if (bytes[0] === 0xff && bytes[1] === 0xd8) return "JPEG";
	if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
		return "PNG";
	}
	return "";
};

const measureImage = (src) =>
	new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () =>
			resolve({
				width: img.naturalWidth || img.width || 1,
				height: img.naturalHeight || img.height || 1,
			});
		img.onerror = () => reject(new Error("Unable to load image"));
		img.src = src;
	});

const rasterizeImage = (img) => {
	const width = Math.max(1, img.naturalWidth || img.width || 1);
	const height = Math.max(1, img.naturalHeight || img.height || 1);
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = "high";
	context.drawImage(img, 0, 0, width, height);
	return {
		dataUrl: canvas.toDataURL("image/png"),
		format: "PNG",
		width,
		height,
	};
};

const imageFromBlob = async (blob) => {
	const format = await sniffImageFormat(blob);
	if (format) {
		const typed = new Blob([await blob.arrayBuffer()], {
			type: format === "PNG" ? "image/png" : "image/jpeg",
		});
		const dataUrl = await blobToDataUrl(typed);
		const size = await measureImage(dataUrl);
		return { dataUrl, format, ...size };
	}
	const dataUrl = await blobToDataUrl(blob);
	const img = new Image();
	img.src = dataUrl;
	await new Promise((resolve, reject) => {
		img.onload = resolve;
		img.onerror = reject;
	});
	return rasterizeImage(img);
};

const loadPdfImage = async (url) => {
	const endpoint = `${API_BASE_URL}/review-image?url=${encodeURIComponent(url)}`;
	try {
		const response = await fetch(endpoint, { credentials: "include" });
		if (response.ok) return await imageFromBlob(await response.blob());
	} catch {
		// Fall through to a direct browser fetch.
	}
	try {
		const response = await fetch(url);
		if (!response.ok) return null;
		return await imageFromBlob(await response.blob());
	} catch {
		return null;
	}
};

const loadPdfImages = async (groups) => {
	const urls = new Set();
	for (const group of groups) {
		for (const change of group) {
			for (const value of [change.previousValue, change.updatedValue]) {
				const text = String(value || "").trim();
				if (isImageUrl(text)) urls.add(text);
			}
		}
	}
	const entries = await Promise.all(
		[...urls].map(async (url) => [url, await loadPdfImage(url)])
	);
	return new Map(entries.filter((entry) => entry[1]));
};

const variationStatus = (group) => {
	if (
		group.some(
			(change) =>
				change.changeType === "row-clone" ||
				change.changeType === "column-clone"
		)
	) {
		return "Cloned";
	}
	if (group.some((change) => change.changeType === "row-add")) return "Added";
	if (group.some((change) => change.changeType === "row-delete")) {
		return "Removed";
	}
	if (group.every((change) => change.status === "Removed")) return "Removed";
	return "Updated";
};

const updatedValueClass = (change) => {
	const updated = String(change?.updatedValue ?? "").trim();
	if (
		updated &&
		change.status !== "Removed" &&
		(change.status === "Added" ||
			change.status === "Modified" ||
			change.status === "Cloned")
	) {
		return "font-medium text-[#0369A1]";
	}
	return "text-gray-600";
};

const ChangeValue = ({ change, which }) => {
	const value = which === "previous" ? change.previousValue : change.updatedValue;
	if (isImageChange(change) && isImageUrl(value)) {
		return <ImageValue value={value} />;
	}
	return formatValue(value);
};

const ASSET_DATA_PAGE_SIZE = 5;
const cellClass =
	"overflow-hidden border border-gray-200 bg-white px-3 py-1.5 text-center align-middle text-sm";
const fieldRowClass = cellClass;

const EllipsisText = ({ value, className = "" }) => {
	const text = formatValue(value);
	return (
		<span className={`block w-full truncate text-center ${className}`} title={text}>
			{text}
		</span>
	);
};

const FieldPager = ({ page, total, onChange }) => (
	<div className="flex items-center justify-center gap-4 text-sm text-gray-400">
		<button
			type="button"
			aria-label="Previous fields"
			disabled={page === 1}
			onClick={() => onChange(page - 1)}
			className="px-1 disabled:opacity-30"
		>
			‹
		</button>
		{Array.from({ length: total }, (_, index) => index + 1).map((number) => (
			<button
				key={number}
				type="button"
				onClick={() => onChange(number)}
				className={
					number === page
						? "font-semibold text-[#C026D3]"
						: "text-gray-400 hover:text-gray-600"
				}
			>
				{number}
			</button>
		))}
		<button
			type="button"
			aria-label="Next fields"
			disabled={page === total}
			onClick={() => onChange(page + 1)}
			className="px-1 disabled:opacity-30"
		>
			›
		</button>
	</div>
);

const VariationRows = ({ group, showAll = false }) => {
	const [page, setPage] = useState(1);
	const status = variationStatus(group);
	const rowNumber = group[0]?.rowNumber;
	const needsPaging = !showAll && group.length > ASSET_DATA_PAGE_SIZE;
	const total = Math.max(1, Math.ceil(group.length / ASSET_DATA_PAGE_SIZE));
	const safePage = Math.min(Math.max(page, 1), total);
	const start = needsPaging ? (safePage - 1) * ASSET_DATA_PAGE_SIZE : 0;
	const fields = needsPaging
		? group.slice(start, start + ASSET_DATA_PAGE_SIZE)
		: group;
	const span = fields.length + (needsPaging ? 1 : 0);

	return (
		<>
			{fields.map((change, fieldIndex) => {
				const isFirst = fieldIndex === 0;
				return (
					<tr key={`${change.rowId}-${change.column}-${fieldIndex}`}>
						{isFirst && (
							<td
								rowSpan={span}
								className={`${cellClass} w-28 text-gray-700`}
							>
								<EllipsisText value={rowNumber} />
							</td>
						)}
						<td className={`${fieldRowClass} text-gray-600`}>
							<EllipsisText value={change.column} />
						</td>
						<td className={`${fieldRowClass} text-center text-gray-600`}>
							{isImageChange(change) ? (
								<ChangeValue change={change} which="previous" />
							) : (
								<EllipsisText value={change.previousValue} />
							)}
						</td>
						<td
							className={`${fieldRowClass} text-center ${updatedValueClass(change)}`}
						>
							{isImageChange(change) ? (
								<ChangeValue change={change} which="updated" />
							) : (
								<EllipsisText
									value={change.updatedValue}
									className={updatedValueClass(change)}
								/>
							)}
						</td>
						{isFirst && (
							<td
								rowSpan={span}
								className={`${cellClass} w-32 font-semibold ${
									statusStyles[status] || "text-gray-500"
								}`}
							>
								{status}
							</td>
						)}
					</tr>
				);
			})}
			{needsPaging && (
				<tr>
					<td
						colSpan={3}
						className={`${fieldRowClass} text-center`}
					>
						<FieldPager
							page={safePage}
							total={total}
							onChange={setPage}
						/>
					</td>
				</tr>
			)}
		</>
	);
};

const headerClass =
	"sticky top-0 z-20 border border-gray-200 bg-[#F3EEF9] px-3 py-2 text-center text-sm font-medium text-gray-800";

const VariationReviewTable = ({ title, subtitle, rows, showAll = false }) => {
	return (
		<section className="mb-5">
			<div className="mb-2">
				<h2 className="text-sm font-semibold text-gray-800">{title}</h2>
				<p className="text-xs text-gray-400">{subtitle}</p>
			</div>
			<div className="review-table-scroll max-h-[480px] overflow-auto rounded-lg border border-gray-200">
			<table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
				<colgroup>
					<col className="w-28" />
					<col />
					<col />
					<col />
					<col className="w-32" />
				</colgroup>
				<thead>
					<tr>
						<th className={headerClass}>Row Number</th>
						<th className={headerClass}>Field Name</th>
						<th className={headerClass}>Previous Value</th>
						<th className={headerClass}>Updated Value</th>
						<th className={headerClass}>Status</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((group, index) => (
						<VariationRows
							key={`${group[0]?.rowId || group[0]?.rowNumber}-${index}`}
							group={group}
							showAll={showAll}
						/>
					))}
				</tbody>
			</table>
			</div>
		</section>
	);
};

export default AssetSourceReviewChanges;
