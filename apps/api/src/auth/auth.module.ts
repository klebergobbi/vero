import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import type { Env } from "../config/env.validation";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PatientAuthController } from "./patient-auth.controller";
import { PatientAuthService } from "./patient-auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

/**
 * Wiring de autenticação (CLAUDE.md S3). PrismaModule/RedisModule são @Global.
 * O segredo do JWT vem da env validada; o TTL é definido por assinatura na AuthService.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get("JWT_SECRET", { infer: true }),
      }),
    }),
  ],
  controllers: [AuthController, PatientAuthController],
  providers: [AuthService, PatientAuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
