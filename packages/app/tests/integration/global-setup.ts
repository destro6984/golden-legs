import type { TestProject } from "vitest/node";
import { startEphemeralApp } from "../support/ephemeral-app";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const app = await startEphemeralApp();
  project.provide("baseUrl", app.url);
  return app.stop;
}
