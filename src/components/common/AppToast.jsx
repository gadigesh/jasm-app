const styles = {
	success: "alert-success",
	error: "alert-error",
	info: "alert-info",
	warning: "alert-warning",
};

const AppToast = ({ type = "info", title, message }) => {
	return (
		<div className={`alert ${styles[type]} shadow-lg`}>
			<div>
				{title && <h3 className="font-bold">{title}</h3>}
				<span className="text-sm">{message}</span>
			</div>
		</div>
	);
};

export default AppToast;
