import { IsIn, IsISO8601 } from "class-validator";

export const REPORT_TYPES = ["BILLING", "NO_SHOW"] as const;
export const REPORT_FORMATS = ["CSV", "PDF"] as const;

export class RequestReportDto {
  @IsIn(REPORT_TYPES)
  type!: (typeof REPORT_TYPES)[number];

  @IsIn(REPORT_FORMATS)
  format!: (typeof REPORT_FORMATS)[number];

  @IsISO8601()
  periodStart!: string;

  @IsISO8601()
  periodEnd!: string;
}
