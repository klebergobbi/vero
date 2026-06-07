import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

/**
 * Filtro global (CLAUDE.md §4 — fail-closed, nunca vazar stack trace).
 * - HttpException: repassa status + payload definido pelo desenvolvedor (seguro).
 * - Qualquer outro erro: 500 genérico ao cliente; detalhe completo só no log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response
        .status(status)
        .json(
          typeof body === "string"
            ? { statusCode: status, message: body }
            : body,
        );
      return;
    }

    // Erro inesperado: registra tudo internamente, devolve genérico.
    const reqId = (request as Request & { id?: string }).id;
    this.logger.error(
      `Erro não tratado em ${request.method} ${request.url} (reqId=${reqId ?? "-"})`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  }
}
