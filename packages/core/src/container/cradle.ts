import type { EntityManager, MikroORM } from "@golden-legs/db";
import type { HealthService } from "../services/health/health.service";

/** Everything the DI container provides. One entry per registration in container.ts. */
export interface Cradle {
  orm: MikroORM;
  /** A fresh EntityManager fork for each scope. */
  em: EntityManager;
  healthService: HealthService;
}
