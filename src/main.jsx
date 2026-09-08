import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const app = <App />;

createRoot(document.getElementById("root")).render(
	import.meta.env.DEV ? <StrictMode>{app}</StrictMode> : app
);
