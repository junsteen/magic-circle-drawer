import type { NextConfig } from "next";

// ビルド時にバージョン文字列を生成（vYYYYMMDD-HHMM形式）
const generateVersion = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `v${year}${month}${day}-${hours}${minutes}`;
};

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // PWA configuration will be handled via middleware or alternative approach
  // due to conflicts with next export and turbopack
  env: {
    NEXT_PUBLIC_APP_VERSION: generateVersion(),
  },
};

export default nextConfig;
