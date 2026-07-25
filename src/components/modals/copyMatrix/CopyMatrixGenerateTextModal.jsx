import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X } from "lucide-react";
import { formInputClass } from "../../../utils/formStyles";
import { AUTO_ROW_ID_COLUMN } from "../../../utils/constants";
import { normalizeCellText } from "../../../utils/normalizeCellText";

const SEQUENCE_TOKEN = "SN";

const CopyMatrixGenerateTextModal = ({
	isOpen,
	onClose,
	onConfirm,
	targetColumn,
	columns = [],
	sampleRow = null,
	anchorRect = null,
	selectedCount = 0,
	isLoading = false,
}) => {
	const panelRef = useRef(null);
	const templateInputRef = useRef(null);
	const dragOffset = useRef({ x: 0, y: 0 });
	const [template, setTemplate] = useState("");
	const [templateQuery, setTemplateQuery] = useState("");
	const [templateColumnStart, setTemplateColumnStart] = useState(-1);
	const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
	const [position, setPosition] = useState({ top: 72, left: 72 });
	const [dragging, setDragging] = useState(false);

	const availableColumns = useMemo(
		() =>
			columns.filter(
				(column) => column !== AUTO_ROW_ID_COLUMN
			),
		[columns]
	);
	const templateSuggestions = useMemo(() => {
		const query = templateQuery.toLocaleLowerCase();
		return [
			...(SEQUENCE_TOKEN.toLocaleLowerCase().includes(query)
				? [SEQUENCE_TOKEN]
				: []),
			...availableColumns.filter((column) =>
				column.toLocaleLowerCase().includes(query)
			),
		];
	}, [availableColumns, templateQuery]);
	const hasSelectedRows = selectedCount > 0;
	const canApply = !isLoading && template.trim().length > 0;
	const example = template.replace(
		/\[([^[\]]+)\]/g,
		(_match, column) =>
			column === SEQUENCE_TOKEN
				? "1"
				: normalizeCellText(sampleRow?.[column])
	);

	/* eslint-disable react-hooks/set-state-in-effect -- reset and position the reusable floating panel when it opens */
	useEffect(() => {
		if (!isOpen) return;
		setTemplate("");
		setTemplateQuery("");
		setTemplateColumnStart(-1);
		setTemplateMenuOpen(false);
	}, [isOpen, targetColumn]);

	useEffect(() => {
		if (!isOpen) return;
		const width = 380;
		const height = 280;
		let top = 72;
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

	const syncTemplateMenu = (value, caretPosition) => {
		const beforeCaret = value.slice(0, caretPosition);
		const openIndex = beforeCaret.lastIndexOf("[");
		const closeIndex = beforeCaret.lastIndexOf("]");
		if (openIndex > closeIndex) {
			const query = beforeCaret.slice(openIndex + 1);
			if (!query.includes("[")) {
				setTemplateQuery(query);
				setTemplateColumnStart(openIndex);
				setTemplateMenuOpen(true);
				return;
			}
		}
		setTemplateMenuOpen(false);
		setTemplateColumnStart(-1);
	};

	const handleTemplateChange = (event) => {
		const value = event.target.value;
		const caretPosition = event.target.selectionStart ?? value.length;
		setTemplate(value);
		syncTemplateMenu(value, caretPosition);
	};

	const selectTemplateColumn = (column) => {
		const input = templateInputRef.current;
		const caretPosition = input?.selectionStart ?? template.length;
		if (templateColumnStart < 0) return;
		const closingIndex = template.indexOf("]", caretPosition);
		const replaceEnd =
			closingIndex >= caretPosition ? closingIndex + 1 : caretPosition;
		const token = `[${column}]`;
		const value =
			template.slice(0, templateColumnStart) +
			token +
			template.slice(replaceEnd);
		const nextCaret = templateColumnStart + token.length;
		setTemplate(value);
		setTemplateMenuOpen(false);
		setTemplateColumnStart(-1);
		window.setTimeout(() => {
			input?.focus();
			input?.setSelectionRange(nextCaret, nextCaret);
		}, 0);
	};

	const apply = () => {
		if (!canApply) return;
		onConfirm?.({ template });
	};

	return createPortal(
		<div
			ref={panelRef}
			style={{ top: position.top, left: position.left }}
			className="pointer-events-auto fixed z-[10000] w-[380px] rounded-xl border border-gray-200 bg-white shadow-2xl"
		>
			<div
				onMouseDown={startDrag}
				className={`flex cursor-grab items-center gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50 px-3 py-2 active:cursor-grabbing ${
					dragging ? "cursor-grabbing" : ""
				}`}
			>
				<GripVertical size={14} className="shrink-0 text-gray-400" />
				<p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">
					Generate Text/Number/Reporting — {targetColumn}
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

				<label className="relative block">
					<span className="mb-0.5 block text-[11px] font-semibold text-gray-600">
						Format
					</span>
					<input
						ref={templateInputRef}
						value={template}
						onChange={handleTemplateChange}
						onClick={(event) =>
							syncTemplateMenu(
								event.currentTarget.value,
								event.currentTarget.selectionStart ??
									event.currentTarget.value.length
							)
						}
						onKeyUp={(event) => {
							if (event.key === "Escape") {
								setTemplateMenuOpen(false);
								return;
							}
							syncTemplateMenu(
								event.currentTarget.value,
								event.currentTarget.selectionStart ??
									event.currentTarget.value.length
							);
						}}
						onKeyDown={(event) => {
							if (
								event.key === "Enter" &&
								templateMenuOpen &&
								templateSuggestions.length
							) {
								event.preventDefault();
								selectTemplateColumn(templateSuggestions[0]);
							}
						}}
						onBlur={() =>
							window.setTimeout(
								() => setTemplateMenuOpen(false),
								120
							)
						}
						placeholder="Type [ to add a column or SN, e.g. SKU-[Brand]-[SN]"
						disabled={isLoading}
						autoComplete="off"
						className={`${formInputClass} !h-[34px] !px-2 !py-1.5 font-mono text-xs`}
					/>
					{templateMenuOpen && (
						<div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white p-1.5 shadow-lg">
							{templateSuggestions.length === 0 ? (
								<p className="px-2 py-2 text-center text-[11px] text-gray-500">
									No matching columns
								</p>
							) : (
								templateSuggestions.map((column) => (
									<button
										key={column}
										type="button"
										onMouseDown={(event) =>
											event.preventDefault()
										}
										onClick={() =>
											selectTemplateColumn(column)
										}
										className="block w-full truncate rounded px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED]"
									>
										{column}
									</button>
								))
							)}
						</div>
					)}
				</label>
				<p className="mt-1 text-[10px] text-gray-500">
					Type [ to select a column. Everything outside [Column] is
					used as text or a delimiter. Use [SN] for sequence numbers.
				</p>

				<div className="mt-2 rounded-md border border-purple-100 bg-purple-50 p-2">
					<p className="text-[10px] font-semibold uppercase tracking-wide text-purple-500">
						Format
					</p>
					<p className="mt-0.5 break-all font-mono text-xs text-purple-900">
						{template || "Enter a format above"}
					</p>
					{sampleRow && template && (
						<>
							<p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-purple-500">
								Example
							</p>
							<p className="mt-0.5 break-all font-mono text-xs text-purple-900">
								{example}
							</p>
						</>
					)}
				</div>

				<div className="mt-3 flex gap-1.5">
					<button
						type="button"
						disabled={!canApply}
						onClick={apply}
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

export default CopyMatrixGenerateTextModal;
