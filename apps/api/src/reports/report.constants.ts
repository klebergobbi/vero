/** Filas da engine de relatórios (§S43) — em arquivo próprio p/ evitar import
 * circular entre report.service e report-builder. */
export const REPORT_BUILDER_QUEUE = "report-builder";
export const REPORT_BUILDER_DLQ = "report-builder-dlq";
