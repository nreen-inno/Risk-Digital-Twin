import React from "react";
import ReactDOM from "react-dom/client";
import { installMockBackend } from "./demo/mockServer.js";
import App from "./App.jsx";
import "./styles/design-system.css";
import "./index.css";

// Offline demo: serve every /api/* call from bundled data + baked AI (no backend).
installMockBackend();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
