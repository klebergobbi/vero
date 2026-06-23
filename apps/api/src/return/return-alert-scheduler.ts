import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { ReturnService } from "./return.service";

/** Fila/cron do alerta de retorno (§S33). */
export const RETURN_ALERT_QUEUE = "return-alert-scheduler";

/** Agenda o job repetível diário (08:30) que dispara os retornos vencidos. */
@Injectable()
export class ReturnAlertScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReturnAlertScheduler.name);

  constructor(@InjectQueue(RETURN_ALERT_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    // jobId fixo → não duplica o agendamento a cada boot.
    await this.queue.add(
      "run",
      {},
      { repeat: { pattern: "30 8 * * *" }, jobId: "return-alert-daily" },
    );
    this.logger.log("Alerta de retorno agendado (diário 08:30).");
  }
}

/** Worker: dispara os retornos vencidos. Falha → retry/backoff/DLQ. */
@Processor(RETURN_ALERT_QUEUE)
export class ReturnAlertProcessor extends WorkerHost {
  constructor(private readonly returns: ReturnService) {
    super();
  }

  async process(_job: Job): Promise<{ triggered: number; sent: number }> {
    const { triggered, sent } = await this.returns.runDueAlerts();
    return { triggered, sent };
  }
}
