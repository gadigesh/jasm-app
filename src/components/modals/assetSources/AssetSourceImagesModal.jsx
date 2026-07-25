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

const tabClass = (active) =>
	`border-b-2 px-1 pb-3 text-sm font-semibold transition-colors ${
		active
			? "border-[#7C3AED] text-[#7C3AED]"
			: "border-transparent text-gray-500 hover:text-gray-800"
	}`;

const AssetSourceImagesModal = ({
	isOpen,
	onClose,
	accountId,
	columns = [],
	folders = [],
}) => {
	const [activeTab, setActiveTab] = useState("upload");
	const [referenceColumn, setReferenceColumn] = useState("");
	const [folder, setFolder] = useState("");
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [selectedFile, setSelectedFile] = useState(null);
	const deferredSearch = useDeferredValue(search.trim());
	const queryFolder = search.trim() ? "" : folder;
	const panelRef = useRef(null);
	const dragOffsetRef = useRef({ x: 0, y: 0 });
	const [position, setPosition] = useState(null);
	const [isDragging, setIsDragging] = useState(false);

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
		},
		{
			skip: !isOpen || activeTab !== "preview" || !accountId,
			refetchOnMountOrArgChange: true,
		}
	);
	const resultData =
		currentImageData || (!isFetchingImages ? imageData : null);
	const files = resultData?.assets || [];
	const pagination = resultData?.pagination || {
		page: 1,
		total: 0,
		totalPages: 1,
	};
	const displayedFiles = selectedFile ? [selectedFile] : files;
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
							Upload image assets or preview URLs before applying them.
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

				<div className="flex gap-6 border-b border-gray-200 px-4 pt-3">
					<button
						type="button"
						onClick={() => setActiveTab("upload")}
						className={tabClass(activeTab === "upload")}
					>
						Upload Images
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("preview")}
						className={tabClass(activeTab === "preview")}
					>
						Image Preview
					</button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					{activeTab === "upload" ? (
						<div className="flex min-h-[250px] items-center justify-center">
							<div className="flex w-full max-w-sm flex-col items-center rounded-xl border-2 border-dashed border-[#8B5CF6] bg-purple-50/60 px-6 py-7 text-center">
								<Upload
									size={38}
									strokeWidth={1.8}
									className="mb-4 text-[#7C3AED]"
								/>
								<p className="text-base font-semibold text-gray-900">
									Drag and drop your image asset source
								</p>
								<p className="mt-4 text-sm text-gray-400">
									XLSX, CSV, up to 50MB
								</p>
								<button
									type="button"
									className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#B600C9] px-7 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#9A00AB]"
								>
									<PlusCircle size={16} />
									Add Files
								</button>
							</div>
						</div>
					) : (
						<div className="flex h-full min-h-0 flex-col">
							<div className="grid gap-3 sm:grid-cols-3">
								<label className="block">
									<span className="mb-2 block text-sm font-semibold text-gray-700">
										Select the image reference column
									</span>
									<div className="relative">
										<select
											value={referenceColumn}
											onChange={(event) =>
												setReferenceColumn(event.target.value)
											}
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

								<label className="block">
									<span className="mb-2 block text-sm font-semibold text-gray-700">
										Folder
									</span>
									<div className="relative">
										<select
											value={folder}
											onChange={(event) => {
												setFolder(event.target.value);
												setSearch("");
												setSelectedFile(null);
												setPage(1);
											}}
											className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-700 outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-purple-100"
										>
											<option value="">All folders</option>
											{folders.map((folderPath) => (
												<option key={folderPath} value={folderPath}>
													{folderPath}
												</option>
											))}
										</select>
										<ChevronDown
											size={18}
											className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A78BFA]"
										/>
									</div>
								</label>

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

							<div className="mt-3 flex h-[370px] shrink-0 flex-col border-y border-gray-200 py-3">
								{!selectedFile &&
								(isLoadingImages ||
									(isFetchingImages && !currentImageData)) ? (
									<div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500">
										<Loader2
											size={20}
											className="animate-spin text-[#7C3AED]"
										/>
										Loading account files...
									</div>
								) : isImagesError && !selectedFile ? (
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
														className="min-w-0"
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
								<button
									type="button"
									onClick={onClose}
									className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									type="button"
									className="rounded-lg bg-[#7C3AED] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9]"
								>
									Apply URLs
								</button>
							</div>
						</div>
					)}
				</div>
			</div>,
		document.body
	);
};

export default AssetSourceImagesModal;
