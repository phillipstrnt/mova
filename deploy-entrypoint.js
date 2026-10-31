import { writeFile } from "node:fs/promises";
import path from "node:path";

const publicConfig = {
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
};
const configPath = path.resolve("client/dist/config.js");
await writeFile(
  configPath,
  `window.__MOVA_CONFIG__ = ${JSON.stringify(publicConfig)};\n`,
  "utf8"
);
await import("./server/src/server.js");
