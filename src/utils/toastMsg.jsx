import { toast } from "react-toastify";
import AppToast from "../components/common/AppToast";

const showToast = (type, message) => {
	toast(<AppToast type={type} message={message} />, {
		autoClose: 3000,
	});
};

export const showSuccess = (msg) => showToast("success", msg);

export const showError = (msg) => showToast("error", msg);

export const showInfo = (msg) => showToast("info", msg);

export const showWarning = (msg) => showToast("warning", msg);
