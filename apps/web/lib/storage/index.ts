// Unified storage export
export * from "./adapter";
export { createR2Adapter } from "./r2";

import { createR2Adapter } from "./r2";
import type { StorageAdapter } from "./adapter";

let cachedAdapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter | null {
  if (cachedAdapter) return cachedAdapter;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    console.warn("[Storage] R2 credentials missing - storage disabled");
    return null;
  }

  cachedAdapter = createR2Adapter({
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
  });
  return cachedAdapter;
}

export async function uploadFile(
  key: string,
  body: Buffer | Blob | string,
  contentType: string,
): Promise<string | null> {
  const adapter = getStorageAdapter();
  if (!adapter) return null;
  const result = await adapter.upload({ key, body, contentType });
  return result.url;
}

// BATCH1_APPLIED
