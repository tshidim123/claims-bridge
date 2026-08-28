import "server-only";

import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { StorageNotConfiguredError, type PrivateObjectStorage } from "./storage";

const R2_REGION = "auto";

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) throw new StorageNotConfiguredError();
  return { accountId, accessKeyId, secretAccessKey, bucketName, endpoint: `https://${accountId}.r2.cloudflarestorage.com` };
}

export function getR2Storage(): PrivateObjectStorage {
  const config = getR2Config();
  const client = new S3Client({ region: R2_REGION, endpoint: config.endpoint, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });

  return {
    async createUploadUrl({ key, contentType, expiresInSeconds }) {
      return getSignedUrl(client, new PutObjectCommand({ Bucket: config.bucketName, Key: key, ContentType: contentType }), { expiresIn: expiresInSeconds });
    },
    async headObject(key) {
      const result = await client.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: key }));
      return { contentLength: result.ContentLength ?? 0, contentType: result.ContentType ?? null, checksum: result.ChecksumSHA256 ?? null };
    },
    async getObjectPrefix(key, byteCount) {
      const result = await client.send(new GetObjectCommand({ Bucket: config.bucketName, Key: key, Range: `bytes=0-${Math.max(0, byteCount - 1)}` }));
      if (!result.Body) throw new Error("Object content was unavailable.");
      return result.Body.transformToByteArray();
    },
    async deleteObject(key) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }));
    },
    async createDownloadUrl(key, expiresInSeconds) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucketName, Key: key, ResponseCacheControl: "private, no-store, max-age=0" }), { expiresIn: expiresInSeconds });
    },
  };
}

export function isR2Configured() {
  return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
}
