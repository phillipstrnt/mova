import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();

      setInstallEvent(event);

      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setInstallEvent(null);
      setShowPrompt(false);

      console.log("MOVA has been installed.");
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      );
    };
  }, []);

  const installMova = async () => {
    if (!installEvent) {
      return;
    }

    try {
      await installEvent.prompt();

      const result = await installEvent.userChoice;

      console.log(
        "MOVA installation result:",
        result.outcome
      );

      setInstallEvent(null);
      setShowPrompt(false);
    } catch (error) {
      console.error(
        "MOVA installation failed:",
        error
      );
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || !installEvent) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "16px",
        borderRadius: "16px",
        background: "#111827",
        color: "#ffffff",
        boxShadow:
          "0 20px 50px rgba(0, 0, 0, 0.25)",
        maxWidth: "520px",
        margin: "0 auto"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flex: 1
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: "#1f2937",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <Download size={21} />
        </div>

        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "15px"
            }}
          >
            Install MOVA
          </div>

          <div
            style={{
              fontSize: "13px",
              opacity: 0.75,
              marginTop: "3px"
            }}
          >
            Install MOVA for faster access and an
            app-like experience.
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={installMova}
        style={{
          border: "none",
          background: "#22c55e",
          color: "#ffffff",
          borderRadius: "10px",
          padding: "10px 16px",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap"
        }}
      >
        Install
      </button>

      <button
        type="button"
        onClick={dismissPrompt}
        aria-label="Close install prompt"
        style={{
          border: "none",
          background: "transparent",
          color: "#ffffff",
          opacity: 0.7,
          cursor: "pointer",
          padding: "4px"
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}