import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: ["192.168.1.130", "192.168.*.*", "10.*.*.*"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
