import {
  listOfflineAuditEvents,
  listOfflineSales,
  updateOfflineAuditEvent,
  updateOfflineSale,
} from "./database";

let syncInProgress = false;

const emitSyncChange = (detail) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mova:offline-queue-updated", { detail }));
  }
};

export const syncOfflineSales = async (api, userId) => {
  if (syncInProgress || !userId || typeof navigator === "undefined" || !navigator.onLine) return { synced: 0, failed: 0 };
  syncInProgress = true;
  let synced = 0;
  let failed = 0;
  try {
    const sales = await listOfflineSales({ userId, includeSynced: false });
    const events = await listOfflineAuditEvents(userId);
    for (const event of events) {
      if (event.status === "BLOCKED") continue;
      await updateOfflineAuditEvent(event.eventId, { status: "SYNCING", lastError: "" });
      try {
        await api.post("/audit-logs/events", {
          action: event.action,
          description: event.description,
          metadata: event.metadata,
          branchId: event.branchId,
        });
        await updateOfflineAuditEvent(event.eventId, { status: "SYNCED", syncedAt: new Date().toISOString() });
      } catch (error) {
        const status = Number(error?.response?.status || 0);
        const blocked = status >= 400 && status < 500 && status !== 408 && status !== 429;
        await updateOfflineAuditEvent(event.eventId, { status: blocked ? "BLOCKED" : "PENDING", lastError: error?.response?.data?.message || error.message || "Sync failed." });
        if (!navigator.onLine || !error?.response) break;
      }
    }
    for (const queuedSale of sales) {
      if (queuedSale.status === "BLOCKED") continue;
      await updateOfflineSale(queuedSale.clientSaleId, {
        status: "SYNCING",
        attempts: Number(queuedSale.attempts || 0) + 1,
        lastError: "",
      });
      emitSyncChange({ status: "SYNCING", clientSaleId: queuedSale.clientSaleId });
      try {
        const response = await api.post("/sales", {
          ...queuedSale.payload,
          clientSaleId: queuedSale.clientSaleId,
          offlineQueued: true,
          branchId: queuedSale.branchId,
        });
        const sale = response?.data?.sale || response?.data?.data?.sale;
        await updateOfflineSale(queuedSale.clientSaleId, {
          status: "SYNCED",
          syncedAt: new Date().toISOString(),
          serverSaleId: sale?._id || sale?.id || null,
          receiptNumber: sale?.receiptNumber || queuedSale.receiptNumber,
          lastError: "",
        });
        synced += 1;
        emitSyncChange({ status: "SYNCED", clientSaleId: queuedSale.clientSaleId, sale });
      } catch (error) {
        const status = Number(error?.response?.status || 0);
        const blocked = status >= 400 && status < 500 && status !== 408 && status !== 429;
        const message = error?.response?.data?.message || error.message || "Sync failed.";
        await updateOfflineSale(queuedSale.clientSaleId, {
          status: blocked ? "BLOCKED" : "PENDING",
          lastError: message,
        });
        failed += 1;
        emitSyncChange({ status: blocked ? "BLOCKED" : "PENDING", clientSaleId: queuedSale.clientSaleId, message });
        if (!navigator.onLine || !error?.response) break;
      }
    }
    emitSyncChange({ status: "FINISHED", synced, failed });
    return { synced, failed };
  } finally {
    syncInProgress = false;
  }
};

export const watchOfflineSaleSync = (api, userId, onChange) => {
  if (typeof window === "undefined") return () => {};
  const run = () => syncOfflineSales(api, userId).catch((error) => {
    console.error("MOVA offline sale sync failed:", error);
  });
  const listener = (event) => onChange?.(event.detail || {});
  window.addEventListener("online", run);
  window.addEventListener("mova:offline-queue-updated", listener);
  if (navigator.onLine) run();
  return () => {
    window.removeEventListener("online", run);
    window.removeEventListener("mova:offline-queue-updated", listener);
  };
};
