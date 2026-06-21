import { IsOptional, IsString, MaxLength } from "class-validator";

export class GenerateContractDto {
  @IsString()
  budgetId!: string;
}

export class SignContractDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  signerName?: string;
}
