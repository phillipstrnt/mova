import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";

import { AuthProvider } from "./context/AuthContext.jsx";
import { BusinessProvider } from "./context/BusinessContext.jsx";

import {
  registerMovaServiceWorker,
  initializeMovaNetworkStatus,
  initializePWAInstallPrompt,
} from "./pwa.js";

import "./index.css";

/*
|--------------------------------------------------------------------------
| MOVA PWA INITIALIZATION
|--------------------------------------------------------------------------
|
| Service worker:
| Handles the installable application shell and future offline support.
|
| Network status:
| Allows MOVA to detect online/offline state.
|
| Install prompt:
| Captures the browser's install event so the MOVA interface can
| provide an "Install MOVA" experience.
|
*/

registerMovaServiceWorker();

initializeMovaNetworkStatus();

initializePWAInstallPrompt();

/*
|--------------------------------------------------------------------------
| React Application
|--------------------------------------------------------------------------
*/

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <App />
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);