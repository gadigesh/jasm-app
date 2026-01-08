import React from "react";
import { Outlet, useParams } from "react-router-dom";

const ASCreateLayout = () => {
	const templateId = useParams().templateId;
	console.log(templateId);
	return (
		<div>
			<Outlet />
		</div>
	);
};

export default ASCreateLayout;
