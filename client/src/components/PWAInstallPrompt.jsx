import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  Smartphone,
} from "lucide-react";

import {
  canInstallPWA,
  installPWA,
  isPWAInstalled,
  subscribeToPWAInstallState,
} from "../pwa.js";

const PWAInstallButton = () => {
  const [canInstall, setCanInstall] = useState(
    canInstallPWA()
  );

  const [installed, setInstalled] = useState(
    isPWAInstalled()
  );

  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const unsubscribe =
      subscribeToPWAInstallState(
        ({ canInstall: available, isInstalled }) => {
          setCanInstall(available);
          setInstalled(isInstalled);
        }
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      setInstalling(false);
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

  const handleInstall = async () => {
    if (installing) {
      return;
    }

    setInstalling(true);

    try {
      const result = await installPWA();

      if (result.success) {
        setInstalled(true);
        setCanInstall(false);
      }
    } catch (error) {
      console.error(
        "MOVA installation failed:",
        error
      );
    } finally {
      setInstalling(false);
    }
  };

  if (installed) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
        <CheckCircle2 size={17} />
        <span>MOVA Installed</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={!canInstall || installing}
      title={
        canInstall
          ? "Install MOVA on this device"
          : "MOVA installation is not currently available"
      }
      className="group flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {installing ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span>Installing...</span>
        </>
      ) : (
        <>
          <Download
            size={18}
            className="transition-transform group-hover:-translate-y-0.5"
          />
          <span>Install MOVA App</span>
        </>
      )}
    </button>
  );
};

export default PWAInstallButton;