import { SetMetadata } from "@nestjs/common";
import type { PermissionKey } from "@vero/types";

/**
 * Declara as permissions exigidas por uma rota (deny-by-default: rota sem este
 * decorator é NEGADA pelo PermissionsGuard). Chaves são type-safe (@vero/types).
 */
export const PERMISSIONS_KEY = "permissions";
export const Permissions = (
  ...keys: PermissionKey[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, keys);
