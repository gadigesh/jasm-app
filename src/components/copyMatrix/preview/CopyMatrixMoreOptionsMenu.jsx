import React, { useEffect, useRef } from "react";
import { Rows3, Columns3 } from "lucide-react";

const CopyMatrixMoreOptionsMenu = ({
	isOpen,
	onClose,
	onCloneRow,
	onCloneColumn,
	anchorRef,
}) => {
	const menuRef = useRef(null);

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

	const items = [
		{
			key: "clone-row",
			label: "Clone row",
			icon: Rows3,
			onClick: onCloneRow,
		},
		{
			key: "clone-column",
			label: "Clone column",
			icon: Columns3,
			onClick: onCloneColumn,
		},
	];

	return (
		<div
			ref={menuRef}
			className="absolute right-0 top-full mt-2 z-50 min-w-[180px] rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
		>
			{items.map(({ key, label, icon: Icon, onClick }) => (
				<button
					key={key}
					type="button"
					onClick={() => {
						onClick?.();
						onClose?.();
					}}
					className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED] transition-colors"
				>
					<Icon size={16} className="text-gray-400" />
					{label}
				</button>
			))}
		</div>
	);
};

export default CopyMatrixMoreOptionsMenu;
