import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";

import {
  registerMovaServiceWorker,
  initializeMovaNetworkStatus
} from "./pwa.js";

import "./index.css";


/*
|--------------------------------------------------------------------------
| MOVA PWA
|--------------------------------------------------------------------------
|
| Register the service worker and initialize online/offline
| detection.
|
| The service worker is only registered in production.
|
|--------------------------------------------------------------------------
*/

registerMovaServiceWorker();

initializeMovaNetworkStatus();


/*
|--------------------------------------------------------------------------
| React Application
|--------------------------------------------------------------------------
*/

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);