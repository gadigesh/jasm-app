import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

const GAP = 8;

const IconTooltip = ({ label, children, position = "top", className = "" }) => {
	const [visible, setVisible] = useState(false);
	const [style, setStyle] = useState({});
	const triggerRef = useRef(null);

	const updatePosition = useCallback(() => {
		const el = triggerRef.current;
		if (!el) return;

		const rect = el.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;

		if (position === "bottom") {
			setStyle({
				top: rect.bottom + GAP,
				left: centerX,
				transform: "translateX(-50%)",
			});
			return;
		}

		setStyle({
			top: rect.top - GAP,
			left: centerX,
			transform: "translate(-50%, -100%)",
		});
	}, [position]);

	const show = () => {
		updatePosition();
		setVisible(true);
	};

	const hide = () => setVisible(false);

	useEffect(() => {
		if (!visible) return;

		const handleReposition = () => updatePosition();
		window.addEventListener("scroll", handleReposition, true);
		window.addEventListener("resize", handleReposition);

		return () => {
			window.removeEventListener("scroll", handleReposition, true);
			window.removeEventListener("resize", handleReposition);
		};
	}, [visible, updatePosition]);

	if (!label) return children;

	return (
		<>
			<span
				ref={triggerRef}
				className={`inline-flex items-center justify-center ${className}`.trim()}
				onMouseEnter={show}
				onMouseLeave={hide}
				onFocus={show}
				onBlur={hide}
			>
				{children}
			</span>
			{visible &&
				createPortal(
					<div
						role="tooltip"
						className="fixed z-[9999] max-w-xs rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-lg pointer-events-none whitespace-pre-line"
						style={style}
					>
						{label}
					</div>,
					document.body
				)}
		</>
	);
};

export default IconTooltip;
