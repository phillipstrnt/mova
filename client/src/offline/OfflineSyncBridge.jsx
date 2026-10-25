import { useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { syncOfflineSales } from "./syncManager";

export default function OfflineSyncBridge() {
  const { user } = useAuth();
  const userId = String(user?._id || user?.id || "");

  useEffect(() => {
    if (!userId) return undefined;
    const sync = () => syncOfflineSales(api, userId).catch((error) => console.warn("MOVA offline sync will retry:", error));
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisible);
    const retryTimer = window.setInterval(() => {
      if (navigator.onLine) sync();
    }, 30000);
    if (navigator.onLine) sync();
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(retryTimer);
    };
  }, [userId]);

  return null;
}
