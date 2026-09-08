import React, { useRef, useState } from "react";
import {
	ImagePlus,
	Plus,
	MoreHorizontal,
	Redo2,
	Undo2,
} from "lucide-react";
import CopyMatrixMoreOptionsMenu from "./CopyMatrixMoreOptionsMenu";

const toolbarBtnClass =
	"inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#7C3AED] border border-[#7C3AED]/40 rounded-lg bg-white hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const CopyMatrixSheetToolbar = ({
	disabled = false,
	onUndo,
	onRedo,
	canUndo = false,
	canRedo = false,
	onUpdateImages,
	onAddRow,
	onAddColumn,
	onCloneRow,
	onCloneColumn,
}) => {
	const [moreOpen, setMoreOpen] = useState(false);
	const moreBtnRef = useRef(null);

	return (
		<div className="flex items-center gap-2">
			{onUndo && (
				<button
					type="button"
					title="Undo recent AS change"
					aria-label="Undo recent AS change"
					disabled={disabled || !canUndo}
					onClick={onUndo}
					className={`${toolbarBtnClass} !px-2.5`}
				>
					<Undo2 size={16} />
				</button>
			)}
			{onRedo && (
				<button
					type="button"
					title="Redo recent AS change"
					aria-label="Redo recent AS change"
					disabled={disabled || !canRedo}
					onClick={onRedo}
					className={`${toolbarBtnClass} !px-2.5`}
				>
					<Redo2 size={16} />
				</button>
			)}

			{onUpdateImages && (
				<button
					type="button"
					disabled={disabled}
					onClick={onUpdateImages}
					className={toolbarBtnClass}
				>
					<ImagePlus size={16} />
					Update Images
				</button>
			)}

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
