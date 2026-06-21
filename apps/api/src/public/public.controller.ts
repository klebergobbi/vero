import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { BookDto } from "./dto/book.dto";
import { SlotsQueryDto } from "./dto/slots-query.dto";
import { PublicService } from "./public.service";

/**
 * Agendamento online PÚBLICO (sem JWT). Tenant resolvido pelo `slug` na URL.
 * Rate limit FORTE (sobre o global): a leitura de slots e, principalmente, o
 * booking são abusáveis. Nunca vaza agenda interna — só slots livres (§S15).
 */
@Public()
@Controller("public/clinics/:slug")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  /** GET /public/clinics/:slug/units — unidades da clínica (para o seletor). */
  @Get("units")
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  listUnits(@Param("slug") slug: string) {
    return this.publicService.listUnits(slug);
  }

  /** GET /public/clinics/:slug/professionals — profissionais da clínica. */
  @Get("professionals")
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  listProfessionals(@Param("slug") slug: string) {
    return this.publicService.listProfessionals(slug);
  }

  /** GET /public/clinics/:slug/slots — horários livres de um profissional num dia. */
  @Get("slots")
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  listSlots(@Param("slug") slug: string, @Query() query: SlotsQueryDto) {
    return this.publicService.listOpenSlots(
      slug,
      query.unitId,
      query.professionalId,
      query.date,
    );
  }

  /** POST /public/clinics/:slug/book — reserva um slot livre (cria lead + consulta). */
  @Post("book")
  @Throttle({ global: { limit: 5, ttl: 60_000 } })
  book(@Param("slug") slug: string, @Body() dto: BookDto) {
    return this.publicService.book(slug, dto);
  }
}
