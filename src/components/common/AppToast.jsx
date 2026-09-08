const styles = {
	success: "border-emerald-200 bg-emerald-50 text-emerald-800",
	error: "border-red-200 bg-red-50 text-red-800",
	info: "border-blue-200 bg-blue-50 text-blue-800",
	warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const AppToast = ({ type = "info", title, message }) => {
	return (
		<div
			className={`rounded-lg border px-4 py-3 shadow-lg ${
				styles[type] || styles.info
			}`}
		>
			<div>
				{title && <h3 className="font-bold">{title}</h3>}
				<span className="text-sm">{message}</span>
			</div>
		</div>
	);
};

export default AppToast;
