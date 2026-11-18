#!/usr/bin/env node
// Upload Stillhere files to Cloudflare R2.
//
//   node --env-file=scripts/r2.env scripts/r2-upload.mjs maps [--only UT,CA] [--dry-run]
//       Every state in maps-build/out/catalog.json (.pmtiles + .search.sqlite) to the maps bucket under maps/,
//       then catalog.json last, so the catalog never lists a file that isn't there yet.
//       Files already uploaded with the same checksum are skipped, so it's safe to re-run after a failure.
//
//   node --env-file=scripts/r2.env scripts/r2-upload.mjs file <local path> <key>
//       One file to the releases bucket (private), e.g. the installer: releases/Stillhere-0.1.0.dmg
//
// scripts/r2.env (never commit it):
//   R2_ACCOUNT_ID=...            Cloudflare dashboard → R2 → Account ID
//   R2_ACCESS_KEY_ID=...         R2 → Manage API tokens → Object Read & Write, both buckets
//   R2_SECRET_ACCESS_KEY=...
//   R2_MAPS_BUCKET=stillhere-maps
//   R2_BUCKET=stillhere-releases
//
// Uses the AWS SDK already installed in web/node_modules (R2 speaks the S3 API).
import { createHash } from "node:crypto";
import { createReadStream, statSync, readFileSync, openSync, readSync, closeSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "web", "package.json"));
const {
  S3Client, HeadObjectCommand, PutObjectCommand, CreateMultipartUploadCommand,
  UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand,
} = require("@aws-sdk/client-s3");

const PART = 64 * 1024 * 1024;   // R2 needs equal-size parts (except the last)
const PARALLEL = 4;

function env(name) {
  const v = process.env[name];
  if (!v) { console.error(`${name} is not set (see the top of scripts/r2-upload.mjs)`); process.exit(1); }
  return v;
}

const s3 = () => new S3Client({
  region: "auto",
  endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
  // Newer AWS SDKs add checksums R2 doesn't accept on every call; Cloudflare's docs say to turn them down to "required".
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const TYPES = { ".pmtiles": "application/vnd.pmtiles", ".sqlite": "application/vnd.sqlite3", ".json": "application/json",
                ".dmg": "application/x-apple-diskimage", ".zip": "application/zip" };
const typeOf = (p) => TYPES[Object.keys(TYPES).find((e) => p.endsWith(e))] ?? "application/octet-stream";
const gb = (n) => (n / 1e9).toFixed(2) + " GB";

function sha256(path) {
  const h = createHash("sha256"), buf = Buffer.alloc(PART), fd = openSync(path, "r");
  let n; while ((n = readSync(fd, buf, 0, PART, null)) > 0) h.update(buf.subarray(0, n));
  closeSync(fd); return h.digest("hex");
}

async function retry(what, fn, tries = 5) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= tries) throw e;
      console.log(`  ${what} failed (${e.name || e.message}); retrying in ${i * 3}s`);
      await new Promise((r) => setTimeout(r, i * 3000));
    }
  }
}

async function remoteSha(client, bucket, key) {
  try { return (await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))).Metadata?.sha256 ?? null; }
  catch (e) { if (e.$metadata?.httpStatusCode === 404 || e.name === "NotFound") return null; throw e; }
}

async function upload(client, bucket, key, path, sha, { cache = "public, max-age=3600", dry = false } = {}) {
  const size = statSync(path).size;
  if ((await remoteSha(client, bucket, key)) === sha) { console.log(`  = ${key} (already uploaded)`); return 0; }
  if (dry) { console.log(`  would upload ${key} (${gb(size)})`); return size; }
  const meta = { Bucket: bucket, Key: key, ContentType: typeOf(path), CacheControl: cache, Metadata: { sha256: sha } };
  if (size <= PART) {
    await retry(key, () => client.send(new PutObjectCommand({ ...meta, Body: readFileSync(path), ContentLength: size })));
    console.log(`  ↑ ${key} (${gb(size)})`); return size;
  }
  const { UploadId } = await client.send(new CreateMultipartUploadCommand(meta));
  const count = Math.ceil(size / PART), parts = new Array(count);
  let next = 0, done = 0;
  try {
    await Promise.all(Array.from({ length: PARALLEL }, async () => {
      while (next < count) {
        const i = next++, start = i * PART, end = Math.min(size, start + PART) - 1;
        const r = await retry(`${key} part ${i + 1}/${count}`, () => client.send(new UploadPartCommand({
          Bucket: bucket, Key: key, UploadId, PartNumber: i + 1,
          Body: createReadStream(path, { start, end }), ContentLength: end - start + 1,
        })));
        parts[i] = { ETag: r.ETag, PartNumber: i + 1 };
        done += end - start + 1;
        process.stdout.write(`\r  ↑ ${key} ${Math.round((done / size) * 100)}% of ${gb(size)}   `);
      }
    }));
    await retry(`${key} finish`, () => client.send(new CompleteMultipartUploadCommand({
      Bucket: bucket, Key: key, UploadId, MultipartUpload: { Parts: parts },
    })));
    process.stdout.write("\n"); return size;
  } catch (e) {
    process.stdout.write("\n");
    await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId })).catch(() => {});
    throw e;
  }
}

async function maps(args) {
  const dry = args.includes("--dry-run");
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1].toUpperCase().split(",") : null;
  const out = join(ROOT, "maps-build", "out");
  const catalog = JSON.parse(readFileSync(join(out, "catalog.json"), "utf8"));
  const bucket = env("R2_MAPS_BUCKET"), client = s3();
  const states = catalog.states.filter((s) => !only || only.includes(s.code));
  if (only && states.length !== only.length) { console.error("Unknown state code in --only"); process.exit(1); }
  let sent = 0;
  console.log(`${states.length} states, build ${catalog.build} → ${bucket}/maps/${dry ? " (dry run)" : ""}`);
  for (const s of states) {
    for (const f of [{ file: s.file, bytes: s.bytes, sha256: s.sha256 }, s.search].filter(Boolean)) {
      const path = join(out, f.file);
      if (statSync(path).size !== f.bytes) throw new Error(`${f.file} doesn't match catalog.json; rebuild it`);
      sent += await upload(client, bucket, `maps/${f.file}`, path, f.sha256, { dry });
    }
  }
  // The catalog goes last and is cached briefly, so a rebuilt map set shows up in apps within minutes.
  const cpath = join(out, "catalog.json");
  sent += await upload(client, bucket, "maps/catalog.json", cpath, sha256(cpath), { cache: "public, max-age=300", dry });
  console.log(`${dry ? "Would send" : "Sent"} ${gb(sent)}.`);
}

async function file([path, key]) {
  if (!path || !key) { console.error("usage: r2-upload.mjs file <local path> <key>"); process.exit(1); }
  console.log(`checksumming ${basename(path)}…`);
  await upload(s3(), env("R2_BUCKET"), key, path, sha256(path), { cache: "private, no-store" });
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "maps") await maps(rest);
else if (cmd === "file") await file(rest);
else { console.error("usage: r2-upload.mjs maps [--only UT,CA] [--dry-run] | file <path> <key>"); process.exit(1); }
