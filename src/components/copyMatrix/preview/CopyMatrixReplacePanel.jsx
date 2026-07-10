import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, Redo2, Search, Undo2, X } from "lucide-react";
import { formInputClass } from "../../../utils/formStyles";

/**
 * Floating, draggable Find/Replace panel with Undo / Redo.
 */
const CopyMatrixReplacePanel = ({
	isOpen,
	columnName,
	anchorRect = null,
	selectedCount = 0,
	isLoading = false,
	statusMessage = null,
	canUndo = false,
	canRedo = false,
	onFind,
	onReplaceAll,
	onUndo,
	onRedo,
	onClose,
}) => {
	const panelRef = useRef(null);
	const dragOffset = useRef({ x: 0, y: 0 });
	const [find, setFind] = useState("");
	const [replace, setReplace] = useState("");
	const [position, setPosition] = useState({ top: 96, left: 96 });
	const [dragging, setDragging] = useState(false);

	const hasSelectedRows = selectedCount > 0;

	useEffect(() => {
		if (!isOpen) return;
		setFind("");
		setReplace("");
	}, [isOpen, columnName]);

	useEffect(() => {
		if (!isOpen) return;

		const width = 300;
		const height = 300;
		let top = 96;
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
	}, [isOpen, columnName]);

	useEffect(() => {
		if (!dragging) return;

		const onMove = (e) => {
			setPosition({
				top: Math.max(
					0,
					Math.min(
						window.innerHeight - 40,
						e.clientY - dragOffset.current.y
					)
				),
				left: Math.max(
					0,
					Math.min(
						window.innerWidth - 40,
						e.clientX - dragOffset.current.x
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

	if (!isOpen) return null;

	// Empty Find is allowed — it targets blank cells (shown as "—" in the sheet)
	const canRun = !isLoading;

	const startDrag = (e) => {
		if (e.button !== 0) return;
		const rect = panelRef.current?.getBoundingClientRect();
		if (!rect) return;
		dragOffset.current = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
		setDragging(true);
		e.preventDefault();
	};

	return createPortal(
		<div
			ref={panelRef}
			style={{ top: position.top, left: position.left }}
			className="pointer-events-auto fixed z-[10000] w-[300px] rounded-xl border border-gray-200 bg-white shadow-2xl"
		>
			<div
				onMouseDown={startDrag}
				className={`flex cursor-grab items-center gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50 px-3 py-2 active:cursor-grabbing ${
					dragging ? "cursor-grabbing" : ""
				}`}
			>
				<GripVertical size={14} className="shrink-0 text-gray-400" />
				<p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
					Replace — {columnName}
				</p>
				<button
					type="button"
					title="Undo last replace"
					disabled={!canUndo || isLoading}
					onClick={() => onUndo?.()}
					className="rounded p-1 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
				>
					<Undo2 size={15} />
				</button>
				<button
					type="button"
					title="Redo last replace"
					disabled={!canRedo || isLoading}
					onClick={() => onRedo?.()}
					className="rounded p-1 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
				>
					<Redo2 size={15} />
				</button>
				<button
					type="button"
					onClick={onClose}
					disabled={isLoading}
					className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
				>
					<X size={14} />
				</button>
			</div>

			<div className="px-3 py-2.5">
				<p
					className={`mb-2 rounded px-2 py-1 text-[11px] ${
						hasSelectedRows
							? "border border-green-200 bg-green-50 text-green-800"
							: "border border-gray-200 bg-gray-50 text-gray-600"
					}`}
				>
					{hasSelectedRows
						? `${selectedCount} row${
								selectedCount === 1 ? "" : "s"
						  } selected — Replace all applies to these only. Leave Find empty to fill blank cells.`
						: "Leave Find empty to find/fill blank cells (shown as —). Select rows anytime, then Replace all."}
				</p>

				<label className="mb-0.5 block text-[11px] font-semibold text-gray-600">
					Find
				</label>
				<input
					type="text"
					value={find}
					onChange={(e) => setFind(e.target.value)}
					className={`${formInputClass} mb-2 !px-2 !py-1.5 text-xs whitespace-pre`}
					placeholder="Find what… (empty = blank cells)"
					autoFocus
					disabled={isLoading}
				/>

				<label className="mb-0.5 block text-[11px] font-semibold text-gray-600">
					Replace with
				</label>
				<input
					type="text"
					value={replace}
					onChange={(e) => setReplace(e.target.value)}
					className={`${formInputClass} mb-2 !px-2 !py-1.5 text-xs whitespace-pre`}
					placeholder="Replace with… (spaces kept in middle)"
					disabled={isLoading}
				/>

				{statusMessage && (
					<p className="mb-2 rounded border border-purple-100 bg-purple-50 px-2 py-1 text-[11px] text-[#6D28D9]">
						{statusMessage}
					</p>
				)}

				<div className="flex flex-wrap gap-1.5">
					<button
						type="button"
						disabled={!canRun}
						onClick={() => onFind?.({ find })}
						className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
					>
						<Search size={11} />
						Find
					</button>
					<button
						type="button"
						disabled={!canRun}
						onClick={() =>
							onReplaceAll?.({
								find,
								replace,
								mode: "replaceAll",
							})
						}
						title={
							hasSelectedRows
								? `Replace matches in ${selectedCount} selected row(s)`
								: "Replace matches in the entire column"
						}
						className="rounded-md bg-[#7C3AED] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
					>
						{isLoading ? "…" : "Replace all"}
					</button>
					<button
						type="button"
						onClick={onClose}
						disabled={isLoading}
						className="rounded-md border border-gray-400 bg-white px-2 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-50"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
};

export default CopyMatrixReplacePanel;
