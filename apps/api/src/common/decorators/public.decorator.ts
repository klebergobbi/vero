import { SetMetadata } from "@nestjs/common";

/** Marca uma rota como pública (sem authn/authz). Usado por login, refresh, health. */
export const IS_PUBLIC_KEY = "isPublic";
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
