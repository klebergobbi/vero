// Metro para monorepo (CLAUDE.md §2). Observa a raiz do workspace e resolve
// node_modules tanto do app quanto da raiz. O Metro do SDK 56 já resolve os
// symlinks do pnpm por padrão.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
