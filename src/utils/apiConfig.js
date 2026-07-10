export const API_BASE_URL =
	process.env.NODE_ENV === "production"
		? "https://jasm-app-sever.onrender.com"
		: "http://localhost:3333";
