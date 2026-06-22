import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { CollectionService } from "./collection.service";

/** Fila/cron da régua de cobrança (§S22). */
export const COLLECTION_RULER_QUEUE = "collection-ruler";

/** Agenda o job repetível diário (08:00) que roda a régua. */
@Injectable()
export class CollectionRulerScheduler implements OnModuleInit {
  private readonly logger = new Logger(CollectionRulerScheduler.name);

  constructor(
    @InjectQueue(COLLECTION_RULER_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // jobId fixo → não duplica o agendamento a cada boot.
    await this.queue.add(
      "run",
      {},
      { repeat: { pattern: "0 8 * * *" }, jobId: "collection-daily" },
    );
    this.logger.log("Régua de cobrança agendada (diária 08:00).");
  }
}

/** Worker: executa a régua. Falha → retry/backoff/DLQ (defaultJobOptions). */
@Processor(COLLECTION_RULER_QUEUE)
export class CollectionRulerProcessor extends WorkerHost {
  constructor(private readonly collection: CollectionService) {
    super();
  }

  async process(_job: Job): Promise<{ sent: number; skipped: number }> {
    const { sent, skipped } = await this.collection.runDueCollections();
    return { sent, skipped };
  }
}
