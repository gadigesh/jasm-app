const STORAGE_KEY = "jasm.activeAccountId";

export function readActiveAccountId() {
	try {
		return sessionStorage.getItem(STORAGE_KEY) || undefined;
	} catch {
		return undefined;
	}
}

export function writeActiveAccountId(id) {
	try {
		if (id) {
			sessionStorage.setItem(STORAGE_KEY, String(id));
			return;
		}
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		// Ignore private-mode storage failures.
	}
}
