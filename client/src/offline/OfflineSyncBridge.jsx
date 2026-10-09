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
    window.addEventListener("online", sync);
    if (navigator.onLine) sync();
    return () => window.removeEventListener("online", sync);
  }, [userId]);

  return null;
}
