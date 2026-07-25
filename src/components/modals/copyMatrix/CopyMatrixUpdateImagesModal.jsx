import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, GripVertical, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { formInputClass } from "../../../utils/formStyles";
import { AUTO_ROW_ID_COLUMN } from "../../../utils/constants";
import { normalizeCellText } from "../../../utils/normalizeCellText";

const ACCEPTED_TYPES =
	"image/*,.zip,application/zip,application/x-zip-compressed";
const SEQUENCE_TOKEN = "SN";
const LABEL_MAX = 64;
const MODAL_WIDTH = 480;

function truncateLabel(label, max = LABEL_MAX) {
	const value = String(label || "");
	if (value.length <= max) {
		return { text: value, full: value, truncated: false };
	}
	return {
		text: `${value.slice(0, max)}…`,
		full: value,
		truncated: true,
	};
}

/** Pull AEM folder (e.g. AEM-User_Gadigesh) out of Mindshare folders. */
function resolveAemFromFolders(folders = []) {
	const list = Array.isArray(folders) ? folders : [];
	const aemFolder = list.find((folder) =>
		/^AEM[-_]/i.test(String(folder || "").trim())
	);
	if (!aemFolder) {
		return { aemDisplayName: "", excludeFolders: [] };
	}
	const trimmed = String(aemFolder).trim();
	const aemDisplayName = trimmed.replace(/^AEM[-_]+/i, "").trim() || trimmed;
	const excludeFolders = [trimmed];
	if (aemDisplayName) {
		const bare = list.find(
			(folder) =>
				String(folder || "").trim().toLowerCase() ===
				aemDisplayName.toLowerCase()
		);
		if (bare) excludeFolders.push(String(bare).trim());
	}
	return { aemDisplayName, excludeFolders };
}

