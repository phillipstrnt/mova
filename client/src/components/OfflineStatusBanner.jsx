import { useCallback, useEffect, useState } from "react";
import { CloudDownload, CloudOff, RefreshCw } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  listOfflineAuditEvents,
  listOfflineInventoryAdjustments,
  listOfflineSales,
} from "../offline/database";
import { syncOfflineSales } from "../offline/syncManager";

export default function OfflineStatusBanner() {
  const { user } = useAuth();
  const userId = String(user?._id || user?.id || "");
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [pending, setPending] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const refreshQueue = useCallback(async () => {
    if (!userId) return;
    try {
      const [sales, inventory, events] = await Promise.all([
        listOfflineSales({ userId, includeSynced: false }),
        listOfflineInventoryAdjustments({ userId, includeSynced: false }),
        listOfflineAuditEvents(userId),
      ]);
      const queue = [...sales, ...inventory, ...events];
      setPending(queue.length);
      setBlocked(queue.filter((record) => record.status === "BLOCKED").length);
    } catch (error) {
      console.warn("Unable to read MOVA's offline sync queue:", error);
    }
  }, [userId]);

  const syncNow = useCallback(async () => {
    if (!userId || !navigator.onLine || syncing) return;
    setSyncing(true);
    setMessage("Syncing saved changes with MOVA…");
    try {
      const result = await syncOfflineSales(api, userId);
      await refreshQueue();
      if (result.failed) setMessage(`${result.failed} saved change${result.failed === 1 ? "" : "s"} need attention. Your changes are still on this device.`);
      else if (result.synced || result.syncedAdjustments) setMessage("Saved sales and stock changes are up to date.");
      else setMessage("MOVA is up to date.");
    } catch {
      setMessage("Sync could not finish. MOVA will retry when the connection is available.");
    } finally {
      setSyncing(false);
    }
  }, [refreshQueue, syncing, userId]);

  useEffect(() => {
    refreshQueue();
    const handleOffline = () => setOnline(false);
    const handleOnline = () => {
      setOnline(true);
      setMessage("Connection restored. Syncing saved changes…");
      syncNow();
    };
    const handleQueueChange = (event) => {
      refreshQueue();
      if (event.detail?.status === "BLOCKED") setMessage(`A saved change needs attention: ${event.detail.message || "review the stock or sale details"}`);
      if (event.detail?.status === "FINISHED" && !event.detail.failed) setMessage("Saved changes are up to date.");
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("mova:offline-queue-updated", handleQueueChange);
    const timer = window.setInterval(refreshQueue, 15000);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("mova:offline-queue-updated", handleQueueChange);
      window.clearInterval(timer);
    };
  }, [refreshQueue, syncNow]);

  if (!userId || (online && pending === 0 && !message)) return null;

  return (
    <div className={`flex flex-col gap-2 border-b px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 ${online ? "border-blue-200 bg-blue-50 text-blue-900" : "border-amber-300 bg-amber-50 text-amber-950"}`} role="status" aria-live="polite">
      <div className="flex min-w-0 items-start gap-2.5">
        {online ? <CloudDownload size={18} className="mt-0.5 shrink-0" /> : <CloudOff size={18} className="mt-0.5 shrink-0" />}
        <div className="min-w-0">
          <p className="font-bold">{online ? "Connection restored" : "Offline mode"}{pending > 0 ? ` · ${pending} saved change${pending === 1 ? "" : "s"} waiting to sync` : ""}</p>
          <p className="mt-0.5 text-xs leading-5 opacity-80">
            {!online
              ? "POS sales and scanned stock adjustments are saved on this device. Reconnect to sync them."
              : blocked > 0
                ? `${blocked} change${blocked === 1 ? "" : "s"} need review; the other saved changes will keep syncing.`
                : message || "Checking for saved changes…"}
          </p>
        </div>
      </div>
      {online && pending > 0 && (
        <button type="button" onClick={syncNow} disabled={syncing} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 disabled:opacity-60 sm:self-center">
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync now"}
        </button>
      )}
    </div>
  );
}
