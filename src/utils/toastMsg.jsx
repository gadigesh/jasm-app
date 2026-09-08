import { createElement } from "react";

let toastApi;

async function getToastApi() {
	if (!toastApi) {
		toastApi = (async () => {
			const [{ toast }, { default: AppToast }, { default: ToastHost }] =
				await Promise.all([
					import("react-toastify"),
					import("../components/common/AppToast"),
					import("../components/common/ToastHost"),
				]);
			const { createRoot } = await import("react-dom/client");
			const node = document.createElement("div");
			document.body.appendChild(node);
			createRoot(node).render(createElement(ToastHost));
			await new Promise((resolve) => {
				requestAnimationFrame(() => resolve());
			});
			return { toast, AppToast };
		})();
	}
	return toastApi;
}

const showToast = (type, message) => {
	getToastApi().then(({ toast, AppToast }) => {
		toast(createElement(AppToast, { type, message }), {
			autoClose: 3000,
		});
	});
};

export const showSuccess = (msg) => showToast("success", msg);

export const showError = (msg) => showToast("error", msg);

export const showInfo = (msg) => showToast("info", msg);

export const showWarning = (msg) => showToast("warning", msg);
