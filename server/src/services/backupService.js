import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Business from "../models/Business.js";

const MINUTE = 60 * 1000;
const getTenantModels = () => mongoose.modelNames()
  .map((name) => mongoose.model(name))
  .filter((model) => model.schema.path("businessId") && model.modelName !== "Business");

const getHost = (uri) => String(uri || "").match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/:?]+)/i)?.[1]?.toLowerCase() || "";
const getBackupUri = () => process.env.MOVA_BACKUP_MONGO_URI || "";
const getIntervalMs = () => Math.max(1, Number(process.env.MOVA_BACKUP_INTERVAL_HOURS) || 24) * 60 * MINUTE;
const getRetentionDays = () => Math.max(1, Number(process.env.MOVA_BACKUP_RETENTION_DAYS) || 30);

let backupConnection = null;
let backupRunInProgress = false;

const openBackupConnection = async () => {
  const uri = getBackupUri();
  if (!uri) return null;
  if (getHost(uri) && getHost(uri) === getHost(process.env.MONGO_URI)) {
    throw new Error("MOVA_BACKUP_MONGO_URI must point to a separate MongoDB cluster from MONGO_URI.");
  }
  if (!backupConnection) {
    backupConnection = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 15000 });
    await backupConnection.asPromise();
    await backupConnection.collection("movaBackupSnapshots").createIndex({ businessId: 1, createdAt: -1 });
    await backupConnection.collection("movaBackupChunks").createIndex({ snapshotId: 1, businessId: 1, collectionName: 1, chunkIndex: 1 }, { unique: true });
    await backupConnection.collection("movaBackupChunks").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }
  return backupConnection;
};

const writeCollectionChunks = async ({ backupDb, businessId, snapshotId, createdAt, model }) => {
  const cursor = model.find({ businessId }).lean().cursor();
  const chunks = backupDb.collection("movaBackupChunks");
  const maxChunkBytes = 6 * 1024 * 1024;
  let pending = [];
  let pendingBytes = 0;
  let chunkIndex = 0;
  let count = 0;
  const flush = async () => {
    if (!pending.length) return;
    await chunks.insertOne({ snapshotId, businessId, createdAt, expiresAt: new Date(createdAt.getTime() + getRetentionDays() * 86400000), collectionName: model.collection.collectionName, chunkIndex: chunkIndex++, records: pending });
    pending = [];
    pendingBytes = 0;
  };

  for await (const record of cursor) {
    const recordBytes = Buffer.byteLength(JSON.stringify(record), "utf8");
    if (recordBytes > maxChunkBytes) throw new Error(`A record in ${model.collection.collectionName} exceeds the backup chunk size.`);
    if (pending.length && pendingBytes + recordBytes > maxChunkBytes) await flush();
    pending.push(record);
    pendingBytes += recordBytes;
    count += 1;
  }
  await flush();
  return count;
};

export const runAutomaticBackup = async () => {
  if (!getBackupUri() || backupRunInProgress) return { skipped: true };
  backupRunInProgress = true;
  try {
    const connection = await openBackupConnection();
    if (!connection) return { skipped: true };
    const backupDb = connection.db;
    const businesses = await Business.find({}).select("_id name businessType ownerId phone email address country currency timezone logo isActive createdAt updatedAt").lean();
    const models = getTenantModels();
    for (const business of businesses) {
      const businessId = String(business._id);
      const snapshotId = randomUUID();
      const createdAt = new Date();
      const snapshot = backupDb.collection("movaBackupSnapshots");
      await snapshot.insertOne({ _id: snapshotId, businessId, createdAt, status: "RUNNING", expiresAt: new Date(createdAt.getTime() + getRetentionDays() * 86400000) });
      try {
        let collectionCount = 1;
        let recordCount = 1;
        await backupDb.collection("movaBackupChunks").insertOne({
          snapshotId,
          businessId,
          createdAt,
          expiresAt: new Date(createdAt.getTime() + getRetentionDays() * 86400000),
          collectionName: "businesses",
          chunkIndex: 0,
          records: [business],
        });
        for (const model of models) {
          const count = await writeCollectionChunks({ backupDb, businessId, snapshotId, createdAt, model });
          if (count) {
            collectionCount += 1;
            recordCount += count;
          }
        }
        await snapshot.updateOne({ _id: snapshotId }, { $set: { status: "COMPLETE", completedAt: new Date(), collectionCount, recordCount } });
        console.info(`[MOVA] Automatic backup completed for business ${businessId}: ${recordCount} records in ${collectionCount} collections.`);
      } catch (error) {
        await snapshot.updateOne({ _id: snapshotId }, { $set: { status: "FAILED", completedAt: new Date(), error: error.message.slice(0, 300) } });
        throw error;
      }
    }
    const expiry = new Date(Date.now() - getRetentionDays() * 86400000);
    await backupDb.collection("movaBackupSnapshots").deleteMany({ createdAt: { $lt: expiry } });
    await backupDb.collection("movaBackupChunks").deleteMany({ expiresAt: { $lte: new Date() } });
    return { skipped: false, businesses: businesses.length };
  } finally {
    backupRunInProgress = false;
  }
};

export const startAutomaticBackups = () => {
  if (!getBackupUri()) {
    console.warn("[MOVA] Automatic backups are disabled; set MOVA_BACKUP_MONGO_URI to a separate MongoDB cluster.");
    return null;
  }
  const run = () => runAutomaticBackup().catch((error) => console.error("[MOVA] Automatic backup failed:", error.message));
  void run();
  const timer = setInterval(run, getIntervalMs());
  timer.unref?.();
  console.info(`[MOVA] Automatic backups scheduled every ${getIntervalMs() / MINUTE / 60} hour(s), retaining ${getRetentionDays()} days.`);
  return timer;
};

export const getBackupStatus = async (businessId) => {
  const uri = getBackupUri();
  if (!uri) {
    return { automaticConfigured: false, intervalHours: Number(process.env.MOVA_BACKUP_INTERVAL_HOURS) || 24, retentionDays: getRetentionDays(), lastSuccessfulAt: null };
  }
  const connection = await openBackupConnection();
  const latest = await connection.collection("movaBackupSnapshots").findOne({ businessId, status: "COMPLETE" }, { sort: { createdAt: -1 }, projection: { createdAt: 1, recordCount: 1, collectionCount: 1 } });
  return { automaticConfigured: true, intervalHours: getIntervalMs() / MINUTE / 60, retentionDays: getRetentionDays(), lastSuccessfulAt: latest?.createdAt || null, recordCount: latest?.recordCount || 0, collectionCount: latest?.collectionCount || 0 };
};
