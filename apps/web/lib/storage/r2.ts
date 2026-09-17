// Cloudflare R2 storage adapter (S3-compatible)
// Normalizes Buffers to Uint8Array for fetch BodyInit compatibility.
import type { StorageAdapter, UploadParams, UploadResult } from "./adapter";

interface R2Options {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

// ─── Normalize any body-like value to a fetch-compatible BodyInit ───────────
function toBodyInit(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;

  // Buffer (Node) – convert to Uint8Array
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    const u8 = new Uint8Array(body);
    return u8 as unknown as BodyInit;
  }

  // Uint8Array – pass as-is
  if (body instanceof Uint8Array) {
    return body as unknown as BodyInit;
  }

  // ArrayBuffer – wrap in Uint8Array
  if (body instanceof ArrayBuffer) {
    const u8 = new Uint8Array(body);
    return u8 as unknown as BodyInit;
  }

  // Blob, ReadableStream, string, URLSearchParams, FormData – pass through
  if (
    typeof body === "string" ||
    body instanceof Blob ||
    body instanceof ReadableStream ||
    body instanceof URLSearchParams ||
    body instanceof FormData
  ) {
    return body as BodyInit;
  }

  // Fallback – stringify
  return String(body);
}

export function createR2Adapter(options: R2Options): StorageAdapter {
  const accountId = options.accountId;
  const bucket = options.bucket;
  const publicUrl = options.publicUrl;
  const endpoint = "https://" + accountId + ".r2.cloudflarestorage.com";

  async function request(
    method: string,
    key: string,
    body?: unknown,
    contentType?: string,
    metadata?: Record<string, string>,
  ): Promise<Response> {
    const url = endpoint + "/" + bucket + "/" + key;

    const headers: Record<string, string> = {
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    };
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    // Safe iteration – noUncheckedIndexedAccess returns `string | undefined`
    if (metadata) {
      for (const rawKey of Object.keys(metadata)) {
        const value = metadata[rawKey];
        if (value !== undefined) {
          headers["x-amz-meta-" + rawKey.toLowerCase()] = value;
        }
      }
    }

    const normalizedBody = toBodyInit(body);

    return fetch(url, {
      method,
      headers,
      body: normalizedBody,
    });
  }

  return {
    async upload(params: UploadParams): Promise<UploadResult> {
      const res = await request(
        "PUT",
        params.key,
        params.body,
        params.contentType,
        params.metadata,
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error("R2 upload failed: " + err);
      }
      return {
        url: publicUrl + "/" + params.key,
        key: params.key,
      };
    },

    async delete(key: string): Promise<void> {
      const res = await request("DELETE", key);
      if (!res.ok && res.status !== 404) {
        throw new Error("R2 delete failed: " + res.statusText);
      }
    },

    async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
      return publicUrl + "/" + key + "?expires=" + (Date.now() + expiresIn * 1000);
    },

    publicUrl(key: string): string {
      return publicUrl + "/" + key;
    },
  };
}

// ─── Legacy compatibility wrapper ─────────────────────────────────────────────
// Used by API routes that expect a simple `uploadToR2(file, key)` function.
export async function uploadToR2(
  file: unknown,
  key: string,
): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error("[Storage] R2 not configured - cannot upload");
  }

  const adapter = createR2Adapter({
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
  });

  let body: Uint8Array | string | Blob;
  let contentType = "application/octet-stream";

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(file)) {
    body = new Uint8Array(file);
  } else if (typeof file === "string") {
    body = file;
  } else if (file && typeof file === "object") {
    const f = file as {
      arrayBuffer?: () => Promise<ArrayBuffer>;
      type?: string;
    };
    if (typeof f.arrayBuffer === "function") {
      const ab = await f.arrayBuffer();
      body = new Uint8Array(ab);
    } else {
      throw new Error("[Storage] Unsupported file type");
    }
    if (typeof f.type === "string") contentType = f.type;
  } else {
    throw new Error("[Storage] Unsupported file type");
  }

  const result = await adapter.upload({ key, body, contentType });
  return result.url;
}
