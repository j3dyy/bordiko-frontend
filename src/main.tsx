import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { AuthProvider } from "./auth.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { I18nProvider } from "./i18n.tsx";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
