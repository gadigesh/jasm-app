import React, { useEffect, useRef, useState, forwardRef } from "react";
import { ChevronDown, Filter } from "lucide-react";
import CopyMatrixColumnHeaderMenu from "./CopyMatrixColumnHeaderMenu";
import { AUTO_ROW_ID_COLUMN } from "../../../utils/constants";

/**
 * Clickable column header with chevron + popup menu.
 * Supports inline rename when `isRenaming` is true.
 * Optional resize handle on the right edge.
 */
const CopyMatrixColumnHeader = forwardRef(
	(
		{
			columnName,
			isHighlighted = false,
			isSticky = false,
			stickyClassName = "",
			readOnly = false,
			onAction,
			canRenameDelete = true,
			isRenaming = false,
			existingColumns = [],
			onRenameSubmit,
			onRenameCancel,
			width,
			onResizeStart,
			onResizeAutoFit,
			activeFilterValues,
			onFilterValuesOpen,
			sortDirection = "",
		},
		ref
	) => {
		const [menuOpen, setMenuOpen] = useState(false);
		const [renameValue, setRenameValue] = useState(columnName);
		const [renameError, setRenameError] = useState("");
		const triggerRef = useRef(null);
		const inputRef = useRef(null);
		const canOpenMenu =
			columnName !== AUTO_ROW_ID_COLUMN && !isRenaming;
		const hasActiveFilter = Array.isArray(activeFilterValues);
		const hasActiveSort = Boolean(sortDirection);
		const headerStateClass = isHighlighted || isRenaming
			? "bg-yellow-100"
			: hasActiveFilter
			? "bg-violet-100"
			: "bg-gray-50";

		useEffect(() => {
			if (!isRenaming) return;
			const t = setTimeout(() => {
				setRenameValue(columnName);
				setRenameError("");
				inputRef.current?.focus();
			}, 0);
			return () => clearTimeout(t);
		}, [isRenaming, columnName]);

		const trimmed = renameValue.trim();
		const isDuplicate = existingColumns.some(
			(col) =>
				col !== columnName &&
				col.toLowerCase() === trimmed.toLowerCase()
		);
		const isReserved = trimmed === AUTO_ROW_ID_COLUMN;

		const commitRename = () => {
			if (!trimmed) {
				setRenameError("Name is required");
				return;
			}
			if (isReserved) {
				setRenameError(`"${AUTO_ROW_ID_COLUMN}" is reserved`);
				return;
			}
			if (isDuplicate) {
				setRenameError("Same name already exists");
				return;
			}
			if (trimmed === columnName) {
				onRenameCancel?.();
				return;
			}
			onRenameSubmit?.(trimmed);
		};

		return (
			<th
				ref={ref}
				style={
					width
						? { width, minWidth: width, maxWidth: width }
						: undefined
				}
				className={`relative px-3 py-3 font-medium text-xs whitespace-nowrap sticky top-0 border-b border-gray-200 ${
					menuOpen || isRenaming ? "z-[200]" : "z-20"
				} ${headerStateClass} ${
					isSticky ? stickyClassName : ""
				}`}
			>
				{isRenaming ? (
					<div className="min-w-[120px]">
						<input
							ref={inputRef}
							value={renameValue}
							onChange={(e) => {
								setRenameValue(e.target.value);
								setRenameError("");
							}}
							onBlur={commitRename}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									commitRename();
								}
								if (e.key === "Escape") {
									e.preventDefault();
									onRenameCancel?.();
								}
							}}
							className="w-full min-w-[120px] rounded border border-[#B600C9] bg-white px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#B600C9]/20"
						/>
						{(renameError || isDuplicate) && (
							<p className="mt-1 max-w-[160px] whitespace-normal text-[10px] font-normal text-red-500">
								{renameError || "Same name already exists"}
							</p>
						)}
					</div>
				) : (
					<div className="relative inline-flex max-w-full pr-2">
						<button
							ref={triggerRef}
							type="button"
							disabled={!canOpenMenu}
							onClick={(e) => {
								e.stopPropagation();
								if (!canOpenMenu) return;
								setMenuOpen((open) => !open);
							}}
							className={`inline-flex items-center gap-1 max-w-full rounded px-1 py-0.5 text-left transition-colors ${
								canOpenMenu
									? "hover:bg-purple-50 cursor-pointer"
									: "cursor-default"
							}`}
							aria-expanded={menuOpen}
							aria-haspopup="menu"
						>
							<span
								className={`truncate ${
									hasActiveFilter
										? "font-semibold text-violet-800"
										: ""
								}`}
								title={
									hasActiveFilter
										? "Filter applied to this column"
										: columnName
								}
							>
								{columnName}
							</span>
							{hasActiveFilter && (
								<Filter
									size={12}
									className="shrink-0 text-violet-700"
									aria-label="Filter applied"
								/>
							)}
							{canOpenMenu && (
								<ChevronDown
									size={14}
									className={`shrink-0 transition-transform ${
										hasActiveFilter || hasActiveSort
											? "text-violet-600"
											: "text-gray-400"
									} ${
										menuOpen ? "rotate-180" : ""
									}`}
								/>
							)}
						</button>

						<CopyMatrixColumnHeaderMenu
							key={`${columnName}-${menuOpen ? "open" : "closed"}`}
							isOpen={menuOpen}
							onClose={() => setMenuOpen(false)}
							columnName={columnName}
							anchorRef={triggerRef}
							onAction={onAction}
							canRenameDelete={canRenameDelete}
							readOnly={readOnly}
							onFilterValuesOpen={onFilterValuesOpen}
						/>
					</div>
				)}

				{onResizeStart && (
					<span
						role="separator"
						aria-orientation="vertical"
						aria-label={`Resize ${columnName} column`}
						title="Drag to resize · Double-click to fit content"
						onMouseDown={onResizeStart}
						onDoubleClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onResizeAutoFit?.();
						}}
						className="absolute right-0 top-0 z-30 flex h-full w-2 cursor-col-resize items-center justify-center"
					>
						<span className="h-full w-px bg-gray-300" />
					</span>
				)}
			</th>
		);
	}
);

CopyMatrixColumnHeader.displayName = "CopyMatrixColumnHeader";

export default CopyMatrixColumnHeader;
