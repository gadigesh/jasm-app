import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import ASUploadPage from "../common/ASUploadPage";
import OperationProgressOverlay from "../common/OperationProgressOverlay";
import {
	useGetCopyMatricesQuery,
	useFinishCopyMatrixMutation,
} from "../../store/services/copyMatrix";
import { formInputClass, modalCancelBtnClass } from "../../utils/formStyles";
import { showError } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

const AddAssetSourceFromCopyMatrixModal = ({
	isOpen,
	onClose,
	accountId,
}) => {
	const navigate = useNavigate();
	const dropdownRef = useRef(null);
	const didPrefillRef = useRef(false);
	const [search, setSearch] = useState("");
	const [selectedId, setSelectedId] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const {
		data: matrices = [],
		isLoading,
		isFetching,
	} = useGetCopyMatricesQuery(accountId, {
		skip: !accountId || !isOpen,
		refetchOnMountOrArgChange: true,
	});

	const [finishCopyMatrix, { isLoading: isCreating }] =
		useFinishCopyMatrixMutation();

	useEffect(() => {
		if (!isOpen) {
			didPrefillRef.current = false;
			setSearch("");
			setSelectedId("");
			setIsDropdownOpen(false);
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isDropdownOpen) return;

		const handleClickOutside = (event) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target)
			) {
				setIsDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [isDropdownOpen]);

	const namedMatrices = useMemo(
		() =>
			(matrices || []).filter((matrix) =>
				String(matrix.name || "").trim()
			),
		[matrices]
	);

	const recentMatrices = useMemo(
		() =>
			[...namedMatrices].sort((a, b) => {
				const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
				const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
				return bTime - aTime;
			}),
		[namedMatrices]
	);

	const selectedName = useMemo(() => {
		const selected = recentMatrices.find(
			(matrix) => matrix._id === selectedId
		);
		return String(selected?.name || "").trim().toLowerCase();
	}, [recentMatrices, selectedId]);

	const filteredMatrices = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query || query === selectedName) return recentMatrices;
		return recentMatrices.filter((matrix) =>
			String(matrix.name || "").toLowerCase().includes(query)
		);
	}, [recentMatrices, search, selectedName]);

	useEffect(() => {
		if (!isOpen || didPrefillRef.current || !recentMatrices[0]) return;
		didPrefillRef.current = true;
		setSelectedId(recentMatrices[0]._id);
		setSearch(recentMatrices[0].name || "");
	}, [isOpen, recentMatrices]);

	const handleSearchChange = (value) => {
		setSearch(value);
		setSelectedId("");
		setIsDropdownOpen(true);
	};

	const handleSelect = (matrix) => {
		setSelectedId(matrix._id);
		setSearch(matrix.name || "");
		setIsDropdownOpen(false);
	};

	const handleContinue = async () => {
		if (!selectedId) {
			showError("Please select a copy matrix");
			return;
		}

		const selectedMatrix = matrices.find(
			(matrix) => matrix._id === selectedId
		);
		const suggestedAssetSourceName =
			selectedMatrix?.name || search.trim();

		try {
			const result = await finishCopyMatrix({
				id: selectedId,
				forceNewAssetSource: true,
			}).unwrap();

			const assetUploadId = result?.data?.assetUploadId;
			if (!assetUploadId) {
				showError("Asset source was not created. Please try again.");
				return;
			}

			onClose();
			navigate(`/asset-sources/${assetUploadId}/preview`, {
				state: {
					refreshFromCopyMatrix: true,
					copyMatrixId: selectedId,
					syncedAt: Date.now(),
					requireNewAssetSourceName: true,
					suggestedAssetSourceName,
					returnPath: "/asset-sources",
				},
			});
		} catch (error) {
			showError(
				getApiErrorMessage(
					error,
					"Could not create asset source from copy matrix."
				)
			);
		}
	};

	const loading = isLoading || isFetching;

	return (
		<>
			<ASUploadPage
				isOpen={isOpen}
				onClose={onClose}
				disableClose={isCreating}
				title="Create asset source from copy matrix"
				maxWidth="max-w-lg"
			>
				<p className="text-sm text-gray-500 mb-5">
					Select a copy matrix to create and edit a new asset source
					synced from it.
				</p>

				<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
					Copy matrix
				</label>
				<div className="relative" ref={dropdownRef}>
					<Search
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"
					/>
					<input
						type="text"
						value={search}
						onChange={(e) => handleSearchChange(e.target.value)}
						onFocus={() => setIsDropdownOpen(true)}
						placeholder={
							recentMatrices[0]?.name || "Search copy matrices..."
						}
						className={`${formInputClass} pl-9`}
					/>

					{isDropdownOpen && (
						<div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
							<div className="max-h-48 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
							{loading && (
								<div className="px-4 py-3 text-sm text-gray-500">
									Loading copy matrices...
								</div>
							)}
							{!loading &&
								(filteredMatrices.length > 0
									? filteredMatrices
									: recentMatrices
								).map((matrix) => {
									const isSelected =
										selectedId === matrix._id;
									return (
										<button
											key={matrix._id}
											type="button"
											onMouseDown={(e) =>
												e.preventDefault()
											}
											onClick={() =>
												handleSelect(matrix)
											}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
												isSelected
													? "bg-purple-50 text-[#7C3AED] font-semibold"
													: "text-gray-900 hover:bg-gray-50"
											}`}
										>
											{matrix.name}
										</button>
									);
								})}
							</div>
						</div>
					)}
				</div>

				<div className="flex justify-end gap-3 mt-6">
					<button
						type="button"
						onClick={onClose}
						className={modalCancelBtnClass}
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleContinue}
						disabled={!selectedId || loading || isCreating}
						className="px-6 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-semibold hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isCreating ? "Creating..." : "Continue"}
					</button>
				</div>
			</ASUploadPage>
			<OperationProgressOverlay
				visible={isCreating}
				percent={isCreating ? 60 : 0}
				phase="processing"
				mode="save"
				title="Creating asset source"
				helperText="Please wait while we sync data from the selected copy matrix."
			/>
		</>
	);
};

export default AddAssetSourceFromCopyMatrixModal;
