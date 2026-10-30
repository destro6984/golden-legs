import { pingDatabase, type EntityManager } from "@golden-legs/db";
import { ServiceUnavailableError } from "../../http/errors";

export type HealthStatus = { status: "ok" };

export class HealthService {
  private readonly em: EntityManager;

  constructor({ em }: { em: EntityManager }) {
    this.em = em;
  }

  async check(): Promise<HealthStatus> {
    try {
      await pingDatabase(this.em);
    } catch (error) {
      throw new ServiceUnavailableError("Database unavailable", { cause: error });
    }
    return { status: "ok" };
  }
}
