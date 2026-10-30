import mongoose from "mongoose";
import Business from "../models/Business.js";
import { getBackupStatus } from "../services/backupService.js";

const MAX_BACKUP_BYTES = 9 * 1024 * 1024;
const MAX_RESTORE_RECORDS = 25000;
const EXCLUDED_MANUAL_MODELS = new Set(["User"]);

const currentBusinessId = (req) => String(req.user?.businessId || "");
const tenantModels = () => mongoose.modelNames()
  .map((name) => mongoose.model(name))
  .filter((model) => model.schema.path("businessId") && !EXCLUDED_MANUAL_MODELS.has(model.modelName));

export const getBackupStatusController = async (req, res) => {
  try {
    return res.json({ success: true, backup: await getBackupStatus(currentBusinessId(req)) });
  } catch (error) {
    console.error("Backup status could not be loaded:", error.message);
    return res.status(503).json({ success: false, message: "Backup status is temporarily unavailable." });
  }
};

export const exportBusinessBackup = async (req, res) => {
  try {
    const businessId = currentBusinessId(req);
    const business = await Business.findById(businessId).select("name businessType currency timezone").lean();
    if (!business) return res.status(404).json({ success: false, message: "Business was not found." });

    const collections = {};
    let recordCount = 0;
    for (const model of tenantModels()) {
      const records = await model.find({ businessId }).lean();
      if (!records.length) continue;
      recordCount += records.length;
      collections[model.collection.collectionName] = records;
    }

    const bundle = {
      format: "mova-business-backup",
      version: 1,
      createdAt: new Date().toISOString(),
      businessId,
      business: { ...business, _id: String(business._id) },
      recordCount,
      includes: "Business operational records. User accounts, credentials, and authentication tokens are excluded.",
      collections,
    };

    const json = JSON.stringify(bundle);
    if (Buffer.byteLength(json, "utf8") > MAX_BACKUP_BYTES) {
      return res.status(413).json({ success: false, message: "This business backup exceeds the 9 MB device-backup limit. Configure automatic off-device backups for larger data sets." });
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="mova-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    return res.send(json);
  } catch (error) {
    console.error("Business backup export failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not create the device backup." });
  }
};

export const restoreBusinessBackup = async (req, res) => {
  try {
    const businessId = currentBusinessId(req);
    const bundle = req.body;
    if (bundle?.format !== "mova-business-backup" || bundle?.version !== 1 || String(bundle?.businessId || "") !== businessId || !bundle?.collections || typeof bundle.collections !== "object" || Array.isArray(bundle.collections)) {
      return res.status(400).json({ success: false, message: "Choose a valid MOVA backup created for this business." });
    }

    const modelsByCollection = new Map(tenantModels().map((model) => [model.collection.collectionName, model]));
    let recordCount = 0;
    let restoredCollections = 0;
    for (const [collectionName, records] of Object.entries(bundle.collections)) {
      const model = modelsByCollection.get(collectionName);
      if (!model || !Array.isArray(records)) {
        return res.status(400).json({ success: false, message: `The backup contains an unsupported collection: ${collectionName}.` });
      }
      recordCount += records.length;
      if (recordCount > MAX_RESTORE_RECORDS) {
        return res.status(413).json({ success: false, message: "This backup contains too many records for a device restore." });
      }
      const operations = [];
      for (const record of records) {
        if (!record || typeof record !== "object" || !mongoose.Types.ObjectId.isValid(String(record._id || "")) || String(record.businessId || "") !== businessId) {
          return res.status(400).json({ success: false, message: `A record in ${collectionName} does not belong to this business or has an invalid ID.` });
        }
        const replacement = { ...record, _id: new mongoose.Types.ObjectId(String(record._id)), businessId: new mongoose.Types.ObjectId(businessId) };
        operations.push({ replaceOne: { filter: { _id: replacement._id, businessId: replacement.businessId }, replacement, upsert: true } });
      }
      if (operations.length) {
        await model.collection.bulkWrite(operations, { ordered: false });
        restoredCollections += 1;
      }
    }

    return res.json({ success: true, restoredCollections, restoredRecords: recordCount, message: "Backup records were merged into this business. Existing records with matching IDs were restored; records absent from the backup were not deleted. User accounts were not changed." });
  } catch (error) {
    console.error("Business backup restore failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not restore this backup. Existing business data was not intentionally deleted." });
  }
};