const CopyMatrixUpdateImagesModal = ({
	isOpen,
	onClose,
	onUpload,
	onApply,
	targetColumn,
	columns = [],
	folders = [],
	isLoadingFolders = false,
	sampleRow = null,
	anchorRect = null,
	selectedCount = 0,
	isUploading = false,
	isApplying = false,
}) => {
	const panelRef = useRef(null);
	const fileInputRef = useRef(null);
	const templateInputRef = useRef(null);
	const folderMenuRef = useRef(null);
	const dragOffset = useRef({ x: 0, y: 0 });
	const [template, setTemplate] = useState("");
	const [folder, setFolder] = useState("");
	const [folderMenuOpen, setFolderMenuOpen] = useState(false);
	const [folderSearch, setFolderSearch] = useState("");
	const folderSearchRef = useRef(null);
	const [templateQuery, setTemplateQuery] = useState("");
	const [templateColumnStart, setTemplateColumnStart] = useState(-1);
	const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
	const [files, setFiles] = useState([]);
	const [position, setPosition] = useState({ top: 72, left: 72 });
	const [dragging, setDragging] = useState(false);
	const [busyPercent, setBusyPercent] = useState(0);

	const availableColumns = useMemo(
		() => columns.filter((column) => column !== AUTO_ROW_ID_COLUMN),
		[columns]
	);
	const templateSuggestions = useMemo(() => {
		const query = templateQuery.toLocaleLowerCase();
		return [
			...(SEQUENCE_TOKEN.toLocaleLowerCase().includes(query)
				? [SEQUENCE_TOKEN]
				: []),
			...availableColumns.filter((column) =>
				column.toLocaleLowerCase().includes(query)
			),
		];
	}, [availableColumns, templateQuery]);

	const { aemDisplayName, excludeFolders } = useMemo(
		() => resolveAemFromFolders(folders),
		[folders]
	);
	const folderOptions = useMemo(() => {
		const excluded = new Set(
			excludeFolders.map((name) => name.toLowerCase())
		);
		return folders.filter(
			(folderPath) => !excluded.has(String(folderPath).trim().toLowerCase())
		);
	}, [folders, excludeFolders]);

	const filteredFolderOptions = useMemo(() => {
		const query = folderSearch.trim().toLowerCase();
		if (!query) return folderOptions;
		return folderOptions.filter((folderPath) =>
			String(folderPath).toLowerCase().includes(query)
		);
	}, [folderOptions, folderSearch]);

	const folderFieldLabel = useMemo(() => {
		const label = aemDisplayName
			? `Folder  ${aemDisplayName}`
			: "Folder";
		return truncateLabel(label);
	}, [aemDisplayName]);

	const selectedFolderText = folder || "All";
	const selectedFolderDisplay = truncateLabel(selectedFolderText);

	const hasSelectedRows = selectedCount > 0;
	const isBusy = isUploading || isApplying;
	const canUpload = !isBusy && files.length > 0;
	const canApply = !isBusy && template.trim().length > 0;
	const exampleName = template.replace(
		/\[([^[\]]+)\]/g,
		(_match, column) =>
			column === SEQUENCE_TOKEN
				? "1"
				: normalizeCellText(
						sampleRow?.rowData?.[column] ?? sampleRow?.[column]
				  )
	);

	/* eslint-disable react-hooks/set-state-in-effect -- reset and position floating panel when it opens */
	useEffect(() => {
		if (!isOpen) return;
		setTemplate("");
		setTemplateQuery("");
		setTemplateColumnStart(-1);
		setTemplateMenuOpen(false);
		setFolderMenuOpen(false);
		setFolderSearch("");
		setFolder("");
		setFiles([]);
		setBusyPercent(0);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, [isOpen, targetColumn]);

	// If folders load later and current selection is an excluded AEM folder, clear it.
	useEffect(() => {
		if (!isOpen || excludeFolders.length === 0) return;
		setFolder((current) => {
			const excluded = new Set(
				excludeFolders.map((name) => name.toLowerCase())
			);
			if (excluded.has(String(current || "").trim().toLowerCase())) {
				return "";
			}
			return current;
		});
	}, [isOpen, excludeFolders]);

	useEffect(() => {
		if (!isOpen) return;
		const width = MODAL_WIDTH;
		const height = 240;
		let top = 72;
		let left = Math.max(8, window.innerWidth - width - 24);

		if (anchorRect) {
			const besideLeft = anchorRect.right + 8;
			if (besideLeft + width <= window.innerWidth - 8) {
				left = besideLeft;
				top = Math.max(
					8,
					Math.min(anchorRect.top, window.innerHeight - height - 8)
				);
			}
		}
		setPosition({ top, left });
	}, [isOpen, targetColumn, anchorRect]);
	/* eslint-enable react-hooks/set-state-in-effect */

	useEffect(() => {
		if (!dragging) return;
		const onMove = (event) => {
			setPosition({
				top: Math.max(
					0,
					Math.min(
						window.innerHeight - 40,
						event.clientY - dragOffset.current.y
					)
				),
				left: Math.max(
					0,
					Math.min(
						window.innerWidth - 40,
						event.clientX - dragOffset.current.x
					)
				),
			});
		};
		const onUp = () => setDragging(false);
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [dragging]);

	useEffect(() => {
		if (!folderMenuOpen) {
			setFolderSearch("");
			return;
		}
		const onDown = (event) => {
			if (!folderMenuRef.current?.contains(event.target)) {
				setFolderMenuOpen(false);
			}
		};
		window.addEventListener("mousedown", onDown);
		const focusTimer = window.setTimeout(() => {
			folderSearchRef.current?.focus();
		}, 0);
		return () => {
			window.removeEventListener("mousedown", onDown);
			window.clearTimeout(focusTimer);
		};
	}, [folderMenuOpen]);

	useEffect(() => {
		if (!isBusy) {
			setBusyPercent((current) => {
				if (current <= 0) return 0;
				return 100;
			});
			const resetTimer = window.setTimeout(() => setBusyPercent(0), 350);
			return () => window.clearTimeout(resetTimer);
		}

		setFolderMenuOpen(false);
		setTemplateMenuOpen(false);
		setBusyPercent(8);
		const timer = window.setInterval(() => {
			setBusyPercent((current) => {
				if (current >= 92) return current;
				const step = current < 40 ? 3 : current < 70 ? 2 : 1;
				return Math.min(92, current + step);
			});
		}, 450);
		return () => window.clearInterval(timer);
	}, [isBusy]);

	if (!isOpen) return null;

	const startDrag = (event) => {
		if (event.button !== 0) return;
		const rect = panelRef.current?.getBoundingClientRect();
		if (!rect) return;
		dragOffset.current = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		setDragging(true);
		event.preventDefault();
	};

	const syncTemplateMenu = (value, caretPosition) => {
		const beforeCaret = value.slice(0, caretPosition);
		const openIndex = beforeCaret.lastIndexOf("[");
		const closeIndex = beforeCaret.lastIndexOf("]");
		if (openIndex > closeIndex) {
			const query = beforeCaret.slice(openIndex + 1);
			if (!query.includes("[")) {
				setTemplateQuery(query);
				setTemplateColumnStart(openIndex);
				setTemplateMenuOpen(true);
				return;
			}
		}
		setTemplateMenuOpen(false);
		setTemplateColumnStart(-1);
	};

	const handleTemplateChange = (event) => {
		const value = event.target.value;
		const caretPosition = event.target.selectionStart ?? value.length;
		setTemplate(value);
		syncTemplateMenu(value, caretPosition);
	};

	const selectTemplateColumn = (column) => {
		const input = templateInputRef.current;
		const caretPosition = input?.selectionStart ?? template.length;
		if (templateColumnStart < 0) return;
		const closingIndex = template.indexOf("]", caretPosition);
		const replaceEnd =
			closingIndex >= caretPosition ? closingIndex + 1 : caretPosition;
		const token = `[${column}]`;
		const value =
			template.slice(0, templateColumnStart) +
			token +
			template.slice(replaceEnd);
		const nextCaret = templateColumnStart + token.length;
		setTemplate(value);
		setTemplateMenuOpen(false);
		setTemplateColumnStart(-1);
		window.setTimeout(() => {
			input?.focus();
			input?.setSelectionRange(nextCaret, nextCaret);
		}, 0);
	};

	const handleFileChange = (event) => {
		const next = Array.from(event.target.files || []);
		setFiles(next);
	};

	const folderPayload = folder || undefined;
	const busyTitle = isUploading
		? "Uploading images"
		: isApplying
			? "Updating URLs"
			: "Working";
	const busyMessage = isUploading
		? "Uploading files to the asset library. This can take a moment for large zips."
		: isApplying
			? "Matching image names and writing CDN URLs into the column."
			: "Please wait...";

	return createPortal(
		<div
			ref={panelRef}
			style={{ top: position.top, left: position.left }}
			className="pointer-events-auto fixed z-[10000] flex min-h-[240px] w-[480px] flex-col overflow-visible rounded-xl border border-gray-200 bg-white shadow-2xl"
		>
			{(isBusy || busyPercent > 0) && (
				<div className="absolute inset-0 z-[60] flex flex-col items-center justify-center rounded-xl bg-white/90 px-6 backdrop-blur-[1px]">
					<Loader2
						size={22}
						className="mb-3 animate-spin text-violet-600"
					/>
					<p className="mb-3 text-sm font-semibold text-gray-800">
						{busyTitle}
					</p>
					<div
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(busyPercent)}
						className="w-full max-w-[280px]"
					>
						<div className="mb-1.5 flex justify-between text-[11px] text-gray-600">
							<span>
								{isUploading
									? "Uploading..."
									: isApplying
										? "Updating..."
										: "Finishing..."}
							</span>
							<span>{Math.round(busyPercent)}%</span>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-gray-200">
							<div
								className="h-full rounded-full bg-[#7C3AED] transition-all duration-300 ease-out"
								style={{ width: `${busyPercent}%` }}
							/>
						</div>
						<p className="mt-3 text-center text-[11px] text-gray-500">
							{busyMessage}
						</p>
					</div>
				</div>
			)}

			<div
				onMouseDown={startDrag}
				className={`flex shrink-0 cursor-grab items-center gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50 px-3 py-2 active:cursor-grabbing ${
					dragging ? "cursor-grabbing" : ""
				}`}
			>
				<GripVertical size={14} className="shrink-0 text-gray-400" />
				<p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
					Update images — {targetColumn}
				</p>
				<button
					type="button"
					onClick={onClose}
					disabled={isBusy}
					className="cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50"
					aria-label="Close"
				>
					<X size={14} />
				</button>
			</div>

			<div className="relative flex-1 space-y-2.5 overflow-visible px-3 py-3">
				{hasSelectedRows ? (
					<p className="rounded border border-green-200 bg-green-50 px-2 py-1 text-[11px] text-green-800">
						{selectedCount} row{selectedCount === 1 ? "" : "s"}{" "}
						selected — changes stay in local draft until you Save.
					</p>
				) : null}

				<div className="flex items-end gap-2">
					<label className="relative min-w-0 flex-1 block">
						<span className="mb-0.5 block text-[11px] font-semibold text-gray-600">
							Format
						</span>
						<input
							ref={templateInputRef}
							value={template}
							onChange={handleTemplateChange}
							onClick={(event) =>
								syncTemplateMenu(
									event.currentTarget.value,
									event.currentTarget.selectionStart ??
										event.currentTarget.value.length
								)
							}
							onKeyUp={(event) => {
								if (event.key === "Escape") {
									setTemplateMenuOpen(false);
									return;
								}
								syncTemplateMenu(
									event.currentTarget.value,
									event.currentTarget.selectionStart ??
										event.currentTarget.value.length
								);
							}}
							onKeyDown={(event) => {
								if (
									event.key === "Enter" &&
									templateMenuOpen &&
									templateSuggestions.length
								) {
									event.preventDefault();
									selectTemplateColumn(templateSuggestions[0]);
								}
							}}
							onBlur={() =>
								window.setTimeout(
									() => setTemplateMenuOpen(false),
									120
								)
							}
							placeholder="Type [ to add a column, e.g. [AssetName].png"
							disabled={isBusy}
							autoComplete="off"
							className={`${formInputClass} !h-[34px] !px-2 !py-1 font-mono text-xs`}
						/>
						{templateMenuOpen && (
							<div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-28 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
								{templateSuggestions.length === 0 ? (
									<p className="px-2 py-1.5 text-center text-[11px] text-gray-500">
										No matching columns
									</p>
								) : (
									templateSuggestions.map((column) => (
										<button
											key={column}
											type="button"
											onMouseDown={(event) =>
												event.preventDefault()
											}
											onClick={() =>
												selectTemplateColumn(column)
											}
											className="block w-full cursor-pointer rounded px-2 py-1 text-left text-[11px] text-gray-700 hover:bg-violet-50 hover:text-violet-800"
										>
											{column}
										</button>
									))
								)}
							</div>
						)}
					</label>

					<div className="relative z-20 w-[46%] shrink-0" ref={folderMenuRef}>
						<label
							className="mb-0.5 block truncate text-[11px] font-semibold text-gray-600"
							title={
								folderFieldLabel.truncated
									? folderFieldLabel.full
									: folder
										? "Search this folder only"
										: "All: root first, then every folder"
							}
						>
							{folderFieldLabel.text}
						</label>
						<button
							type="button"
							disabled={isBusy || isLoadingFolders}
							onClick={() => {
								setTemplateMenuOpen(false);
								setFolderMenuOpen((open) => !open);
							}}
							title={
								selectedFolderDisplay.truncated
									? selectedFolderDisplay.full
									: folder
										? undefined
										: "All folders — root first, then nested"
							}
							className={`${formInputClass} flex !h-[34px] w-full items-center justify-between gap-1 !px-1.5 !py-0.5 text-left text-xs disabled:opacity-50`}
						>
							<span className="min-w-0 truncate">
								{isLoadingFolders
									? "Loading..."
									: selectedFolderDisplay.text}
							</span>
							<ChevronDown
								size={14}
								className={`shrink-0 text-gray-400 transition-transform ${
									folderMenuOpen ? "rotate-180" : ""
								}`}
							/>
						</button>
						{folderMenuOpen && !isLoadingFolders && (
							<div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
								<div className="border-b border-gray-100 p-1">
									<input
										ref={folderSearchRef}
										type="text"
										value={folderSearch}
										onChange={(event) =>
											setFolderSearch(event.target.value)
										}
										onKeyDown={(event) => {
											if (event.key === "Escape") {
												setFolderMenuOpen(false);
											}
										}}
										placeholder="Search folders..."
										className="w-full rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-[11px] text-gray-700 outline-none focus:border-violet-300 focus:bg-white"
									/>
								</div>
								<div className="max-h-[120px] overflow-y-auto p-1 pb-[5px] [scrollbar-width:thin]">
									{(!folderSearch.trim() ||
										"all".includes(
											folderSearch.trim().toLowerCase()
										)) && (
										<button
											type="button"
											onClick={() => {
												setFolder("");
												setFolderMenuOpen(false);
											}}
											className={`mb-0.5 block w-full truncate rounded px-1.5 py-1 text-left text-[11px] ${
												folder === ""
													? "bg-violet-100 font-semibold text-violet-800"
													: "text-gray-700 hover:bg-violet-50"
											}`}
										>
											All
										</button>
									)}
									{filteredFolderOptions.length === 0 ? (
										<p className="px-1.5 py-1 text-[11px] text-gray-400">
											No folders found
										</p>
									) : (
										filteredFolderOptions.map((folderPath) => {
											const option = truncateLabel(folderPath);
											return (
												<button
													key={folderPath}
													type="button"
													title={
														option.truncated
															? option.full
															: undefined
													}
													onClick={() => {
														setFolder(folderPath);
														setFolderMenuOpen(false);
													}}
													className={`mb-0.5 block w-full truncate rounded px-1.5 py-1 text-left text-[11px] ${
														folder === folderPath
															? "bg-violet-100 font-semibold text-violet-800"
															: "text-gray-700 hover:bg-violet-50"
													}`}
												>
													{option.text}
												</button>
											);
										})
									)}
								</div>
							</div>
						)}
					</div>
				</div>
				{template.trim() ? (
					<p className="truncate text-[10px] text-gray-500">
						Example:{" "}
						<span className="font-mono text-gray-700">
							{exampleName || "(empty)"}
						</span>
					</p>
				) : null}

				<div>
					<label className="mb-0.5 block text-[11px] font-semibold text-gray-600">
						Images / zip
					</label>
					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept={ACCEPTED_TYPES}
						disabled={isBusy}
						onChange={handleFileChange}
						className="block w-full cursor-pointer rounded-md border border-dashed border-gray-300 bg-gray-50 px-2 py-2 text-[11px] text-gray-600 file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-violet-100 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-violet-700 hover:border-violet-300 disabled:opacity-50"
					/>
					{files.length > 0 && (
						<ul className="mt-1 max-h-12 space-y-0.5 overflow-y-auto text-[10px] text-gray-600 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
							{files.map((file) => (
								<li key={`${file.name}-${file.size}`}>
									{file.name} (
									{Math.max(1, Math.round(file.size / 1024))}{" "}
									KB)
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="relative z-10 flex shrink-0 items-center justify-end gap-1.5 rounded-b-xl border-t border-gray-100 bg-white px-3 py-2">
				<button
					type="button"
					onClick={onClose}
					disabled={isBusy}
					className="cursor-pointer rounded-md border border-gray-400 bg-white px-3 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="button"
					disabled={!canUpload}
					onClick={() =>
						onUpload?.({
							files,
							folder: folderPayload,
							alsoUpdate: false,
						})
					}
					className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Upload size={12} className={isUploading ? "animate-pulse" : ""} />
					{isUploading ? "Uploading..." : "Upload"}
				</button>
				<button
					type="button"
					disabled={!canApply}
					onClick={() =>
						onApply?.({
							template,
							folder: folderPayload,
						})
					}
					className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#7C3AED] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isApplying ? (
						<Loader2 size={12} className="animate-spin" />
					) : (
						<ImagePlus size={12} />
					)}
					{isApplying ? "Updating..." : "Update URLs"}
				</button>
			</div>
		</div>,
		document.body
	);
};

export default CopyMatrixUpdateImagesModal;
