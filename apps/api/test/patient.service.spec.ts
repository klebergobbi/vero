import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { isValidBrazilianPhone, isValidCpf } from "@vero/types";
import { PatientService } from "../src/patient/patient.service";
import type { CreatePatientDto } from "../src/patient/dto/create-patient.dto";
import type { PrismaService } from "../src/prisma/prisma.service";

describe("validação CPF/telefone (@vero/types)", () => {
  it("aceita CPF válido e rejeita inválido/repetido", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true); // válido conhecido
    expect(isValidCpf("52998224725")).toBe(true); // sem máscara
    expect(isValidCpf("111.111.111-11")).toBe(false); // todos iguais
    expect(isValidCpf("529.982.247-24")).toBe(false); // dígito errado
    expect(isValidCpf("123")).toBe(false);
  });

  it("valida telefone BR (fixo/celular) e rejeita formatos errados", () => {
    expect(isValidBrazilianPhone("(11) 98765-4321")).toBe(true); // celular (11 díg.)
    expect(isValidBrazilianPhone("1133334444")).toBe(true); // fixo (10 díg.)
    expect(isValidBrazilianPhone("11887654321")).toBe(false); // celular (11 díg.) sem o 9
    expect(isValidBrazilianPhone("0099999999")).toBe(false); // DDD inválido
    expect(isValidBrazilianPhone("123")).toBe(false);
  });
});

describe("PatientService (tenant-scoped / anti-IDOR)", () => {
  const baseDto: CreatePatientDto = {
    name: "Maria Silva",
    phone: "(11) 98765-4321",
    leadSource: "INSTAGRAM",
  };

  function build(patientRow?: unknown) {
    const prisma = {
      patient: {
        create: jest.fn((args: { data: unknown }) =>
          Promise.resolve({ id: "p1", ...(args.data as object) }),
        ),
        findFirst: jest.fn().mockResolvedValue(patientRow),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn((args: { data: unknown }) =>
          Promise.resolve({ id: "p1", ...(args.data as object) }),
        ),
      },
    } as unknown as PrismaService;
    return { service: new PatientService(prisma), prisma };
  }

  it("create injeta tenantId e normaliza telefone (só dígitos)", async () => {
    const { service, prisma } = build();
    await service.create("tenant-A", baseDto);
    expect((prisma.patient.create as jest.Mock).mock.calls[0][0]).toEqual({
      data: expect.objectContaining({
        tenantId: "tenant-A",
        phone: "11987654321",
        leadSource: "INSTAGRAM",
      }),
    });
  });

  it("ANTI-IDOR: tenant A não acessa paciente de B (findFirst → null → 403)", async () => {
    const { service, prisma } = build(null); // recurso de B não aparece sob o filtro de A
    await expect(service.findOne("tenant-A", "paciente-de-B")).rejects.toThrow(
      ForbiddenException,
    );
    // A query foi escopada pelo tenant A.
    expect((prisma.patient.findFirst as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-A",
          id: "paciente-de-B",
        }),
      }),
    );
  });

  it("findOne devolve o paciente quando está no escopo do tenant", async () => {
    const { service } = build({ id: "p1", tenantId: "tenant-A", name: "X" });
    await expect(service.findOne("tenant-A", "p1")).resolves.toMatchObject({
      id: "p1",
    });
  });

  it("update exige posse antes de alterar (403 se for de outro tenant)", async () => {
    const { service, prisma } = build(null);
    await expect(
      service.update("tenant-A", "paciente-de-B", { name: "Hack" }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it("remove faz soft-delete (seta deletedAt) após checar posse", async () => {
    const { service, prisma } = build({ id: "p1", tenantId: "tenant-A" });
    await service.remove("tenant-A", "p1");
    const updateArg = (prisma.patient.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: "p1" });
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
  });

  it("rejeita indicador (referredById) fora do tenant", async () => {
    const { service } = build(null); // indicador não encontrado no escopo
    await expect(
      service.create("tenant-A", { ...baseDto, referredById: "ref-de-B" }),
    ).rejects.toThrow(BadRequestException);
  });
});
