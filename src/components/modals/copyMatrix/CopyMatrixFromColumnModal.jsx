import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X } from "lucide-react";
import { formSelectClass } from "../../../utils/formStyles";
import { AUTO_ROW_ID_COLUMN } from "../../../utils/constants";

/**
 * Floating, draggable "From other column" panel.
 */
const CopyMatrixFromColumnModal = ({
	isOpen,
	onClose,
	onConfirm,
	targetColumn,
	columns = [],
	anchorRect = null,
	selectedCount = 0,
	isLoading = false,
}) => {
	const panelRef = useRef(null);
	const dragOffset = useRef({ x: 0, y: 0 });
	const [sourceColumn, setSourceColumn] = useState("");
	const [position, setPosition] = useState({ top: 96, left: 96 });
	const [dragging, setDragging] = useState(false);

	const hasSelectedRows = selectedCount > 0;
	const options = columns.filter(
		(col) => col !== AUTO_ROW_ID_COLUMN && col !== targetColumn
	);

	useEffect(() => {
		if (!isOpen) return;
		const available = columns.filter(
			(col) => col !== AUTO_ROW_ID_COLUMN && col !== targetColumn
		);
		setSourceColumn(available[0] || "");
	}, [isOpen, targetColumn, columns]);

	useEffect(() => {
		if (!isOpen) return;

		const width = 300;
		const height = 260;
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
	}, [isOpen, targetColumn, anchorRect]);

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
					From other column — {targetColumn}
				</p>
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
						  } selected — Apply copies to these only.`
						: "Select rows anytime, then Apply — or Apply for the whole column."}
				</p>

				<label className="mb-0.5 block text-[11px] font-semibold text-gray-600">
					Source column
				</label>
				<select
					value={sourceColumn}
					onChange={(e) => setSourceColumn(e.target.value)}
					className={`${formSelectClass} mb-3 !px-2 !py-1.5 text-xs`}
					disabled={isLoading || options.length === 0}
				>
					{options.length === 0 ? (
						<option value="">No columns available</option>
					) : (
						options.map((col) => (
							<option key={col} value={col}>
								{col}
							</option>
						))
					)}
				</select>

				<div className="flex flex-wrap gap-1.5">
					<button
						type="button"
						disabled={!sourceColumn || isLoading}
						onClick={() => onConfirm?.(sourceColumn)}
						title={
							hasSelectedRows
								? `Copy into ${selectedCount} selected row(s)`
								: "Copy into the entire column"
						}
						className="rounded-md bg-[#7C3AED] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
					>
						{isLoading
							? "…"
							: hasSelectedRows
							? "Apply selected"
							: "Apply"}
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

export default CopyMatrixFromColumnModal;
