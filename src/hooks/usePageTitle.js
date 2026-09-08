import { useEffect } from "react";

const BASE_TITLE = "JASM | Jivox Asset Source Manager";

export function usePageTitle(title) {
	useEffect(() => {
		document.title = title ? `${title} | JASM` : BASE_TITLE;
		return () => {
			document.title = BASE_TITLE;
		};
	}, [title]);
}
