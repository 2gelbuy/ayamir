import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "@/components/ErrorBoundary";
import "@/styles/global.css";
import { initAnalytics, track } from "@/lib/analytics";

void initAnalytics("ayamir").then(() => track("popup_open", { path: "popup" }));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
