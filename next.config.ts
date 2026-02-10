import type { NextConfig } from "next";

const supabaseAssetHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: supabaseAssetHost
      ? [
          {
            protocol: "https",
            hostname: supabaseAssetHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
