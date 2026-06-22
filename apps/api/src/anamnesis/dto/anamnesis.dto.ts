import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

/** Pergunta do modelo de anamnese (JSON em AnamnesisTemplate.questions). */
export class TemplateQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  label!: string;
}

export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  procedureKey?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TemplateQuestionDto)
  questions!: TemplateQuestionDto[];
}

export class SendAnamnesisDto {
  @IsString()
  @MinLength(1)
  patientId!: string;

  @IsString()
  @MinLength(1)
  templateId!: string;
}

export class SubmitFillDto {
  /** Respostas { questionId: valor }. Validadas como objeto; serializadas+cifradas. */
  @IsObject()
  answers!: Record<string, unknown>;
}
