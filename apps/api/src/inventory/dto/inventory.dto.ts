import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateInventoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

export class CreateItemDto {
  @IsOptional()
  @IsString()
  inventoryId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;
}

export class StockInDto {
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  code?: string;
}

export class StockOutDto {
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  /** procedimento que consumiu o insumo (baixa por procedimento, S16). */
  @IsOptional()
  @IsString()
  procedureId?: string;
}
