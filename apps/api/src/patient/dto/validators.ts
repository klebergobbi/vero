import { registerDecorator, type ValidationOptions } from "class-validator";
import { isValidBrazilianPhone, isValidCpf } from "@vero/types";

/** @IsCpf — valida CPF (dígitos verificadores) reusando a regra de @vero/types. */
export function IsCpf(options?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: "isCpf",
      target: object.constructor,
      propertyName,
      options: options ?? {},
      validator: {
        validate: (value: unknown) =>
          typeof value === "string" && isValidCpf(value),
        defaultMessage: () => "CPF inválido",
      },
    });
  };
}

/** @IsBrazilianPhone — valida telefone BR (DDD + 10/11 dígitos). */
export function IsBrazilianPhone(options?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: "isBrazilianPhone",
      target: object.constructor,
      propertyName,
      options: options ?? {},
      validator: {
        validate: (value: unknown) =>
          typeof value === "string" && isValidBrazilianPhone(value),
        defaultMessage: () => "Telefone inválido",
      },
    });
  };
}
