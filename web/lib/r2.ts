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

export type Platform = "mac" | "windows";

/** The installer's key in the bucket. R2_OBJECT_KEY is the Mac DMG; the Windows installer sits next to it. */
function objectKey(platform: Platform): string {
  if (platform === "windows") return process.env.R2_OBJECT_KEY_WINDOWS || "releases/Stillhere-Setup-0.1.0.exe";
  return required("R2_OBJECT_KEY");
}

/** Short-lived signed URL for the installer. */
export async function signedDownloadUrl(platform: Platform = "mac", expiresInSeconds = 60 * 60): Promise<string> {
  const key = objectKey(platform);
  const filename = key.split("/").pop() ?? "Stillhere.dmg";
  const cmd = new GetObjectCommand({
    Bucket: required("R2_BUCKET"),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });
  return getSignedUrl(r2(), cmd, { expiresIn: expiresInSeconds });
}
