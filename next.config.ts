import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // PWA configuration will be handled via middleware or alternative approach
  // due to conflicts with next export and turbopack
};

export default nextConfig;
