import React, { useRef, useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import CopyMatrixMoreOptionsMenu from "./CopyMatrixMoreOptionsMenu";

const toolbarBtnClass =
	"inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#7C3AED] border border-[#7C3AED]/40 rounded-lg bg-white hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const CopyMatrixSheetToolbar = ({
	disabled = false,
	onAddRow,
	onAddColumn,
	onCloneRow,
	onCloneColumn,
}) => {
	const [moreOpen, setMoreOpen] = useState(false);
	const moreBtnRef = useRef(null);

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				disabled={disabled}
				onClick={onAddRow}
				className={toolbarBtnClass}
			>
				<Plus size={16} />
				Row
			</button>

			<button
				type="button"
				disabled={disabled}
				onClick={onAddColumn}
				className={toolbarBtnClass}
			>
				<Plus size={16} />
				Column
			</button>

			<div className="relative">
				<button
					ref={moreBtnRef}
					type="button"
					disabled={disabled}
					onClick={() => setMoreOpen((open) => !open)}
					className={toolbarBtnClass}
					aria-expanded={moreOpen}
					aria-haspopup="menu"
				>
					<MoreHorizontal size={16} />
					More options
				</button>

				<CopyMatrixMoreOptionsMenu
					isOpen={moreOpen}
					onClose={() => setMoreOpen(false)}
					anchorRef={moreBtnRef}
					onCloneRow={onCloneRow}
					onCloneColumn={onCloneColumn}
				/>
			</div>
		</div>
	);
};

export default CopyMatrixSheetToolbar;
