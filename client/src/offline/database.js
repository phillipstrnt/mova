const DB_NAME = "mova-pos-offline";
const DB_VERSION = 3;
const CATALOG_STORE = "catalog";
const SALES_STORE = "queuedSales";
const EVENTS_STORE = "queuedEvents";
const INVENTORY_STORE = "queuedInventory";

let databasePromise;

const emitQueueUpdate = (detail) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mova:offline-queue-updated", { detail }));
  }
};

export const openOfflineDatabase = () => {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Offline storage is unavailable in this browser."));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(CATALOG_STORE)) {
          database.createObjectStore(CATALOG_STORE, { keyPath: "key" });
        }
        if (!database.objectStoreNames.contains(SALES_STORE)) {
          const store = database.createObjectStore(SALES_STORE, { keyPath: "clientSaleId" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("userId", "userId", { unique: false });
        }
        if (!database.objectStoreNames.contains(EVENTS_STORE)) {
          const events = database.createObjectStore(EVENTS_STORE, { keyPath: "eventId" });
          events.createIndex("userId", "userId", { unique: false });
          events.createIndex("status", "status", { unique: false });
          events.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!database.objectStoreNames.contains(INVENTORY_STORE)) {
          const inventory = database.createObjectStore(INVENTORY_STORE, { keyPath: "clientAdjustmentId" });
          inventory.createIndex("userId", "userId", { unique: false });
          inventory.createIndex("status", "status", { unique: false });
          inventory.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Unable to open offline storage."));
      request.onblocked = () => reject(new Error("Offline storage is busy in another MOVA tab."));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
};

const withStore = async (storeName, mode, action) => {
  const database = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;
    try {
      result = action(store);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(result?.result);
    transaction.onerror = () => reject(transaction.error || result?.error);
    transaction.onabort = () => reject(transaction.error || new Error("Offline storage request was cancelled."));
  });
};

export const savePosCatalog = async ({ businessId, branchId, products, customers = [] }) => {
  const key = `${businessId}:${branchId}`;
  await withStore(CATALOG_STORE, "readwrite", (store) => store.put({
    key,
    businessId: String(businessId),
    branchId: String(branchId),
    products,
    customers,
    updatedAt: new Date().toISOString(),
  }));
};

export const readPosCatalog = async ({ businessId, branchId }) => {
  const key = `${businessId}:${branchId}`;
  return withStore(CATALOG_STORE, "readonly", (store) => store.get(key));
};

export const enqueueOfflineSale = async (sale) => {
  const queued = {
    ...sale,
    status: "PENDING",
    attempts: 0,
    createdAt: sale.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await withStore(SALES_STORE, "readwrite", (store) => store.put(queued));
  emitQueueUpdate({ status: "QUEUED", kind: "SALE", clientSaleId: queued.clientSaleId });
  return queued;
};

export const updateOfflineSale = async (clientSaleId, patch) => {
  const database = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SALES_STORE, "readwrite");
    const store = transaction.objectStore(SALES_STORE);
    const request = store.get(clientSaleId);
    let updated;
    request.onsuccess = () => {
      if (!request.result) return;
      updated = { ...request.result, ...patch, updatedAt: new Date().toISOString() };
      store.put(updated);
    };
    transaction.oncomplete = () => resolve(updated || null);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const listOfflineSales = async ({ userId, includeSynced = true } = {}) => {
  const records = await withStore(SALES_STORE, "readonly", (store) => store.getAll());
  return (records || [])
    .filter((record) => (!userId || String(record.userId) === String(userId)) && (includeSynced || record.status !== "SYNCED"))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

export const countPendingOfflineSales = async (userId) =>
  (await listOfflineSales({ userId, includeSynced: false })).length;

export const enqueueOfflineAuditEvent = async (event, identity) => {
  const eventId = globalThis.crypto?.randomUUID?.() || `mova-event-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record = { ...event, eventId, ...identity, status: "PENDING", createdAt: new Date().toISOString() };
  await withStore(EVENTS_STORE, "readwrite", (store) => store.put(record));
  emitQueueUpdate({ status: "QUEUED", kind: "EVENT", eventId });
  return record;
};

export const listOfflineAuditEvents = async (userId) => {
  const events = await withStore(EVENTS_STORE, "readonly", (store) => store.getAll());
  return (events || []).filter((event) => String(event.userId) === String(userId) && event.status !== "SYNCED").sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

export const updateOfflineAuditEvent = async (eventId, patch) => {
  const database = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(EVENTS_STORE, "readwrite");
    const store = transaction.objectStore(EVENTS_STORE);
    const request = store.get(eventId);
    let updated;
    request.onsuccess = () => {
      if (!request.result) return;
      updated = { ...request.result, ...patch, updatedAt: new Date().toISOString() };
      store.put(updated);
    };
    transaction.oncomplete = () => resolve(updated || null);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const enqueueOfflineInventoryAdjustment = async (adjustment) => {
  const clientAdjustmentId = adjustment.clientAdjustmentId || globalThis.crypto?.randomUUID?.() || `mova-adjustment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const queued = {
    ...adjustment,
    clientAdjustmentId,
    status: "PENDING",
    attempts: 0,
    createdAt: adjustment.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await withStore(INVENTORY_STORE, "readwrite", (store) => store.put(queued));
  emitQueueUpdate({ status: "QUEUED", kind: "INVENTORY", clientAdjustmentId });
  return queued;
};

export const listOfflineInventoryAdjustments = async ({ userId, includeSynced = true } = {}) => {
  const records = await withStore(INVENTORY_STORE, "readonly", (store) => store.getAll());
  return (records || [])
    .filter((record) => (!userId || String(record.userId) === String(userId)) && (includeSynced || record.status !== "SYNCED"))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

export const updateOfflineInventoryAdjustment = async (clientAdjustmentId, patch) => {
  const database = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INVENTORY_STORE, "readwrite");
    const store = transaction.objectStore(INVENTORY_STORE);
    const request = store.get(clientAdjustmentId);
    let updated;
    request.onsuccess = () => {
      if (!request.result) return;
      updated = { ...request.result, ...patch, updatedAt: new Date().toISOString() };
      store.put(updated);
    };
    transaction.oncomplete = () => resolve(updated || null);
    transaction.onerror = () => reject(transaction.error);
  });
};
