/**
 * Common timezone IANA-style keys → fixed UTC offsets for CM date fill.
 * Offsets are applied as written (no DST adjustment).
 */
export const TIMEZONE_OFFSETS = {
	"America/NY": "-05:00", // Eastern Time (EST)
	"America/Chicago": "-06:00", // Central Time (CST)
	"America/Denver": "-07:00", // Mountain Time (MST)
	"America/Los_Angeles": "-08:00", // Pacific Time (PST)
	"Europe/London": "+00:00", // Greenwich Mean Time
	"Europe/Paris": "+01:00", // Central European Time
	"Asia/Tokyo": "+09:00", // Japan Standard Time
	"Asia/Shanghai": "+08:00", // China Standard Time
	"Asia/Kolkata": "+05:30", // India Standard Time
	"Australia/Sydney": "+10:00", // Australian Eastern Time
	"Australia/Adelaide": "+09:30", // Australian Central Time
	"Pacific/Auckland": "+12:00", // New Zealand Time
	"Asia/Bangkok": "+07:00", // Indochina Time
	"Asia/Dubai": "+04:00", // Gulf Standard Time
	"Europe/Moscow": "+03:00", // Moscow Time
	"America/Sao_Paulo": "-03:00", // Brasilia Time
	"America/Anchorage": "-09:00", // Alaska Time
	"Pacific/Honolulu": "-10:00", // Hawaii Time
};

export const TIMEZONE_OPTIONS = Object.entries(TIMEZONE_OFFSETS).map(
	([id, offset]) => ({
		id,
		offset,
		label: `${id.replace(/_/g, " ")} (${offset})`,
	})
);

function pad2(n) {
	return String(n).padStart(2, "0");
}

/** Browser offset as ±HH:mm */
export function getBrowserTimezoneOffset() {
	const offsetMin = -new Date().getTimezoneOffset();
	const sign = offsetMin >= 0 ? "+" : "-";
	const abs = Math.abs(offsetMin);
	return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/** Pick a timezone id whose offset matches the browser, else Asia/Kolkata. */
export function getDefaultTimezoneId() {
	const browser = getBrowserTimezoneOffset();
	const match = TIMEZONE_OPTIONS.find((tz) => tz.offset === browser);
	return match?.id || "Asia/Kolkata";
}

/**
 * Format a Date as MM-DD-YYYYTHH:mm:ss±HH:mm
 * Example: 11-30-2025T02:29:59-08:00
 * @param {Date|string|number} date
 * @param {string} [offset] optional ±HH:mm; defaults to browser offset
 */
export function formatDateWithTimezone(date = new Date(), offset = null) {
	const d = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(d.getTime())) return "";

	const tz =
		offset && /^[+-]\d{2}:\d{2}$/.test(offset)
			? offset
			: getBrowserTimezoneOffset();

	return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-${d.getFullYear()}T${pad2(
		d.getHours()
	)}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}${tz}`;
}

/**
 * Build CM date string from discrete date/time parts + offset.
 * Output: MM-DD-YYYYTHH:mm:ss±HH:mm
 */
export function formatDatePartsWithOffset({
	year,
	month,
	day,
	hour = "00",
	minute = "00",
	second = "00",
	offset,
}) {
	if (!year || !month || !day || !offset) return "";
	return `${pad2(month)}-${pad2(day)}-${year}T${pad2(hour)}:${pad2(
		minute
	)}:${pad2(second)}${offset}`;
}

/**
 * Build CM date string from a datetime-local value + chosen offset.
 * Uses the wall-clock fields as typed (does not convert between zones).
 */
export function formatLocalDateTimeWithOffset(localValue, offset) {
	if (!localValue || !offset) return "";
	const [datePart, timePart = "00:00"] = String(localValue).split("T");
	const [y, m, d] = datePart.split("-");
	const [hh = "00", mm = "00", ss = "00"] = timePart.split(":");
	if (!y || !m || !d) return "";
	return formatDatePartsWithOffset({
		year: y,
		month: m,
		day: d,
		hour: hh,
		minute: mm,
		second: ss.slice(0, 2),
		offset,
	});
}

export function suggestCloneColumnName(sourceColumn, columns = []) {
	const base = `${sourceColumn} (Copy)`;
	if (!columns.includes(base)) return base;
	let i = 2;
	while (columns.includes(`${sourceColumn} (Copy ${i})`)) {
		i += 1;
	}
	return `${sourceColumn} (Copy ${i})`;
}
