import "server-only";
import { cache } from "react";
import { createContainer, InjectionMode } from "awilix";
import type { AppContainer, Cradle } from "@golden-legs/core";
import { registerDb } from "@golden-legs/db";

// Composition root: the only place that creates the DI container.
async function buildContainer(): Promise<AppContainer> {
  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    // Rejects singletons that depend on scoped registrations such as `em`.
    strict: true,
  });
  await registerDb(container);
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

/**
 * Container scope for the current request. React `cache()` shares one scope
 * across a server render; each Route Handler call gets its own.
 */
export const getRequestScope = cache(
  async (): Promise<AppContainer> => (await getContainer()).createScope(),
);
