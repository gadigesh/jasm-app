import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
const ASUploadPage = ({
	isOpen,
	onClose,
	title,
	children,
	maxWidth = "max-w-md",
}) => {
	const [show, setShow] = useState(false);
	const [animate, setAnimate] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setShow(true);
			setTimeout(() => setAnimate(true), 10);
		} else {
			setAnimate(false);
			const timer = setTimeout(() => setShow(false), 300); // Wait for animation
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	if (!show) return null;

	return (
		<div
			className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
				animate ? "opacity-100" : "opacity-0"
			}`}
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Modal Content */}
			<div
				className={`relative bg-white rounded-2xl w-full ${maxWidth} p-8 shadow-2xl transform transition-all duration-300 ${
					animate
						? "scale-100 translate-y-0"
						: "scale-95 translate-y-4"
				}`}
			>
				{/* Close Button */}
				<button
					onClick={onClose}
					className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors hover:bg-gray-100"
				>
					<X size={20} />
				</button>

				{/* Title */}
				{title && (
					<h2 className="text-2xl font-bold text-[#1A1C1E] mb-6">
						{title}
					</h2>
				)}

				{/* Body */}
				<div>{children}</div>
			</div>
		</div>
	);
};

export default ASUploadPage;
