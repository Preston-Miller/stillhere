import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

/** Short-lived signed URL for the product bundle. */
export async function signedDownloadUrl(expiresInSeconds = 60 * 60): Promise<string> {
  const key = required("R2_OBJECT_KEY");
  const filename = key.split("/").pop() ?? "Stillhere.dmg";
  const cmd = new GetObjectCommand({
    Bucket: required("R2_BUCKET"),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });
  return getSignedUrl(r2(), cmd, { expiresIn: expiresInSeconds });
}
