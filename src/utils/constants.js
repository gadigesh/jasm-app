//export const BASE_URL = "https://jasm-app-sever.onrender.com";

export const timeAgo = (date) => {
	const diff = Date.now() - new Date(date).getTime();
	const sec = Math.floor(diff / 1000);
	const min = Math.floor(sec / 60);
	const hr = Math.floor(min / 60);
	const day = Math.floor(hr / 24);

	if (sec < 60) return "just now";
	if (min < 60) return `${min} min ago`;
	if (hr < 24) return `${hr} hr ago`;
	return `${day} day${day > 1 ? "s" : ""} ago`;
};
