import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	ArrowDownAZ,
	ArrowUpAZ,
	Check,
	GripVertical,
	Search,
	X,
} from "lucide-react";

const getInitialPosition = (anchorRect) => {
	const width = 340;
	const height = 480;
	if (typeof window === "undefined") {
		return { top: 96, left: 96 };
	}

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
	return { top, left };
};

const formatValue = (value) => {
	const text = String(value ?? "");
	return text === "" ? "(Blanks)" : text;
};

const ColumnValueFilterPanel = ({
	isOpen = true,
	columnName,
	anchorRect = null,
	values = [],
	activeValues,
	isLoading = false,
	sortDirection = "",
	onSort,
	onApply,
	onCancel,
	onClose,
}) => {
	const [search, setSearch] = useState("");
	const [draftValues, setDraftValues] = useState(() =>
		Array.isArray(activeValues) ? [...activeValues] : null
	);
	const panelRef = useRef(null);
	const dragOffset = useRef({ x: 0, y: 0 });
	const [position, setPosition] = useState(() =>
		getInitialPosition(anchorRect)
	);
	const [dragging, setDragging] = useState(false);

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

	const availableValues = useMemo(() => {
		const merged = new Set(
			(Array.isArray(values) ? values : []).map((value) =>
				String(value ?? "")
			)
		);
		(Array.isArray(activeValues) ? activeValues : []).forEach((value) =>
			merged.add(String(value ?? ""))
		);
		return Array.from(merged).sort((a, b) =>
			a.localeCompare(b, undefined, {
				numeric: true,
				sensitivity: "base",
			})
		);
	}, [activeValues, values]);

	const visibleValues = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return availableValues;
		return availableValues.filter((value) =>
			formatValue(value).toLowerCase().includes(query)
		);
	}, [availableValues, search]);

	const isSelected = (value) =>
		draftValues === null || draftValues.includes(value);

	const toggleValue = (value) => {
		const selected = draftValues === null
			? [...availableValues]
			: [...draftValues];
		const index = selected.indexOf(value);
		if (index >= 0) selected.splice(index, 1);
		else selected.push(value);
		setDraftValues(selected);
	};

	const selectedCount =
		draftValues === null ? availableValues.length : draftValues.length;

	if (!isOpen) return null;

	return createPortal(
		<div
			ref={panelRef}
			style={{ top: position.top, left: position.left }}
			className="pointer-events-auto fixed z-[10000] w-[340px] rounded-xl border border-gray-200 bg-white shadow-2xl"
		>
			<div
				onMouseDown={startDrag}
				className={`flex cursor-grab items-center gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50 px-3 py-2 active:cursor-grabbing ${
					dragging ? "cursor-grabbing" : ""
				}`}
			>
				<GripVertical size={14} className="shrink-0 text-gray-400" />
				<div className="min-w-0 flex-1">
					<p className="truncate text-xs font-semibold text-gray-800">
						Filter — {columnName}
					</p>
					<p className="text-[10px] text-gray-400">Filter by values</p>
				</div>
				<button
					type="button"
					onClick={onClose || onCancel}
					className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
					aria-label="Close filter"
				>
					<X size={14} />
				</button>
			</div>

			<div className="border-b border-gray-100 px-3 py-2">
				<p className="mb-1.5 text-[11px] font-semibold text-gray-600">
					Sort
				</p>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => onSort?.("asc")}
						className={`inline-flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium ${
							sortDirection === "asc"
								? "border-violet-300 bg-violet-50 text-violet-700"
								: "border-gray-300 text-gray-600 hover:bg-gray-50"
						}`}
					>
						<ArrowDownAZ size={13} />
						A to Z
					</button>
					<button
						type="button"
						onClick={() => onSort?.("desc")}
						className={`inline-flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[11px] font-medium ${
							sortDirection === "desc"
								? "border-violet-300 bg-violet-50 text-violet-700"
								: "border-gray-300 text-gray-600 hover:bg-gray-50"
						}`}
					>
						<ArrowUpAZ size={13} />
						Z to A
					</button>
				</div>
			</div>

			<div className="relative px-3 py-2">
				<Search
					size={15}
					className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
				/>
				<input
					type="search"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search values"
					className="w-full rounded border border-gray-300 py-1.5 pl-8 pr-2 text-xs text-gray-700 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
				/>
			</div>

			<div className="flex items-center justify-between px-3 pb-2 text-xs">
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => setDraftValues(null)}
						className="text-blue-700 hover:underline"
					>
						Select all
					</button>
					<span className="text-gray-300">·</span>
					<button
						type="button"
						onClick={() => setDraftValues([])}
						className="text-blue-700 hover:underline"
					>
						Clear
					</button>
				</div>
				<span className="text-gray-500">
					{selectedCount} of {availableValues.length}
				</span>
			</div>

			<div className="mx-3 max-h-56 overflow-y-auto rounded border border-gray-100">
				{isLoading ? (
					<p className="px-3 py-6 text-center text-xs text-gray-400">
						Loading values...
					</p>
				) : visibleValues.length === 0 ? (
					<p className="px-3 py-6 text-center text-xs text-gray-400">
						No values found
					</p>
				) : (
					visibleValues.map((value) => {
						const selected = isSelected(value);
						return (
							<button
								key={`${columnName}-${value}`}
								type="button"
								onClick={() => toggleValue(value)}
								className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-violet-50"
							>
								<span
									className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
										selected
											? "border-violet-600 bg-violet-600 text-white"
											: "border-gray-300 bg-white"
									}`}
								>
									{selected && <Check size={11} strokeWidth={3} />}
								</span>
								<span className="min-w-0 truncate">
									{formatValue(value)}
								</span>
							</button>
						);
					})
				)}
			</div>

			<div className="flex justify-end gap-2 px-3 py-3">
				<button
					type="button"
					onClick={onCancel}
					className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={() => onApply(draftValues)}
					className="rounded bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
				>
					OK
				</button>
			</div>
		</div>,
		document.body
	);
};

export default ColumnValueFilterPanel;
