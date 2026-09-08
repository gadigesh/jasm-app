import React from "react";

const BrandLogo = ({
	className = "h-8 w-[104px]",
	priority = false,
	width = 77,
	height = 25,
}) => (
	<img
		src="/jivox-logo.png"
		alt="Jivox"
		width={width}
		height={height}
		decoding={priority ? "sync" : "async"}
		fetchPriority={priority ? "high" : "low"}
		loading={priority ? "eager" : "lazy"}
		className={`${className} object-contain`}
	/>
);

export default BrandLogo;
