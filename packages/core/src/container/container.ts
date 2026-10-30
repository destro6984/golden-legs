import { asClass, asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import { getOrm } from "@golden-legs/db";
import { HealthService } from "../services/health/health.service";
import type { Cradle } from "./cradle";

export type AppContainer = AwilixContainer<Cradle>;

// Every dependency is registered here by hand, so each binding is greppable.
async function buildContainer(): Promise<AppContainer> {
  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    // Rejects singletons that depend on scoped registrations such as `em`.
    strict: true,
  });
  const orm = await getOrm();
  container.register({
    orm: asValue(orm),
    em: asFunction(({ orm }: Cradle) => orm.em.fork()).scoped(),
    healthService: asClass(HealthService).scoped(),
  });
  return container;
}

// Cached on globalThis so Next.js hot reload reuses one container.
const globalForContainer = globalThis as unknown as {
  container?: Promise<AppContainer>;
};

export function getContainer(): Promise<AppContainer> {
  globalForContainer.container ??= buildContainer().catch((error: unknown) => {
    // Forget the failed attempt so the next request can retry.
    globalForContainer.container = undefined;
    throw error;
  });
  return globalForContainer.container;
}

/** Runs `work` in a fresh container scope: one per request or job. */
export async function withScope<T>(work: (cradle: Cradle) => Promise<T>): Promise<T> {
  const scope = (await getContainer()).createScope();
  try {
    return await work(scope.cradle);
  } finally {
    await scope.dispose();
  }
}
