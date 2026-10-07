import { useEffect, useState } from "react";

import {
CheckCircle2,
Download,
ExternalLink,
Smartphone,
X,
} from "lucide-react";

import {
canInstallPWA,
installPWA,
isPWAInstalled,
subscribeToPWAInstallState,
} from "../pwa.js";

const DISMISS_KEY = "mova_pwa_install_dismissed";

const PWAInstallPrompt = () => {
const [canInstall, setCanInstall] = useState(
canInstallPWA()
);

const [installed, setInstalled] = useState(
isPWAInstalled()
);

const [installing, setInstalling] = useState(false);

const [installedSuccessfully, setInstalledSuccessfully] =
useState(false);

const [dismissed, setDismissed] = useState(() => {
if (typeof window === "undefined") {
return false;
}


return (
  window.localStorage.getItem(DISMISS_KEY) ===
  "true"
);


});

| /*                                                                         |
| -------------------------------------------------------------------------- |
| LISTEN FOR PWA INSTALL STATE CHANGES                                       |
| -------------------------------------------------------------------------- |
| */                                                                         |

useEffect(() => {
const unsubscribe =
subscribeToPWAInstallState(
({ canInstall: available, isInstalled }) => {
setCanInstall(available);
setInstalled(isInstalled);


      if (isInstalled) {
        setInstalledSuccessfully(true);
      }
    }
  );

return unsubscribe;


}, []);

| /*                                                                         |
| -------------------------------------------------------------------------- |
| LISTEN FOR SUCCESSFUL INSTALLATION                                         |
| -------------------------------------------------------------------------- |
| */                                                                         |

useEffect(() => {
const handleInstalled = () => {
setInstalled(true);
setCanInstall(false);
setInstalling(false);
setInstalledSuccessfully(true);
};


window.addEventListener(
  "mova:pwa-installed",
  handleInstalled
);

return () => {
  window.removeEventListener(
    "mova:pwa-installed",
    handleInstalled
  );
};


}, []);

| /*                                                                         |
| -------------------------------------------------------------------------- |
| INSTALL MOVA                                                               |
| -------------------------------------------------------------------------- |
| */                                                                         |

const handleInstall = async () => {
if (installing) {
return;
}


setInstalling(true);

try {
  const result = await installPWA();

  if (result.success) {
    setInstalledSuccessfully(true);
    setInstalled(true);
    setCanInstall(false);
  }
} catch (error) {
  console.error(
    "MOVA PWA installation failed:",
    error
  );
} finally {
  setInstalling(false);
}


};

| /*                                                                         |
| -------------------------------------------------------------------------- |
| DISMISS INSTALL PROMPT                                                     |
| -------------------------------------------------------------------------- |
| */                                                                         |

const handleDismiss = () => {
setDismissed(true);


try {
  window.localStorage.setItem(
    DISMISS_KEY,
    "true"
  );
} catch (error) {
  console.warn(
    "MOVA PWA: Could not save dismissal preference.",
    error
  );
}


};

| /*                                                                         |
| -------------------------------------------------------------------------- |
| SHOW SUCCESS MESSAGE                                                       |
| -------------------------------------------------------------------------- |
| */                                                                         |

if (installedSuccessfully || installed) {
return null;
}

| /*                                                                         |
| -------------------------------------------------------------------------- |
| DON'T SHOW WHEN UNAVAILABLE                                                |
| -------------------------------------------------------------------------- |
| */                                                                         |

if (!canInstall || dismissed) {
return null;
}

| /*                                                                         |
| -------------------------------------------------------------------------- |
| INSTALL PROMPT                                                             |
| -------------------------------------------------------------------------- |
| */                                                                         |

return ( <div className="fixed bottom-4 right-4 z-[9999] w-[calc(100%-2rem)] max-w-sm"> <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">


    {/* Header */}
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
          <Smartphone
            size={21}
            strokeWidth={2.2}
          />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Install MOVA
          </h3>

          <p className="mt-0.5 text-xs text-slate-500">
            Your business, one tap away
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss installation prompt"
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={18} />
      </button>
    </div>

    {/* Content */}
    <div className="px-5 py-4">
      <p className="text-sm leading-6 text-slate-600">
        Install MOVA on this device for faster access
        to your POS, inventory, sales and business
        dashboard.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <CheckCircle2
            size={15}
            className="text-emerald-600"
          />
          Faster access
        </div>

        <div className="flex items-center gap-2">
          <CheckCircle2
            size={15}
            className="text-emerald-600"
          />
          App-like experience
        </div>

        <div className="flex items-center gap-2">
          <CheckCircle2
            size={15}
            className="text-emerald-600"
          />
          Mobile friendly
        </div>

        <div className="flex items-center gap-2">
          <CheckCircle2
            size={15}
            className="text-emerald-600"
          />
          Offline ready
        </div>
      </div>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 bg-slate-50 px-5 py-4">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={installing}
        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Maybe later
      </button>

      <button
        type="button"
        onClick={handleInstall}
        disabled={installing}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {installing ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Installing...
          </>
        ) : (
          <>
            <Download size={16} />
            Install App
          </>
        )}
      </button>
    </div>
  </div>
</div>


);
};

export default PWAInstallPrompt;
