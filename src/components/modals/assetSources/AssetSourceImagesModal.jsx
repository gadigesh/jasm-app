import React, {
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	File,
	GripVertical,
	ImageIcon,
	Loader2,
	PlusCircle,
	Search,
	Upload,
	X,
} from "lucide-react";
import { AUTO_ROW_ID_COLUMN } from "../../../utils/constants";
import { useGetMindshareAssetsQuery } from "../../../store/services/accounts";

const fileNameKey = (value) =>
	String(value || "")
		.split("/")
		.pop()
		.trim()
		.toLowerCase();

const isImageFile = (file) =>
	String(file?.type || "").toLowerCase().startsWith("image/") ||
	/\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(
		String(file?.name || "")
	);

const isZipFile = (file) =>
	/application\/(?:x-)?zip/i.test(String(file?.type || "")) ||
	/\.zip$/i.test(String(file?.name || ""));

const isImageTargetColumn = (column) => {
	const value = String(column || "").trim();
	const hasImageName = /image/i.test(value) && !/^image$/i.test(value);
	const hasSizedBackground =
		/(?:^|[^a-z0-9])bg[12](?:$|[^a-z0-9])/i.test(value) &&
		/\d{2,5}\s*(?:x|×|by|[-_])\s*\d{2,5}/i.test(value);
	return hasImageName || hasSizedBackground;
};

