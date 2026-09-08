const LOCAL_API = "http://localhost:3333";
const PROD_API = "https://jasm-app-sever.onrender.com";

function isLocalHostname(hostname) {
	return hostname === "localhost" || hostname === "127.0.0.1";
}

export function resolveApiBaseUrl() {
	if (import.meta.env.VITE_API_BASE_URL) {
		return import.meta.env.VITE_API_BASE_URL;
	}

	if (typeof window !== "undefined" && isLocalHostname(window.location.hostname)) {
		return LOCAL_API;
	}

	return import.meta.env.DEV ? LOCAL_API : PROD_API;
}

export const API_BASE_URL = resolveApiBaseUrl();
