// The only package that imports @mikro-orm/*; other packages use these re-exports.
export type { EntityManager, MikroORM } from "@mikro-orm/postgresql";
export { getOrm } from "./orm";
export { pingDatabase } from "./health";
export { entities } from "./entities";
