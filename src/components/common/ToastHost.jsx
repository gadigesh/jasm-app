import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ToastHost = () => (
	<ToastContainer
		position="top-right"
		autoClose={3000}
		closeButton={false}
		hideProgressBar
		toastClassName="!bg-transparent !shadow-none"
		bodyClassName="p-0"
		style={{ zIndex: 99999 }}
	/>
);

export default ToastHost;
