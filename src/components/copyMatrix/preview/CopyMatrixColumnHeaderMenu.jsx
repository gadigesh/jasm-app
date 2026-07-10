import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Hash,
	Columns3,
	Calendar,
	Copy,
	Replace,
	Pencil,
	Trash2,
} from "lucide-react";

const MENU_SECTIONS = [
	{
		key: "fill",
		title: "Fill the column",
		items: [
			{
				key: "sequence-number",
				label: "Sequence number",
				icon: Hash,
			},
			{
				key: "from-other-column",
				label: "From other column",
				icon: Columns3,
			},
			{
				key: "select-date",
				label: "Select Date",
				icon: Calendar,
			},
		],
	},
	{
		key: "copy-move",
		title: null,
		items: [
			{
				key: "clone-col",
				label: "Clone col",
				icon: Copy,
			},
			{
				key: "replace",
				label: "Replace",
				icon: Replace,
			},
		],
	},
	{
		key: "manage",
		title: null,
		items: [
			{
				key: "rename-column",
				label: "Rename the column",
				icon: Pencil,
			},
			{
				key: "delete-column",
				label: "Delete the column",
				icon: Trash2,
				danger: true,
			},
		],
	},
];

/**
 * Column header popup menu.
 * Replace opens a floating panel via onAction (not embedded here).
 */
const CopyMatrixColumnHeaderMenu = ({
	isOpen,
	onClose,
	columnName,
	anchorRef,
	onAction,
	canRenameDelete = true,
}) => {
	const menuRef = useRef(null);
	const [position, setPosition] = useState({ top: 0, left: 0 });

	useLayoutEffect(() => {
		if (!isOpen || !anchorRef?.current) return;

		const updatePosition = () => {
			const rect = anchorRef.current.getBoundingClientRect();
			const menuWidth = 220;
			const padding = 8;
			let left = rect.left;
			if (left + menuWidth > window.innerWidth - padding) {
				left = Math.max(
					padding,
					window.innerWidth - menuWidth - padding
				);
			}
			setPosition({
				top: rect.bottom + 4,
				left,
			});
		};

		updatePosition();
		window.addEventListener("scroll", updatePosition, true);
		window.addEventListener("resize", updatePosition);
		return () => {
			window.removeEventListener("scroll", updatePosition, true);
			window.removeEventListener("resize", updatePosition);
		};
	}, [isOpen, anchorRef]);

	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event) => {
			if (
				menuRef.current?.contains(event.target) ||
				anchorRef?.current?.contains(event.target)
			) {
				return;
			}
			onClose?.();
		};

		const handleEscape = (event) => {
			if (event.key === "Escape") onClose?.();
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, onClose, anchorRef]);

	if (!isOpen) return null;

	return createPortal(
		<div
			ref={menuRef}
			role="menu"
			style={{ top: position.top, left: position.left }}
			className="fixed z-[9999] min-w-[220px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
		>
			{MENU_SECTIONS.map((section, sectionIndex) => (
				<div key={section.key}>
					{sectionIndex > 0 && (
						<div className="my-1 border-t border-gray-100" />
					)}
					{section.title && (
						<p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
							{section.title}
						</p>
					)}
					{section.items.map(({ key, label, icon: Icon, danger }) => {
						const isStructureAction =
							key === "rename-column" || key === "delete-column";
						const disabled =
							isStructureAction && !canRenameDelete;

						return (
							<button
								key={key}
								type="button"
								role="menuitem"
								disabled={disabled}
								title={
									disabled
										? "Only available when not synced with an asset source"
										: undefined
								}
								onClick={() => {
									if (disabled) return;
									const anchorRect =
										anchorRef?.current?.getBoundingClientRect?.();
									onAction?.({
										action: key,
										columnName,
										anchorRect: anchorRect
											? {
													top: anchorRect.top,
													left: anchorRect.left,
													right: anchorRect.right,
													bottom: anchorRect.bottom,
												}
											: null,
									});
									onClose?.();
								}}
								className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
									disabled
										? "cursor-not-allowed text-gray-300"
										: danger
										? "text-red-600 hover:bg-red-50"
										: "text-gray-700 hover:bg-gray-50"
								}`}
							>
								<Icon
									size={15}
									className={
										disabled
											? "text-gray-300"
											: danger
											? "text-red-500"
											: "text-gray-400"
									}
								/>
								{label}
							</button>
						);
					})}
				</div>
			))}
		</div>,
		document.body
	);
};

export default CopyMatrixColumnHeaderMenu;
export { MENU_SECTIONS };
