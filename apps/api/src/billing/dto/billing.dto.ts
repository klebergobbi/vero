import { IsIn, IsInt, IsString, Matches, Max, Min } from "class-validator";

const METHODS = ["PIX", "BOLETO", "CARD"] as const;

export class CreateChargeDto {
  @IsString()
  budgetId!: string;

  @IsIn(METHODS)
  method!: (typeof METHODS)[number];

  @IsInt()
  @Min(1)
  @Max(48)
  installments!: number;

  /** Vencimento da 1ª parcela (YYYY-MM-DD). As demais são mensais. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Data inválida (use YYYY-MM-DD)" })
  firstDueDate!: string;
}
