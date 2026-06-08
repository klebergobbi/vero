/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pacotes do monorepo consumidos como TS-source (CLAUDE.md §2).
  transpilePackages: ["@vero/api-client", "@vero/types"],
};

export default nextConfig;
