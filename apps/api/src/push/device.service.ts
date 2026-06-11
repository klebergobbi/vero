import { ForbiddenException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { Principal } from "../auth/strategies/jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";
import type { OptOutDto, RegisterDeviceDto } from "./dto/device.dto";

/**
 * Registro de device tokens de push (S13a). Cada token pertence ao principal que
 * o registrou (paciente OU equipe). TODA operação é dona-escopada (tenantId +
 * patientId|userId) — anti-IDOR (§4 A01): ninguém altera o token de outro.
 */
@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registra/atualiza (upsert por token único) o device do principal atual. */
  async register(principal: Principal, dto: RegisterDeviceDto) {
    const owner = this.ownerFields(principal);
    return this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: {
        token: dto.token,
        platform: dto.platform,
        optedOut: false,
        ...owner,
      },
      update: {
        platform: dto.platform,
        optedOut: false,
        lastSeenAt: new Date(),
        // reassocia o token ao principal atual (device pode trocar de dono/login).
        ...owner,
      },
      select: { id: true, token: true, optedOut: true },
    });
  }

  /** Liga/desliga o opt-out de push do PRÓPRIO device (§5 loja). */
  async setOptOut(principal: Principal, dto: OptOutDto) {
    const res = await this.prisma.deviceToken.updateMany({
      where: { token: dto.token, ...this.ownerWhere(principal) },
      data: { optedOut: dto.optedOut },
    });
    if (res.count === 0) throw new ForbiddenException();
    return { ok: true, optedOut: dto.optedOut };
  }

  /** Remove o PRÓPRIO device (ex.: logout). */
  async unregister(principal: Principal, token: string) {
    const res = await this.prisma.deviceToken.deleteMany({
      where: { token, ...this.ownerWhere(principal) },
    });
    if (res.count === 0) throw new ForbiddenException();
  }

  /** Campos de dono p/ create/update (exatamente um de patientId/userId). */
  private ownerFields(principal: Principal): {
    tenantId: string;
    patientId?: string;
    userId?: string;
  } {
    return principal.kind === "patient"
      ? { tenantId: principal.tenantId, patientId: principal.patientId }
      : { tenantId: principal.tenantId, userId: principal.userId };
  }

  /** Filtro dona-escopado p/ where (anti-IDOR). */
  private ownerWhere(principal: Principal): Prisma.DeviceTokenWhereInput {
    return principal.kind === "patient"
      ? { tenantId: principal.tenantId, patientId: principal.patientId }
      : { tenantId: principal.tenantId, userId: principal.userId };
  }
}
