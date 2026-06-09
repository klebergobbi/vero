// Metro para monorepo (CLAUDE.md §2). Observa a raiz do workspace e resolve
// node_modules tanto do app quanto da raiz — necessário no monorepo pnpm.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// O Metro do SDK 56 já resolve symlinks do pnpm por padrão; só apontamos onde
// observar/buscar no monorepo (sem sobrepor flags que o expo-doctor desaconselha).
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
