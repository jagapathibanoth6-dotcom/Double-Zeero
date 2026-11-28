import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: ["192.168.1.130", "192.168.*.*", "10.*.*.*", "*.app.github.dev"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Old booking links that may still be printed or bookmarked.
  async redirects() {
    return [
      { source: "/book/manchester", destination: "/manchester/book", permanent: true },
      { source: "/book/chorlton", destination: "/chorlton/book", permanent: true },
      // Home delivery was removed; old links and QR posters go to click & collect.
      { source: "/order/delivery", destination: "/order/collect", permanent: false },
      // Removed dashboard pages (home delivery and the POS till).
      { source: "/admin/delivery", destination: "/admin/collect", permanent: false },
      { source: "/admin/pos", destination: "/admin", permanent: false },
    ];
  },
};

export default nextConfig;
