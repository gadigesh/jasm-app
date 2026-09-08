import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		open: true,
	},
	preview: {
		port: 4173,
		strictPort: true,
	},
	build: {
		target: "es2022",
		cssCodeSplit: true,
		modulePreload: { polyfill: false },
		chunkSizeWarningLimit: 600,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes("node_modules")) return;
					if (
						id.includes("/react/") ||
						id.includes("/react-dom/") ||
						id.includes("/react-router") ||
						id.includes("/scheduler/")
					) {
						return "react-vendor";
					}
					if (
						id.includes("@reduxjs") ||
						id.includes("/react-redux/")
					) {
						return "redux-vendor";
					}
					if (id.includes("lucide-react")) return "icons";
					if (id.includes("react-toastify")) return "toast";
					return "vendor";
				},
			},
		},
	},
});
