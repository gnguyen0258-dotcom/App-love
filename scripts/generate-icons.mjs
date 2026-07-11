import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconDir = path.join(root, "public", "icons");
const source = await readFile(path.join(iconDir, "icon.svg"));

await mkdir(iconDir, { recursive: true });
await Promise.all([
  sharp(source).resize(192, 192).png().toFile(path.join(iconDir, "icon-192.png")),
  sharp(source).resize(512, 512).png().toFile(path.join(iconDir, "icon-512.png")),
  sharp(source).resize(180, 180).png().toFile(path.join(iconDir, "apple-touch-icon.png")),
  sharp(source)
    .resize(96, 96)
    .grayscale()
    .threshold(128)
    .png()
    .toFile(path.join(iconDir, "badge-96.png")),
]);
