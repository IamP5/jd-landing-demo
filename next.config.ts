import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // permite acessar o dev server pelo IP da rede local (celular)
  allowedDevOrigins: ["192.168.0.5", "localhost"],
};

export default nextConfig;
