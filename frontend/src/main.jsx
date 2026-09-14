// src/main.jsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { PostHogProvider } from "posthog-js/react";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { ToastProvider } from "./context/ToastContext";
import ToastOverlay from "./components/ui/Toast";
import SocketProvider from "./context/SocketContext";
import App from "./App";
import "./index.css";

const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
  capture_pageview: false,
  capture_pageleave: true,
  person_profiles: "identified_only",
};

const posthogKey =
  import.meta.env.VITE_POSTHOG_KEY ||
  import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PostHogProvider apiKey={posthogKey} options={posthogOptions}>
      <HelmetProvider>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <FavoritesProvider>
                <ToastProvider>
                  <App />
                  {/* Toast overlay lives outside App so it's never clipped by
                      any overflow-hidden parent (Navbar, modals, etc.)         */}
                  <ToastOverlay />
                </ToastProvider>
              </FavoritesProvider>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </HelmetProvider>
    </PostHogProvider>
  </StrictMode>,
);
