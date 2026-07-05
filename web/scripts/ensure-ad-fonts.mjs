import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const fontDir = path.join(__dirname, "../assets/fonts");

const copies = [
  ["DejaVuSans.ttf", "DejaVuSans.ttf"],
  ["DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf"],
];

await fs.promises.mkdir(fontDir, { recursive: true });

let sourceDir;
try {
  const pkgRoot = path.dirname(
    require.resolve("dejavu-fonts-ttf/package.json"),
  );
  sourceDir = path.join(pkgRoot, "ttf");
} catch {
  throw new Error("dejavu-fonts-ttf is not installed. Run: npm install");
}

for (const [srcName, destName] of copies) {
  const src = path.join(sourceDir, srcName);
  const dest = path.join(fontDir, destName);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing font in package: ${srcName}`);
  }
  if (!fs.existsSync(dest)) {
    await fs.promises.copyFile(src, dest);
    console.log(`Copied ${destName}`);
  }
}

console.log("Ad fonts ready in assets/fonts");
