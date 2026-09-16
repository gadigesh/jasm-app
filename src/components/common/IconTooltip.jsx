import { useState, useRef } from "react";
import { createPortal } from "react-dom";

const IconTooltip = ({ label, children, position = "top", className = "" }) => {
	const [coords, setCoords] = useState(null);
	const triggerRef = useRef(null);

	const show = () => {
		const el = triggerRef.current;
		if (!el || !label) return;
		const rect = el.getBoundingClientRect();
		const x = Math.min(
			Math.max(rect.left + rect.width / 2, 96),
			window.innerWidth - 96
		);
		const showBelow = position === "bottom";
		setCoords({
			x,
			y: showBelow ? rect.bottom + 8 : rect.top - 8,
			showBelow,
		});
	};

	if (!label) return children;

	return (
		<>
			<span
				ref={triggerRef}
				className={`inline-flex items-center justify-center ${className}`.trim()}
				onMouseEnter={show}
				onMouseLeave={() => setCoords(null)}
			>
				{children}
			</span>
			{coords
				? createPortal(
						<div
							role="tooltip"
							style={{
								position: "fixed",
								top: coords.y,
								left: coords.x,
								transform: coords.showBelow
									? "translateX(-50%)"
									: "translate(-50%, -100%)",
								zIndex: 2147483647,
								background: "#111827",
								color: "#fff",
								fontSize: 12,
								fontWeight: 500,
								lineHeight: 1.45,
								padding: "6px 10px",
								borderRadius: 6,
								whiteSpace: "pre-line",
								pointerEvents: "none",
								maxWidth: 280,
								boxShadow: "0 10px 24px rgba(15, 23, 42, 0.28)",
							}}
						>
							{label}
						</div>,
						document.body
					)
				: null}
		</>
	);
};

export default IconTooltip;
