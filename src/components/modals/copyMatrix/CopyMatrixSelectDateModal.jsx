import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, GripVertical, X } from "lucide-react";
import { formInputClass, formSelectClass } from "../../../utils/formStyles";
import {
	TIMEZONE_OPTIONS,
	TIMEZONE_OFFSETS,
	formatDatePartsWithOffset,
	getDefaultTimezoneId,
} from "../../../utils/copyMatrixColumnHelpers";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const HOUR_12_OPTIONS = Array.from({ length: 12 }, (_, i) =>
	String(i + 1).padStart(2, "0")
);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) =>
	String(i).padStart(2, "0")
);

function pad2(n) {
	return String(n).padStart(2, "0");
}

function to12HourParts(hour24) {
	const h = Number(hour24) || 0;
	const period = h >= 12 ? "PM" : "AM";
	const hour12 = pad2(h % 12 === 0 ? 12 : h % 12);
	return { hour12, period };
}

function to24Hour(hour12, period) {
	let h = Number(hour12) % 12;
	if (period === "PM") h += 12;
	return pad2(h);
}

function toDisplayDate(y, m, d) {
	return `${pad2(m)}-${pad2(d)}-${y}`;
}

function parseDisplayDate(value) {
	const match = String(value || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
	if (!match) return null;
	const month = Number(match[1]);
	const day = Number(match[2]);
	const year = Number(match[3]);
	const dt = new Date(year, month - 1, day);
	if (
		dt.getFullYear() !== year ||
		dt.getMonth() !== month - 1 ||
		dt.getDate() !== day
	) {
		return null;
	}
	return { year, month, day };
}

function buildCalendarDays(year, month) {
	const first = new Date(year, month - 1, 1);
	const startPad = first.getDay();
	const daysInMonth = new Date(year, month, 0).getDate();
	const cells = [];
	for (let i = 0; i < startPad; i += 1) cells.push(null);
	for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
	while (cells.length % 7 !== 0) cells.push(null);
	return cells;
}

/** Short trigger + scrollable options list (max ~5 rows). */
function CompactScrollSelect({
	value,
	options,
	onChange,
	disabled = false,
	ariaLabel,
	openKey,
	activeKey,
	setActiveKey,
}) {
	const open = activeKey === openKey;
	const ref = useRef(null);
	const listRef = useRef(null);

	useEffect(() => {
		if (!open) return;
		const onDown = (e) => {
			if (!ref.current?.contains(e.target)) setActiveKey(null);
		};
		window.addEventListener("mousedown", onDown);
		return () => window.removeEventListener("mousedown", onDown);
	}, [open, setActiveKey]);

	useEffect(() => {
		if (!open || !listRef.current) return;
		const el = listRef.current.querySelector("[data-selected='true']");
		el?.scrollIntoView({ block: "nearest" });
	}, [open, value]);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				disabled={disabled}
				aria-label={ariaLabel}
				aria-expanded={open}
				onClick={() => setActiveKey(open ? null : openKey)}
				className="flex h-7 min-w-[2.75rem] items-center justify-center rounded border border-gray-300 bg-white px-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
			>
				{value}
			</button>
			{open && (
				<ul
					ref={listRef}
					className="absolute left-0 top-full z-30 mt-0.5 max-h-[7.5rem] min-w-full overflow-y-auto rounded border border-gray-200 bg-white py-0.5 shadow-md [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
				>
					{options.map((opt) => (
						<li key={opt}>
							<button
								type="button"
								data-selected={opt === value ? "true" : "false"}
								onClick={() => {
									onChange(opt);
									setActiveKey(null);
								}}
								className={`flex h-6 w-full items-center justify-center px-2 text-xs ${
									opt === value
										? "bg-[#7C3AED] font-semibold text-white"
										: "text-gray-700 hover:bg-purple-50"
								}`}
							>
								{opt}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

/**
 * Floating Select Date panel: calendar + time + timezone (like reference UI).
 */
const CopyMatrixSelectDateModal = ({
	isOpen,
	onClose,
	onConfirm,
	columnName,
	anchorRect = null,
	selectedCount = 0,
	isLoading = false,
}) => {
	const panelRef = useRef(null);
	const calendarRef = useRef(null);
	const dragOffset = useRef({ x: 0, y: 0 });

	const now = new Date();
	const initial12 = to12HourParts(now.getHours());
	const [dateText, setDateText] = useState(
		toDisplayDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
	);
	const [hour12, setHour12] = useState(initial12.hour12);
	const [minute, setMinute] = useState(pad2(now.getMinutes()));
	const [period, setPeriod] = useState(initial12.period);
	const [timezoneId, setTimezoneId] = useState(getDefaultTimezoneId);
	const [viewYear, setViewYear] = useState(now.getFullYear());
	const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
	const [showCalendar, setShowCalendar] = useState(false);
	const [timeMenu, setTimeMenu] = useState(null);
	const [position, setPosition] = useState({ top: 96, left: 96 });
	const [dragging, setDragging] = useState(false);

	const hasSelectedRows = selectedCount > 0;
	const offset = TIMEZONE_OFFSETS[timezoneId] || "+00:00";
	const hour24 = to24Hour(hour12, period);
	const parsedDate = useMemo(() => parseDisplayDate(dateText), [dateText]);

	useEffect(() => {
		if (!isOpen) return;
		const n = new Date();
		const parts = to12HourParts(n.getHours());
		setDateText(
			toDisplayDate(n.getFullYear(), n.getMonth() + 1, n.getDate())
		);
		setHour12(parts.hour12);
		setMinute(pad2(n.getMinutes()));
		setPeriod(parts.period);
		setTimezoneId(getDefaultTimezoneId());
		setViewYear(n.getFullYear());
		setViewMonth(n.getMonth() + 1);
		setShowCalendar(false);
		setTimeMenu(null);
	}, [isOpen, columnName]);

	useEffect(() => {
		if (!isOpen) return;

		const width = 340;
		const height = 420;
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
	}, [isOpen, columnName, anchorRect]);

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

	useEffect(() => {
		if (!showCalendar) return;
		const onDown = (e) => {
			if (
				calendarRef.current?.contains(e.target) ||
				panelRef.current
					?.querySelector("[data-date-input]")
					?.contains(e.target)
			) {
				return;
			}
			setShowCalendar(false);
		};
		window.addEventListener("mousedown", onDown);
		return () => window.removeEventListener("mousedown", onDown);
	}, [showCalendar]);

	const preview = useMemo(() => {
		if (!parsedDate) return "";
		return formatDatePartsWithOffset({
			year: parsedDate.year,
			month: parsedDate.month,
			day: parsedDate.day,
			hour: hour24,
			minute,
			second: "00",
			offset,
		});
	}, [parsedDate, hour24, minute, offset]);

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

	const selectDay = (day) => {
		if (!day) return;
		setDateText(toDisplayDate(viewYear, viewMonth, day));
		setShowCalendar(false);
	};

	const shiftMonth = (delta) => {
		let m = viewMonth + delta;
		let y = viewYear;
		if (m < 1) {
			m = 12;
			y -= 1;
		} else if (m > 12) {
			m = 1;
			y += 1;
		}
		setViewMonth(m);
		setViewYear(y);
	};

	const apply = () => {
		if (!preview) return;
		onConfirm?.({
			dateValue: preview,
			scope: hasSelectedRows ? "selected" : "all",
		});
	};

	const calendarDays = buildCalendarDays(viewYear, viewMonth);

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
					Select Date — {columnName}
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

			<div className="relative px-3 py-2.5">
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
						  } selected — Select fills these only.`
						: "Select rows anytime, then Select — or Apply for the whole column."}
				</p>

				{/* Date */}
				<label className="mb-0.5 block text-[11px] font-semibold text-gray-600">
					Date
				</label>
				<div className="relative mb-2" data-date-input>
					<input
						type="text"
						value={dateText}
						onChange={(e) => setDateText(e.target.value)}
						onFocus={() => {
							const p = parseDisplayDate(dateText);
							if (p) {
								setViewYear(p.year);
								setViewMonth(p.month);
							}
							setTimeMenu(null);
							setShowCalendar(true);
						}}
						onClick={() => {
							setTimeMenu(null);
							setShowCalendar(true);
						}}
						placeholder="MM-DD-YYYY"
						className={`${formInputClass} !h-7 !px-2 !py-0 pr-7 text-xs ${
							parsedDate
								? "border-blue-400 ring-1 ring-blue-200"
								: dateText
								? "border-red-300"
								: ""
						}`}
						disabled={isLoading}
					/>
					{dateText && (
						<button
							type="button"
							tabIndex={-1}
							onClick={() => {
								setDateText("");
								setShowCalendar(true);
							}}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							<X size={12} />
						</button>
					)}
				</div>

				{showCalendar && (
					<div
						ref={calendarRef}
						className="absolute left-3 right-3 z-20 rounded-lg border border-gray-200 bg-white p-2.5 shadow-lg"
					>
						<div className="mb-2 flex items-center justify-between">
							<button
								type="button"
								onClick={() => shiftMonth(-1)}
								className="rounded p-1 text-gray-500 hover:bg-gray-100"
							>
								<ChevronLeft size={16} />
							</button>
							<p className="text-sm font-semibold text-gray-800">
								{MONTH_NAMES[viewMonth - 1]} {viewYear}
							</p>
							<button
								type="button"
								onClick={() => shiftMonth(1)}
								className="rounded p-1 text-gray-500 hover:bg-gray-100"
							>
								<ChevronRight size={16} />
							</button>
						</div>
						<div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-400">
							{WEEKDAYS.map((d) => (
								<span key={d}>{d}</span>
							))}
						</div>
						<div className="grid grid-cols-7 gap-0.5 text-center">
							{calendarDays.map((day, idx) => {
								const isSelected =
									day &&
									parsedDate &&
									parsedDate.year === viewYear &&
									parsedDate.month === viewMonth &&
									parsedDate.day === day;
								return (
									<button
										key={idx}
										type="button"
										disabled={!day}
										onClick={() => selectDay(day)}
										className={`h-6 rounded text-[11px] ${
											!day
												? "cursor-default"
												: isSelected
												? "bg-blue-500 font-semibold text-white"
												: "text-gray-700 hover:bg-blue-50"
										}`}
									>
										{day || ""}
									</button>
								);
							})}
						</div>
					</div>
				)}

				{/* Time — compact HH:MM scroll menus + AM/PM toggle */}
				<label className="mb-0.5 block text-[11px] font-semibold text-gray-600">
					Time
				</label>
				<div className="mb-2 flex items-center gap-1">
					<CompactScrollSelect
						value={hour12}
						options={HOUR_12_OPTIONS}
						onChange={setHour12}
						disabled={isLoading}
						ariaLabel="Hour"
						openKey="hour"
						activeKey={timeMenu}
						setActiveKey={(key) => {
							setShowCalendar(false);
							setTimeMenu(key);
						}}
					/>
					<span className="text-xs font-semibold text-gray-500">:</span>
					<CompactScrollSelect
						value={minute}
						options={MINUTE_OPTIONS}
						onChange={setMinute}
						disabled={isLoading}
						ariaLabel="Minute"
						openKey="minute"
						activeKey={timeMenu}
						setActiveKey={(key) => {
							setShowCalendar(false);
							setTimeMenu(key);
						}}
					/>
					<div className="ml-1.5 flex h-7 items-center rounded border border-gray-300 bg-white p-0.5">
						<button
							type="button"
							disabled={isLoading}
							onClick={() => setPeriod("AM")}
							className={`flex h-full min-w-[2rem] items-center justify-center rounded px-2 text-[10px] font-semibold leading-none transition-colors disabled:opacity-50 ${
								period === "AM"
									? "bg-[#7C3AED] text-white"
									: "text-gray-500 hover:text-gray-700"
							}`}
						>
							AM
						</button>
						<button
							type="button"
							disabled={isLoading}
							onClick={() => setPeriod("PM")}
							className={`flex h-full min-w-[2rem] items-center justify-center rounded px-2 text-[10px] font-semibold leading-none transition-colors disabled:opacity-50 ${
								period === "PM"
									? "bg-[#7C3AED] text-white"
									: "text-gray-500 hover:text-gray-700"
							}`}
						>
							PM
						</button>
					</div>
				</div>

				{/* Timezone */}
				<label className="mb-0.5 block text-[11px] font-semibold text-gray-600">
					Timezone
				</label>
				<select
					value={timezoneId}
					onChange={(e) => setTimezoneId(e.target.value)}
					className={`${formSelectClass} mb-2 !h-7 !px-2 !py-0 text-xs`}
					disabled={isLoading}
				>
					{TIMEZONE_OPTIONS.map((tz) => (
						<option key={tz.id} value={tz.id}>
							{tz.label}
						</option>
					))}
				</select>

				<div className="mb-2 rounded border border-gray-100 bg-gray-50 px-2 py-1">
					<p className="break-all font-mono text-[10px] text-gray-700">
						{preview || "—"}
					</p>
					{dateText && !parsedDate && (
						<p className="text-[10px] text-red-500">Use MM-DD-YYYY</p>
					)}
				</div>

				<div className="flex flex-wrap gap-1.5">
					<button
						type="button"
						disabled={!preview || isLoading}
						title={
							hasSelectedRows
								? `Apply to ${selectedCount} selected row(s)`
								: "Apply to every row in the column"
						}
						onClick={apply}
						className="rounded-md bg-[#7C3AED] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
					>
						{isLoading
							? "…"
							: hasSelectedRows
							? "Select"
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

export default CopyMatrixSelectDateModal;
