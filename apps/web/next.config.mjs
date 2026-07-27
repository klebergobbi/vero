/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pacotes do monorepo consumidos como TS-source (CLAUDE.md §2).
  transpilePackages: ["@vero/api-client", "@vero/types"],
  // Build mínimo p/ Docker (S53) — só o necessário via trace do webpack,
  // sem precisar instalar node_modules completo na imagem de runtime.
  output: "standalone",
};

export default nextConfig;
