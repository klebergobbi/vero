import { IsBoolean, IsIn, IsString, Matches, MaxLength } from "class-validator";

/** Plataformas suportadas (espelha o enum DevicePlatform do Prisma). */
export const DEVICE_PLATFORMS = ["IOS", "ANDROID"] as const;
export type DevicePlatformValue = (typeof DEVICE_PLATFORMS)[number];

// Formato do Expo push token: ExponentPushToken[...] ou ExpoPushToken[...].
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

/** POST /me/devices — registra/atualiza o token do device do próprio principal. */
export class RegisterDeviceDto {
  @IsString()
  @MaxLength(255)
  @Matches(EXPO_TOKEN_RE, {
    message: "token deve ser um Expo push token válido",
  })
  token!: string;

  @IsIn(DEVICE_PLATFORMS)
  platform!: DevicePlatformValue;
}

/** Corpo das ações sobre um token já existente (opt-out / remoção). */
export class DeviceTokenDto {
  @IsString()
  @MaxLength(255)
  @Matches(EXPO_TOKEN_RE, {
    message: "token deve ser um Expo push token válido",
  })
  token!: string;
}

/** POST /me/devices/opt-out — liga/desliga o recebimento de push deste device. */
export class OptOutDto extends DeviceTokenDto {
  @IsBoolean()
  optedOut!: boolean;
}
