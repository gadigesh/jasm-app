import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X } from "lucide-react";
import {
	formInputClass,
	formSelectClass,
} from "../../../utils/formStyles";
import { AUTO_ROW_ID_COLUMN } from "../../../utils/constants";
import { normalizeCellText } from "../../../utils/normalizeCellText";

const WORD_TOKENS = [
	"First word",
	"Second word",
	"Third word",
	"Fourth word",
	"Fifth word",
];

const SPLIT_OPTIONS = [
	{ value: "", label: "Empty" },
];

const CopyMatrixFromColumnModal = ({
	isOpen,
	onClose,
	onConfirm,
	targetColumn,
	columns = [],
	sampleRow = null,
	sampleRows = [],
	anchorRect = null,
	selectedCount = 0,
	isLoading = false,
}) => {
	const panelRef = useRef(null);
	const templateInputRef = useRef(null);
	const dragOffset = useRef({ x: 0, y: 0 });
	const [sourceColumn, setSourceColumn] = useState("");
	const [splitBy, setSplitBy] = useState("");
	const [template, setTemplate] = useState("");
	const [tokenQuery, setTokenQuery] = useState("");
	const [tokenStart, setTokenStart] = useState(-1);
	const [tokenMenuOpen, setTokenMenuOpen] = useState(false);
	const [position, setPosition] = useState({ top: 96, left: 96 });
	const [dragging, setDragging] = useState(false);

	const hasSelectedRows = selectedCount > 0;
	const options = useMemo(
		() =>
			columns.filter(
				(column) =>
					column !== AUTO_ROW_ID_COLUMN && column !== targetColumn
			),
		[columns, targetColumn]
	);
	const tokenSuggestions = useMemo(() => {
		const query = tokenQuery.toLocaleLowerCase();
		return WORD_TOKENS.filter((token) =>
			token.toLocaleLowerCase().includes(query)
		);
	}, [tokenQuery]);
	const sourceValue = normalizeCellText(sampleRow?.[sourceColumn]);
	const sourceValues = (sampleRows.length ? sampleRows : [sampleRow])
		.filter(Boolean)
		.map((row) => normalizeCellText(row?.[sourceColumn]));
	const detectedSeparators = [];
	const seenSeparators = new Set();
	for (const value of sourceValues) {
		if (/\s/u.test(value) && !seenSeparators.has(" ")) {
			seenSeparators.add(" ");
			detectedSeparators.push({
				value: " ",
				label: "Space",
			});
		}
		for (const match of value.matchAll(/[^\p{L}\p{N}\s]+/gu)) {
			const separator = match[0];
			if (!seenSeparators.has(separator)) {
				seenSeparators.add(separator);
				detectedSeparators.push({
					value: separator,
					label: separator,
				});
			}
		}
	}
	const availableSplitOptions = [
		...SPLIT_OPTIONS,
		...detectedSeparators,
	];
	const words = (
		splitBy === " " ? sourceValue.split(/\s+/) : sourceValue.split(splitBy)
	)
		.map((word) => word.trim())
		.filter(Boolean);
	const example = template
		? template.replace(
				/\[([^\[\]]+)\]/g,
				(_match, token) =>
					words[WORD_TOKENS.indexOf(token)] ?? ""
		  )
		: sourceValue;

	/* eslint-disable react-hooks/set-state-in-effect -- reset and position the reusable floating panel when it opens */
	useEffect(() => {
		if (!isOpen) return;
		setSourceColumn(options[0] || "");
		setSplitBy("");
		setTemplate("");
		setTokenQuery("");
		setTokenStart(-1);
		setTokenMenuOpen(false);
	}, [isOpen, targetColumn, options]);

	useEffect(() => {
		if (!isOpen) return;
		const width = 340;
		const height = 380;
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

	if (!isOpen) return null;

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

	const syncTokenMenu = (value, caretPosition) => {
		const beforeCaret = value.slice(0, caretPosition);
		const openIndex = beforeCaret.lastIndexOf("[");
		const closeIndex = beforeCaret.lastIndexOf("]");
		if (openIndex > closeIndex) {
			const query = beforeCaret.slice(openIndex + 1);
			if (!query.includes("[")) {
				setTokenQuery(query);
				setTokenStart(openIndex);
				setTokenMenuOpen(true);
				return;
			}
		}
		setTokenMenuOpen(false);
		setTokenStart(-1);
	};

	const handleTemplateChange = (event) => {
		const value = event.target.value;
		const caretPosition = event.target.selectionStart ?? value.length;
		setTemplate(value);
		syncTokenMenu(value, caretPosition);
	};

	const selectToken = (token) => {
		const input = templateInputRef.current;
		const caretPosition = input?.selectionStart ?? template.length;
		if (tokenStart < 0) return;
		const closingIndex = template.indexOf("]", caretPosition);
		const replaceEnd =
			closingIndex >= caretPosition ? closingIndex + 1 : caretPosition;
		const valueToken = `[${token}]`;
		const value =
			template.slice(0, tokenStart) +
			valueToken +
			template.slice(replaceEnd);
		const nextCaret = tokenStart + valueToken.length;
		setTemplate(value);
		setTokenMenuOpen(false);
		setTokenStart(-1);
		window.setTimeout(() => {
			input?.focus();
			input?.setSelectionRange(nextCaret, nextCaret);
		}, 0);
	};

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
				<p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
					Extract from column — {targetColumn}
				</p>
				<button
					type="button"
					onClick={onClose}
					disabled={isLoading}
					className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
					aria-label="Close"
				>
					<X size={14} />
				</button>
			</div>

			<div className="max-h-[calc(100vh-100px)] overflow-y-auto px-3 py-2.5">
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
						  } selected — Apply updates these only.`
						: "Apply updates the whole column. Select rows first to limit the update."}
				</p>

				<label className="mb-0.5 block text-[11px] font-semibold text-gray-600">
					Source column
				</label>
				<select
					value={sourceColumn}
					onChange={(event) => {
						setSourceColumn(event.target.value);
						setSplitBy("");
						setTemplate("");
						setTokenMenuOpen(false);
					}}
					className={`${formSelectClass} !h-[34px] !px-2 !py-1.5 text-xs`}
					disabled={isLoading || options.length === 0}
				>
					{options.length === 0 ? (
						<option value="">No columns available</option>
					) : (
						options.map((column) => (
							<option key={column} value={column}>
								{column}
							</option>
						))
					)}
				</select>

				<div className="mt-2 grid grid-cols-[76px_minmax(0,1fr)] items-start gap-2">
					<label className="block">
						<span className="mb-0.5 block text-[11px] font-semibold text-gray-600">
							Split by
						</span>
						<select
							value={splitBy}
							onChange={(event) => {
								const value = event.target.value;
								setSplitBy(value);
								if (value === "") {
									setTemplate("");
									setTokenMenuOpen(false);
								}
							}}
							className={`${formSelectClass} !h-[34px] !px-2 !py-1.5 text-xs`}
							disabled={isLoading}
						>
							{availableSplitOptions.map((option) => (
								<option
									key={option.label}
									value={option.value}
								>
									{option.label}
								</option>
							))}
						</select>
					</label>

					<label className="relative block">
						<span className="mb-0.5 block text-[11px] font-semibold text-gray-600">
							Extract format (optional)
						</span>
						<input
						ref={templateInputRef}
						value={template}
						onChange={handleTemplateChange}
						onClick={(event) =>
							syncTokenMenu(
								event.currentTarget.value,
								event.currentTarget.selectionStart ??
									event.currentTarget.value.length
							)
						}
						onKeyUp={(event) => {
							if (event.key === "Escape") {
								setTokenMenuOpen(false);
								return;
							}
							syncTokenMenu(
								event.currentTarget.value,
								event.currentTarget.selectionStart ??
									event.currentTarget.value.length
							);
						}}
						onKeyDown={(event) => {
							if (
								event.key === "Enter" &&
								tokenMenuOpen &&
								tokenSuggestions.length
							) {
								event.preventDefault();
								selectToken(tokenSuggestions[0]);
							}
						}}
						onBlur={() =>
							window.setTimeout(
								() => setTokenMenuOpen(false),
								120
							)
						}
						placeholder="Type [ to add First word, Second word…"
						disabled={isLoading || splitBy === ""}
						autoComplete="off"
							className={`${formInputClass} !h-[34px] !px-2 !py-1.5 font-mono text-xs`}
						/>
						{tokenMenuOpen && (
							<div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white p-1.5 shadow-lg">
								{tokenSuggestions.length === 0 ? (
									<p className="px-2 py-2 text-center text-[11px] text-gray-500">
										No matching words
									</p>
								) : (
									tokenSuggestions.map((token) => (
										<button
											key={token}
											type="button"
											onMouseDown={(event) =>
												event.preventDefault()
											}
											onClick={() =>
												selectToken(token)
											}
											className="block w-full rounded px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED]"
										>
											{token}
										</button>
									))
								)}
							</div>
						)}
					</label>
				</div>
				<p className="mt-1 text-[10px] text-gray-500">
					{splitBy === ""
						? "Empty copies the complete source column value."
						: "Leave the format empty to copy the complete source value. Text outside [word tokens] is kept as entered."}
				</p>

				{sampleRow && sourceColumn && (
					<div className="mt-2 rounded-md border border-purple-100 bg-purple-50 p-2">
						<p className="text-[10px] font-semibold uppercase tracking-wide text-purple-500">
							Example
						</p>
						<p className="mt-0.5 break-all font-mono text-xs text-purple-900">
							{example}
						</p>
					</div>
				)}

				<div className="mt-3 flex gap-1.5">
					<button
						type="button"
						disabled={!sourceColumn || isLoading}
						onClick={() =>
							onConfirm?.({ sourceColumn, template, splitBy })
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
