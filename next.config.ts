import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    const pinocchioModes = [
      ["selecting", ""],
      ["listen", "/watching"],
      ["mimicking", "/mimicking"],
      ["guessing", "/guessing"],
      ["word", "/word"],
    ] as const;

    return pinocchioModes.flatMap(([legacyMode, nextMode]) => [
      {
        source: `/book/${legacyMode}`,
        has: [{ type: "query" as const, key: "id", value: "003:(?<chapter>\\d+)" }],
        destination: `/book/pinocchio/:chapter${nextMode}`,
        permanent: false,
      },
      {
        source: `/book/${legacyMode}`,
        missing: [{ type: "query" as const, key: "id" }],
        destination: `/book/pinocchio/1${nextMode}`,
        permanent: false,
      },
    ]);
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i0.wp.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
