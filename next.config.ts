import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    yesterday: { stale: 60, revalidate: 300, expire: 3600 },
    archive: { stale: 86400, revalidate: 604800, expire: 31536000 }, // effectively forever
  },
};

export default nextConfig;
