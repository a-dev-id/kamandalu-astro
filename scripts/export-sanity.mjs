import { createClient } from "@sanity/client";
import { createWriteStream } from "node:fs";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const projectId = "6go5cl4m";
const dataset = "production";
const apiVersion = "2023-05-30";
const exportDir = path.resolve("exports", "sanity-2026-07-14");
const dataDir = path.join(exportDir, "data");
const assetsDir = path.join(exportDir, "asset-files");

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
});

function sanitizeFilename(value) {
  return String(value)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function extensionFromAsset(asset) {
  if (asset.extension) return asset.extension;
  if (asset.originalFilename?.includes(".")) {
    return asset.originalFilename.split(".").pop();
  }
  if (asset.mimeType?.includes("/")) {
    return asset.mimeType.split("/").pop().replace("jpeg", "jpg");
  }
  return "bin";
}

async function downloadAsset(asset) {
  if (!asset.url) return { id: asset._id, skipped: "missing url" };

  const ext = extensionFromAsset(asset);
  const baseName = sanitizeFilename(asset.originalFilename || asset._id);
  const idName = sanitizeFilename(asset._id);
  const namedFile = baseName.endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;
  const fileName = `${idName}-${namedFile}`;
  const filePath = path.join(assetsDir, asset._type, fileName);

  await mkdir(path.dirname(filePath), { recursive: true });

  if (existsSync(filePath)) {
    return {
      id: asset._id,
      type: asset._type,
      url: asset.url,
      file: path.relative(exportDir, filePath).replaceAll("\\", "/"),
      skipped: "already exists",
    };
  }

  const response = await fetch(asset.url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${asset._id}: ${response.status} ${response.statusText}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(filePath));

  return {
    id: asset._id,
    type: asset._type,
    url: asset.url,
    file: path.relative(exportDir, filePath).replaceAll("\\", "/"),
  };
}

async function main() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const documents = await client.fetch("*[]");
  const assets = documents.filter((doc) =>
    doc._type === "sanity.imageAsset" || doc._type === "sanity.fileAsset"
  );
  const contentDocuments = documents.filter((doc) =>
    doc._type !== "sanity.imageAsset" && doc._type !== "sanity.fileAsset"
  );

  await writeFile(path.join(dataDir, "documents.json"), JSON.stringify(documents, null, 2));
  await writeFile(path.join(dataDir, "content-documents.json"), JSON.stringify(contentDocuments, null, 2));
  await writeFile(path.join(dataDir, "asset-documents.json"), JSON.stringify(assets, null, 2));

  const typeCounts = documents.reduce((counts, doc) => {
    counts[doc._type] = (counts[doc._type] || 0) + 1;
    return counts;
  }, {});

  const downloadedAssets = [];
  for (const asset of assets) {
    downloadedAssets.push(await downloadAsset(asset));
    if (downloadedAssets.length % 25 === 0 || downloadedAssets.length === assets.length) {
      console.log(`Processed ${downloadedAssets.length}/${assets.length} assets`);
    }
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    projectId,
    dataset,
    apiVersion,
    totalDocuments: documents.length,
    contentDocuments: contentDocuments.length,
    assets: assets.length,
    typeCounts,
    downloadedAssets,
  };

  await writeFile(path.join(exportDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`Export complete: ${exportDir}`);
  console.log(JSON.stringify({
    totalDocuments: manifest.totalDocuments,
    contentDocuments: manifest.contentDocuments,
    assets: manifest.assets,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
