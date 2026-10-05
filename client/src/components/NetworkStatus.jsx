import { useEffect, useState } from "react";
import {
  Wifi,
  WifiOff,
  X
} from "lucide-react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(
    navigator.onLine
  );

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setVisible(true);

      setTimeout(() => {
        setVisible(false);
      }, 3500);
    };

    const handleOffline = () => {
      setOnline(false);
      setVisible(true);
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "18px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "11px 15px",
        borderRadius: "12px",
        background: online
          ? "#166534"
          : "#991b1b",
        color: "#ffffff",
        boxShadow:
          "0 10px 30px rgba(0, 0, 0, 0.2)",
        fontSize: "13px",
        fontWeight: 600
      }}
    >
      {online ? (
        <Wifi size={17} />
      ) : (
        <WifiOff size={17} />
      )}

      <span>
        {online
          ? "Back online"
          : "You're offline"}
      </span>

      <button
        type="button"
        onClick={() => setVisible(false)}
        style={{
          border: "none",
          background: "transparent",
          color: "#ffffff",
          cursor: "pointer",
          padding: 0
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}