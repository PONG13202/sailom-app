import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',  // ระบุพอร์ตด้วย
        pathname: '/uploads/**', // หรือจะใส่ /** เพื่ออนุญาตทุก path
      },
    ],
  },
};

export default nextConfig;