const AssetSourceImagesModal = ({
	isOpen,
	onClose,
	onUpload,
	onApply,
	isUploading = false,
	isApplying = false,
	accountId,
	columns = [],
	folders = [],
}) => {
	const [referenceColumn, setReferenceColumn] = useState("");
	const [folder, setFolder] = useState("");
	const [folderMenuOpen, setFolderMenuOpen] = useState(false);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [selectedFile, setSelectedFile] = useState(null);
	const [validationMessage, setValidationMessage] = useState("");
	// The dropdown displays "All folders" by default, so that is a valid
	// folder scope even when its internal value is an empty string.
	const [folderWasSelected, setFolderWasSelected] = useState(true);
	const [recentUploads, setRecentUploads] = useState([]);
	const [assetRefreshKey, setAssetRefreshKey] = useState(0);
	const deferredSearch = useDeferredValue(search.trim());
	const queryFolder = search.trim() ? "" : folder;
	const panelRef = useRef(null);
	const folderMenuRef = useRef(null);
	const fileInputRef = useRef(null);
	const recentUploadsRef = useRef([]);
	const dragOffsetRef = useRef({ x: 0, y: 0 });
	const referenceColumnRef = useRef("");
	const folderRef = useRef("");
	const folderWasSelectedRef = useRef(true);
	const validationTimerRef = useRef(null);
	const [position, setPosition] = useState(null);
	const [isDragging, setIsDragging] = useState(false);
	const folderOptions = useMemo(
		() => [
			...new Set(
				["", ...folders, folder]
					.map((value) => String(value || "").trim())
					.filter((value, index) => index === 0 || value)
			),
		],
		[folder, folders]
	);

	useEffect(() => {
		recentUploadsRef.current = recentUploads;
	}, [recentUploads]);

	useEffect(
		() => () => {
			recentUploadsRef.current.forEach((file) =>
				URL.revokeObjectURL(file.url)
			);
			if (validationTimerRef.current) {
				clearTimeout(validationTimerRef.current);
			}
		},
		[]
	);

	const clearValidationMessage = () => {
		if (validationTimerRef.current) {
			clearTimeout(validationTimerRef.current);
			validationTimerRef.current = null;
		}
		setValidationMessage("");
	};

	const showValidationMessage = (message) => {
		if (validationTimerRef.current) {
			clearTimeout(validationTimerRef.current);
		}
		setValidationMessage(message);
		validationTimerRef.current = setTimeout(() => {
			setValidationMessage("");
			validationTimerRef.current = null;
		}, 45_000);
	};

	const availableColumns = useMemo(
		() => columns.filter((column) => column !== AUTO_ROW_ID_COLUMN),
		[columns]
	);

	const {
		data: imageData,
		currentData: currentImageData,
		isLoading: isLoadingImages,
		isFetching: isFetchingImages,
		isError: isImagesError,
	} = useGetMindshareAssetsQuery(
		{
			accountId,
			page,
			limit: 10,
			folder: queryFolder,
			search: deferredSearch,
			refresh: assetRefreshKey,
		},
		{
			skip: !isOpen || !accountId,
			refetchOnMountOrArgChange: true,
		}
	);
	// Keep the previous page visible while a new folder/search page loads.
	const resultData = currentImageData || imageData;
	const files = resultData?.assets || [];
	const pagination = resultData?.pagination || {
		page: 1,
		total: 0,
		totalPages: 1,
	};
	const recentFilesForPage = useMemo(() => {
		if (page !== 1 || selectedFile) return [];
		const query = search.trim().toLowerCase();
		const serverNames = new Set(files.map((file) => fileNameKey(file.name)));
		return recentUploads.filter((file) => {
			if (!query && file.folder !== folder) return false;
			if (serverNames.has(fileNameKey(file.name))) return false;
			return (
				!query ||
				[file.name, file.mimeType, file.url].some((value) =>
					String(value || "").toLowerCase().includes(query)
				)
			);
		});
	}, [files, folder, page, search, selectedFile, recentUploads]);
	const displayedFiles = selectedFile
		? [selectedFile]
		: [...recentFilesForPage, ...files].slice(0, 10);
	const displayedPagination = selectedFile
		? { page: 1, total: 1, totalPages: 1 }
		: pagination;
	const fileSlots = [
		...displayedFiles,
		...Array.from(
			{ length: Math.max(0, 10 - displayedFiles.length) },
			() => null
		),
	];

	useEffect(() => {
		if (!isDragging) return;

		const handleMove = (event) => {
			const panel = panelRef.current;
			if (!panel) return;
			const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
			const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
			setPosition({
				left: Math.min(
					maxLeft,
					Math.max(8, event.clientX - dragOffsetRef.current.x)
				),
				top: Math.min(
					maxTop,
					Math.max(8, event.clientY - dragOffsetRef.current.y)
				),
			});
		};
		const handleUp = () => setIsDragging(false);

		window.addEventListener("mousemove", handleMove);
		window.addEventListener("mouseup", handleUp);
		return () => {
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("mouseup", handleUp);
		};
	}, [isDragging]);

	useEffect(() => {
		if (!folderMenuOpen) return;
		const closeFolderMenu = (event) => {
			if (!folderMenuRef.current?.contains(event.target)) {
				setFolderMenuOpen(false);
			}
		};
		window.addEventListener("mousedown", closeFolderMenu);
		return () => window.removeEventListener("mousedown", closeFolderMenu);
	}, [folderMenuOpen]);

	if (!isOpen) return null;

	const startDragging = (event) => {
		if (event.button !== 0) return;
		const panel = panelRef.current;
		if (!panel) return;
		const rect = panel.getBoundingClientRect();
		dragOffsetRef.current = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		setPosition({ left: rect.left, top: rect.top });
		setIsDragging(true);
		event.preventDefault();
	};

	const handleFileSelection = async (event) => {
		const files = Array.from(event.target.files || []);
		if (!files.length) return;
		try {
			const uploadResult = await onUpload?.({
				files,
				folder: folder || undefined,
			});
			if (uploadResult === null) return;
			const resolvedFolder = String(uploadResult?.folder || "").trim();
			if (resolvedFolder) {
				folderRef.current = resolvedFolder;
				folderWasSelectedRef.current = true;
				setFolder(resolvedFolder);
				setFolderWasSelected(true);
				clearValidationMessage();
			}
			// ZIP files are unpacked by the server and should not appear as a
			// single preview item. The refreshed account-assets query displays
			// the extracted images instead.
			const previews = files
				.filter((file) => !isZipFile(file))
				.map((file) => ({
					name: file.name,
					url: URL.createObjectURL(file),
					mimeType: file.type || "",
					isImage: isImageFile(file),
					folder,
				}));
			setRecentUploads((current) => {
				current.forEach((file) => URL.revokeObjectURL(file.url));
				return [...previews, ...current].slice(0, 10);
			});
			setSelectedFile(null);
			setPage(1);
			setAssetRefreshKey((current) => current + 1);
		} finally {
			event.target.value = "";
		}
	};

	return createPortal(
		<div
			ref={panelRef}
			style={
				position
					? { left: position.left, top: position.top }
					: { right: 24, top: 72 }
			}
			className="fixed z-[120] flex h-[650px] max-h-[calc(100vh-32px)] w-[820px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
		>
			{(isUploading || isApplying) && (
				<div
					className="pointer-events-none absolute right-12 top-2 z-[130] w-48 rounded-lg border border-violet-200 bg-white/95 px-2.5 py-1.5 shadow-md"
					role="progressbar"
					aria-valuemin="0"
					aria-valuemax="100"
					aria-valuetext={
						isApplying ? "Applying image URLs" : "Uploading images"
					}
				>
					<div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-800">
						<Loader2 size={12} className="animate-spin" />
						<span>{isApplying ? "Applying URLs..." : "Uploading..."}</span>
					</div>
					<div className="mt-1 h-1 overflow-hidden rounded-full bg-violet-100">
						<div className="h-full w-2/5 animate-pulse rounded-full bg-violet-600" />
					</div>
				</div>
			)}
				<div
					onMouseDown={startDragging}
					className={`flex cursor-grab items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 active:cursor-grabbing ${
						isDragging ? "cursor-grabbing" : ""
					}`}
				>
					<GripVertical
						size={18}
						className="mr-2 shrink-0 text-gray-400"
					/>
					<div>
						<h2 className="text-base font-bold text-gray-900">
							Update Images
						</h2>
						<p className="mt-0.5 text-xs text-gray-500">
							Upload image assets or preview account files before applying them.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="ml-auto rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
						aria-label="Close update images"
					>
						<X size={18} />
					</button>
				</div>

				<div className="border-b border-gray-200 px-4 pt-3">
					<div className="inline-block border-b-2 border-[#7C3AED] px-1 pb-3 text-sm font-semibold text-[#7C3AED]">
						Upload Images
					</div>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<div className="flex h-full min-h-0 flex-col">
							<div className="grid gap-3 sm:grid-cols-3">
								<label className="block">
									<span className="mb-2 block text-sm font-semibold text-gray-700">
										Select the image reference column
									</span>
									<div className="relative">
										<select
											value={referenceColumn}
											onChange={(event) => {
												const value = event.target.value;
												referenceColumnRef.current = value;
												setReferenceColumn(value);
												clearValidationMessage();
											}}
											className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-700 outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-purple-100"
										>
											<option value="">Select the column</option>
											{availableColumns.map((column) => (
												<option key={column} value={column}>
													{column}
												</option>
											))}
										</select>
										<ChevronDown
											size={18}
											className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A78BFA]"
										/>
									</div>
								</label>

								<div className="relative block" ref={folderMenuRef}>
									<span className="mb-2 block text-sm font-semibold text-gray-700">
										Folder
									</span>
									<div className="relative">
										<button
											type="button"
											onClick={() =>
												setFolderMenuOpen((open) => !open)
											}
											className="flex h-11 w-full items-center rounded-lg border border-gray-300 bg-white px-4 pr-10 text-left text-sm text-gray-700 outline-none hover:border-violet-300 focus:border-[#8B5CF6] focus:ring-2 focus:ring-purple-100"
										>
											<span className="truncate">
												{folder || "All folders"}
											</span>
										</button>
										<ChevronDown
											size={18}
											className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A78BFA] transition-transform ${
												folderMenuOpen ? "rotate-180" : ""
											}`}
										/>
									</div>
									{folderMenuOpen && (
										<div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
											{folderOptions.map((folderPath) => (
												<button
													key={folderPath || "__all__"}
													type="button"
													title={folderPath || "All folders"}
													onClick={() => {
														folderRef.current = folderPath;
														folderWasSelectedRef.current = true;
														setFolder(folderPath);
														setFolderWasSelected(true);
														clearValidationMessage();
														setSearch("");
														setSelectedFile(null);
														setPage(1);
														setFolderMenuOpen(false);
													}}
													className={`block w-full truncate rounded-md px-3 py-2 text-left text-xs ${
														folder === folderPath
															? "bg-violet-100 font-semibold text-violet-800"
															: "text-gray-700 hover:bg-violet-50"
													}`}
												>
													{folderPath || "All folders"}
												</button>
											))}
										</div>
									)}
								</div>

								<label className="relative block">
									<span className="mb-2 block text-sm font-semibold text-gray-700">
										Search files
									</span>
									<div className="relative">
										<Search
											size={16}
											className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
										/>
										<input
											type="search"
											value={search}
											onChange={(event) => {
												setSearch(event.target.value);
												setSelectedFile(null);
												setPage(1);
											}}
											placeholder="Name, type, or URL"
											className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-purple-100"
										/>
									</div>
									{search.trim() && !selectedFile && (
										<div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
											{isFetchingImages ? (
												<p className="px-3 py-2 text-xs text-gray-500">
													Searching...
												</p>
											) : files.length > 0 ? (
												files.map((file) => (
													<button
														key={file.url}
														type="button"
														onMouseDown={(event) =>
															event.preventDefault()
														}
														onClick={() => {
															setSearch(file.name || "");
															setSelectedFile(file);
															setPage(1);
														}}
														className="block w-full truncate rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED]"
														title={file.name}
													>
														{file.name || file.url}
													</button>
												))
											) : (
												<p className="px-3 py-2 text-xs text-gray-500">
													No matching filenames
												</p>
											)}
										</div>
									)}
								</label>
							</div>

							{validationMessage && (
								<p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
									{validationMessage}
								</p>
							)}

							<div className="mt-3 flex h-[370px] shrink-0 flex-col border-y border-gray-200 py-3">
								{!selectedFile && isLoadingImages && !resultData ? (
									<div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500">
										<Loader2
											size={20}
											className="animate-spin text-[#7C3AED]"
										/>
										Loading account files...
									</div>
								) : isImagesError && !selectedFile && !resultData ? (
									<div className="flex flex-1 items-center justify-center text-sm text-red-600">
										Could not load files from the account.
									</div>
								) : displayedFiles.length > 0 ? (
									<>
										<div className="grid grid-cols-5 grid-rows-2 gap-2">
											{fileSlots.map((file, index) =>
												file ? (
													<div
														key={`${file.url}-${index}`}
														title={file.name || file.url}
														className="group relative min-w-0 cursor-pointer"
													>
														{file.isImage ? (
															<div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
																<img
																	src={file.url}
																	alt={
																		file.name ||
																		`Asset ${index + 1}`
																	}
																	className="h-full w-full object-contain p-1"
																	loading="lazy"
																	decoding="async"
																/>
															</div>
														) : (
															<div className="flex aspect-square w-full flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 text-center">
																<File
																	size={28}
																	strokeWidth={1.5}
																	className="text-[#7C3AED]"
																/>
																<span className="mt-0.5 max-w-full truncate text-[8px] uppercase text-gray-500">
																	{file.mimeType ||
																		file.name?.split(".").pop() ||
																		"File"}
																</span>
															</div>
														)}
														<div className="pointer-events-none absolute bottom-1 left-1 right-1 z-10 truncate rounded-md border border-violet-200 bg-gradient-to-r from-violet-50/95 to-fuchsia-50/95 px-1.5 py-1 text-center text-[10px] font-semibold text-violet-800 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
															{file.name || file.url}
														</div>
													</div>
												) : (
													<div
														key={`empty-${index}`}
														aria-hidden="true"
														className="min-w-0"
													>
														<div className="aspect-square w-full rounded-md border border-dashed border-gray-200 bg-gray-50/50" />
													</div>
												)
											)}
										</div>

										<div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-2">
											<p className="text-xs text-gray-500">
												{displayedPagination.total} file
												{displayedPagination.total === 1 ? "" : "s"} · Page{" "}
												{displayedPagination.page} of{" "}
												{displayedPagination.totalPages}
											</p>
											<div className="flex gap-2">
												<button
													type="button"
													disabled={displayedPagination.page <= 1}
													onClick={() =>
														setPage((current) =>
															Math.max(1, current - 1)
														)
													}
													className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
												>
													<ChevronLeft size={14} />
													Previous
												</button>
												<button
													type="button"
													disabled={
														displayedPagination.page >=
														displayedPagination.totalPages
													}
													onClick={() =>
														setPage((current) => current + 1)
													}
													className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
												>
													Next
													<ChevronRight size={14} />
												</button>
											</div>
										</div>
									</>
								) : (
									<div className="flex flex-1 flex-col items-center justify-center text-center text-gray-400">
										<ImageIcon size={34} strokeWidth={1.5} />
										<p className="mt-3 text-sm">
											No matching files are available in this account.
										</p>
									</div>
								)}
							</div>

							<div className="-mx-4 mt-auto flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-white px-4 pt-3">
								<input
									ref={fileInputRef}
									type="file"
									multiple
									accept="image/*,.zip,application/zip,application/x-zip-compressed"
									onChange={handleFileSelection}
									className="hidden"
								/>
								<button
									type="button"
									disabled={isUploading}
									onClick={() => fileInputRef.current?.click()}
									className="mr-auto inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-5 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
								>
									<Upload size={16} />
									{isUploading ? "Uploading..." : "Upload Images"}
								</button>
								<button
									type="button"
									onClick={onClose}
									className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									type="button"
									disabled={isApplying}
									onClick={() => {
										const selectedReferenceColumn = String(
											referenceColumnRef.current || referenceColumn
										).trim();
										const selectedFolder = String(
											folderRef.current ?? folder
										).trim();
										const hasFolderSelection =
											folderWasSelectedRef.current ||
											folderWasSelected ||
											Boolean(selectedFolder);
										if (
											!selectedReferenceColumn ||
											!hasFolderSelection
										) {
											showValidationMessage(
												"Please select the image reference column and folder."
											);
											return;
										}
										const referenceKey =
											selectedReferenceColumn.toLowerCase();
										const targetColumns = availableColumns.filter(
											(column) =>
												String(column || "")
													.trim()
													.toLowerCase() !== referenceKey &&
												isImageTargetColumn(column)
										);
										if (targetColumns.length === 0) {
											showValidationMessage(
												"No image or sized BG columns are available to receive the URLs."
											);
											return;
										}
										clearValidationMessage();
										onApply?.({
											referenceColumn: selectedReferenceColumn,
											targetColumns,
											template: `[${selectedReferenceColumn}]`,
											folder: selectedFolder,
										});
									}}
									className="rounded-lg bg-[#7C3AED] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isApplying ? "Applying..." : "Apply URLs"}
								</button>
							</div>
						</div>
				</div>
			</div>,
		document.body
	);
};

export default AssetSourceImagesModal;
