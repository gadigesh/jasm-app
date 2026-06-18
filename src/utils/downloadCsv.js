const BASE_URL =
	process.env.NODE_ENV === "production"
		? "https://jasm-app-sever.onrender.com"
		: "http://localhost:3333";

export async function downloadFromApi(path, filename) {
	const res = await fetch(`${BASE_URL}${path}`, { credentials: "include" });
	if (!res.ok) {
		const contentType = res.headers.get("content-type") || "";
		if (contentType.includes("application/json")) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Download failed");
		}
		throw new Error(
			res.status === 401
				? "Please log in to download"
				: `Download failed (${res.status})`
		);
	}
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
	link.click();
	URL.revokeObjectURL(url);
}
