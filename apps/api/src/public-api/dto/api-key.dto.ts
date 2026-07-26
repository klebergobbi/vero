import {
  IsArray,
  IsDateString,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Max,
  MaxLength,
} from "class-validator";

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  scopes!: string[];

  /** Máximo de requests por minuto. Default: 60. */
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(600)
  rateLimit?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsArray()
  @IsString({ each: true })
  events!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

export class UpdateBrandingDto {
  @IsOptional()
  @IsHexColor()
  brandColor?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  logoUrl?: string;
}
