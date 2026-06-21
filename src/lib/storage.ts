import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

// Cloudflare R2 (S3-compatible) helper for avatars / media uploads.
// Optional: when R2 isn't configured the app falls back to the seeded avatar
// URLs, so the live preview works without any storage wired up.
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicUrl = process.env.R2_PUBLIC_URL;

export const isStorageConfigured = Boolean(
  accountId && accessKeyId && secretAccessKey && bucket && publicUrl,
);

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!isStorageConfigured) {
    throw new Error("R2 storage is not configured");
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }
  return client;
}

// Upload bytes and return the public URL (bucket must allow public reads, or
// be fronted by a custom domain set in R2_PUBLIC_URL).
export async function uploadMedia(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string,
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${publicUrl!.replace(/\/$/, "")}/${key}`;
}
