import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontDir = path.join(__dirname, "../assets/fonts");

/** Google Fonts TTF files (OFL licensed) for node-canvas ad rendering. */
const FONTS = [
  {
    name: "Poppins-Regular.ttf",
    urls: [
      "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf",
    ],
  },
  {
    name: "Poppins-Bold.ttf",
    urls: [
      "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf",
    ],
  },
  {
    name: "Montserrat-Regular.ttf",
    urls: [
      "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Regular.ttf",
      "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
    ],
  },
  {
    name: "Montserrat-Bold.ttf",
    urls: [
      "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Bold.ttf",
      "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
    ],
  },
  {
    name: "Inter-Regular.ttf",
    urls: [
      "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter_18pt-Regular.ttf",
      "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf",
    ],
  },
  {
    name: "Inter-Bold.ttf",
    urls: [
      "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter_18pt-Bold.ttf",
      "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf",
    ],
  },
];

await fs.promises.mkdir(fontDir, { recursive: true });

async function downloadFont(name, urls) {
  const dest = path.join(fontDir, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 10_000) {
    return;
  }

  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) continue;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 10_000) continue;

    await fs.promises.writeFile(dest, buffer);
    console.log(`Downloaded ${name}`);
    return;
  }

  throw new Error(`Failed to download font ${name}`);
}

for (const font of FONTS) {
  await downloadFont(font.name, font.urls);
}

console.log("Ad fonts ready in assets/fonts");
