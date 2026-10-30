import type { AwilixContainer } from "awilix";

export const APP_NAME = "GoldenLegs";

/**
 * Dependencies registered in the DI container. Each package adds its own
 * entries through declaration merging:
 *
 *   declare module "@golden-legs/core" {
 *     interface Cradle { orm: MikroORM }
 *   }
 *
 * Declared here, not re-exported, because augmenting a re-exported
 * interface is unreliable in TypeScript.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Cradle {}

export type AppContainer = AwilixContainer<Cradle>;
