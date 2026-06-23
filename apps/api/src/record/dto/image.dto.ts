import {
  IsBase64,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class AddImageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  filename!: string;

  @IsString()
  @MaxLength(60)
  contentType!: string;

  /** imagem cheia em base64. */
  @IsBase64()
  dataBase64!: string;

  /** miniatura em base64 (gerada no client via canvas). */
  @IsOptional()
  @IsBase64()
  thumbnailBase64?: string;
}
