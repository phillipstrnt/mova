import {
  listOfflineAuditEvents,
  listOfflineInventoryAdjustments,
  listOfflineSales,
  updateOfflineAuditEvent,
  updateOfflineInventoryAdjustment,
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
  let syncedAdjustments = 0;
  let failed = 0;
  try {
    const sales = await listOfflineSales({ userId, includeSynced: false });
    const adjustments = await listOfflineInventoryAdjustments({ userId, includeSynced: false });
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
        failed += 1;
        if (!navigator.onLine || !error?.response) break;
      }
    }
    const operations = [
      ...sales.map((record) => ({ kind: "SALE", record, createdAt: record.createdAt })),
      ...adjustments.map((record) => ({ kind: "INVENTORY", record, createdAt: record.createdAt })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (const operation of operations) {
      const queued = operation.record;
      if (queued.status === "BLOCKED") continue;
      const updateRecord = operation.kind === "SALE"
        ? (patch) => updateOfflineSale(queued.clientSaleId, patch)
        : (patch) => updateOfflineInventoryAdjustment(queued.clientAdjustmentId, patch);
      await updateRecord({
        status: "SYNCING",
        attempts: Number(queued.attempts || 0) + 1,
        lastError: "",
      });
      emitSyncChange({ status: "SYNCING", kind: operation.kind, clientSaleId: queued.clientSaleId, clientAdjustmentId: queued.clientAdjustmentId });
      try {
        if (operation.kind === "SALE") {
          const response = await api.post("/sales", {
            ...queued.payload,
            clientSaleId: queued.clientSaleId,
            offlineQueued: true,
            branchId: queued.branchId,
          });
          const sale = response?.data?.sale || response?.data?.data?.sale;
          await updateRecord({
            status: "SYNCED",
            syncedAt: new Date().toISOString(),
            serverSaleId: sale?._id || sale?.id || null,
            receiptNumber: sale?.receiptNumber || queued.receiptNumber,
            lastError: "",
          });
          synced += 1;
          emitSyncChange({ status: "SYNCED", kind: "SALE", clientSaleId: queued.clientSaleId, sale });
        } else {
          const response = await api.post("/inventory-transactions/adjust", {
            productId: queued.productId,
            type: queued.type,
            quantity: queued.quantity,
            reason: queued.reason,
            notes: queued.notes,
            clientAdjustmentId: queued.clientAdjustmentId,
            branchId: queued.branchId,
          });
          await updateRecord({
            status: "SYNCED",
            syncedAt: new Date().toISOString(),
            serverTransactionId: response?.data?.transaction?._id || null,
            lastError: "",
          });
          syncedAdjustments += 1;
          emitSyncChange({ status: "SYNCED", kind: "INVENTORY", clientAdjustmentId: queued.clientAdjustmentId, productId: queued.productId });
        }
      } catch (error) {
        const status = Number(error?.response?.status || 0);
        const blocked = status >= 400 && status < 500 && status !== 408 && status !== 429;
        const message = error?.response?.data?.message || error.message || "Sync failed.";
        await updateRecord({
          status: blocked ? "BLOCKED" : "PENDING",
          lastError: message,
        });
        failed += 1;
        emitSyncChange({ status: blocked ? "BLOCKED" : "PENDING", kind: operation.kind, clientSaleId: queued.clientSaleId, clientAdjustmentId: queued.clientAdjustmentId, message });
        if (!navigator.onLine || !error?.response) break;
      }
    }
    emitSyncChange({ status: "FINISHED", synced, syncedAdjustments, failed });
    return { synced, syncedAdjustments, failed };
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
