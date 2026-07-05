import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ["canvas", "fabric"],
  outputFileTracingIncludes: {
    "/api/webhooks/whatsapp": ["./assets/fonts/**"],
    "/api/generate": ["./assets/fonts/**"],
  },
};

export default nextConfig;
