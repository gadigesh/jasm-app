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
import { showError, showWarning } from "../../utils/toastMsg";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

const AddAssetSourceFromCopyMatrixModal = ({
	isOpen,
	onClose,
	accountId,
}) => {
	const navigate = useNavigate();
	const dropdownRef = useRef(null);
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
		if (!isOpen) return;
		setSearch("");
		setSelectedId("");
		setIsDropdownOpen(false);
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

	const filteredMatrices = useMemo(() => {
		const query = search.trim().toLowerCase();
		const sorted = [...matrices].sort((a, b) =>
			String(a.name || "").localeCompare(String(b.name || ""))
		);
		if (!query) return sorted;
		return sorted.filter((matrix) =>
			String(matrix.name || "").toLowerCase().includes(query)
		);
	}, [matrices, search]);

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
			// Do not override CM unique column — backend uses matrix.uniqueColumn.
			const result = await finishCopyMatrix({
				id: selectedId,
				forceNewAssetSource: true,
				...(selectedMatrix?.uniqueColumn
					? { uniqueColumn: selectedMatrix.uniqueColumn }
					: {}),
			}).unwrap();

			const assetUploadId = result?.data?.assetUploadId;
			if (!assetUploadId) {
				showError("Asset source was not created. Please try again.");
				return;
			}

			if (result?.data?.uniqueColumnNotice) {
				showWarning(result.data.uniqueColumnNotice);
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
						placeholder="Search copy matrices..."
						className={`${formInputClass} pl-9`}
					/>

					{isDropdownOpen && (
						<div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg divide-y divide-gray-100">
							{loading && (
								<div className="px-4 py-6 text-center text-sm text-gray-500">
									Loading copy matrices...
								</div>
							)}
							{!loading && filteredMatrices.length === 0 && (
								<div className="px-4 py-6 text-center text-sm text-gray-500">
									{matrices.length === 0
										? "No saved copy matrices found."
										: "No copy matrices match your search."}
								</div>
							)}
							{!loading &&
								filteredMatrices.map((matrix) => {
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
