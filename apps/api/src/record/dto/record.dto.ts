import { IsString, MaxLength, MinLength } from "class-validator";

export class AddEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content!: string;
}

export class AddAttachmentDto {
  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @MaxLength(120)
  contentType!: string;

  /** Conteúdo do arquivo em base64. */
  @IsString()
  dataBase64!: string;
}
