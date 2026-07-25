import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X } from "lucide-react";
import { formInputClass } from "../../../utils/formStyles";

const EditSheetRowModal = ({
	isOpen,
	row,
	columns = [],
	readOnlyColumns = [],
	onClose,
	onConfirm,
	isLoading = false,
}) => {
	const panelRef = useRef(null);
	const dragOffset = useRef({ x: 0, y: 0 });
	const [values, setValues] = useState({});
	const [position, setPosition] = useState({ top: 96, left: 96 });
	const [dragging, setDragging] = useState(false);

	/* eslint-disable react-hooks/set-state-in-effect -- reset and position the floating panel when it opens */
	useEffect(() => {
		if (!isOpen || !row) return;
		setValues(
			columns.reduce(
				(result, column) => ({
					...result,
					[column]: row[column] == null ? "" : String(row[column]),
				}),
				{}
			)
		);
	}, [isOpen, row, columns]);

	useEffect(() => {
		if (!isOpen) return;
		const width = 420;
		const height = 420;
		setPosition({
			top: Math.max(24, Math.min(96, window.innerHeight - height - 24)),
			left: Math.max(
				8,
				Math.min(
					window.innerWidth - width - 24,
					window.innerWidth - width - 48
				)
			),
		});
	}, [isOpen, row?._id]);
	/* eslint-enable react-hooks/set-state-in-effect */

	useEffect(() => {
		if (!dragging) return;
		const onMove = (event) => {
			setPosition({
				top: Math.max(
					0,
					Math.min(
						window.innerHeight - 40,
						event.clientY - dragOffset.current.y
					)
				),
				left: Math.max(
					0,
					Math.min(
						window.innerWidth - 40,
						event.clientX - dragOffset.current.x
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

	if (!isOpen || !row) return null;

	const startDrag = (event) => {
		if (event.button !== 0) return;
		const rect = panelRef.current?.getBoundingClientRect();
		if (!rect) return;
		dragOffset.current = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		setDragging(true);
		event.preventDefault();
	};

	return createPortal(
		<div
			ref={panelRef}
			style={{ top: position.top, left: position.left }}
			className="pointer-events-auto fixed z-[10000] flex w-[420px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
		>
			<div
				onMouseDown={startDrag}
				className={`flex shrink-0 cursor-grab items-center gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50 px-3 py-2 active:cursor-grabbing ${
					dragging ? "cursor-grabbing" : ""
				}`}
			>
				<GripVertical size={14} className="shrink-0 text-gray-400" />
				<p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
					Edit row
					{row.rowIndex != null ? ` — #${row.rowIndex}` : ""}
				</p>
				<button
					type="button"
					onClick={onClose}
					disabled={isLoading}
					className="cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
					aria-label="Close"
				>
					<X size={14} />
				</button>
			</div>

			<div
				className="overflow-y-auto overscroll-contain px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				style={{
					maxHeight: "min(360px, calc(100vh - 160px))",
				}}
			>
				<div className="space-y-2">
					{columns.map((column) => (
						<label
							key={column}
							className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-2"
						>
							<span
								className="truncate text-[11px] font-semibold text-gray-600"
								title={column}
							>
								{column}
							</span>
							<input
								value={values[column] ?? ""}
								onChange={(event) =>
									setValues((current) => ({
										...current,
										[column]: event.target.value,
									}))
								}
									disabled={
										isLoading ||
										readOnlyColumns.includes(column)
									}
									className={`${formInputClass} !h-[32px] !px-2 !py-1.5 text-xs disabled:bg-gray-100 disabled:text-gray-500`}
							/>
						</label>
					))}
				</div>
			</div>

			<div className="flex shrink-0 justify-center gap-1.5 rounded-b-xl border-t border-gray-100 bg-white px-3 py-2">
				<button
					type="button"
					onClick={onClose}
					disabled={isLoading}
					className="cursor-pointer rounded-md border border-gray-400 bg-white px-3 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={() => onConfirm?.(values)}
					disabled={isLoading}
					className="cursor-pointer rounded-md bg-[#7C3AED] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
				>
					{isLoading ? "Saving..." : "Save"}
				</button>
			</div>
		</div>,
		document.body
	);
};

export default EditSheetRowModal;
