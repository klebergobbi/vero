import { IsJWT, IsNotEmpty, IsString } from "class-validator";

/** Token de refresh (JWT) — usado tanto em /auth/refresh quanto em /auth/logout. */
export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @IsJWT()
  refreshToken!: string;
}
