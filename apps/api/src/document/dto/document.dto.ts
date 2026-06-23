import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export const DOCUMENT_TYPES = ["ATTESTATION", "PRESCRIPTION"] as const;

export class IssueDocumentDto {
  @IsString()
  patientId!: string;

  @IsIn(DOCUMENT_TYPES)
  type!: (typeof DOCUMENT_TYPES)[number];

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  /** Texto do documento (corpo do atestado/receituário). */
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  content!: string;
}
