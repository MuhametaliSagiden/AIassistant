import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      "avatars.mds.yandex.net"
    ]
  },
  async rewrites() {
    return process.env.NODE_ENV === 'production'
      ? [
          {
            source: '/api/:path*',
            destination: 'https://aiassistant-d9df.onrender.com/api/:path*',
          },
        ]
      : [];
  },
};

export default nextConfig;
