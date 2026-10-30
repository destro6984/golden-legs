import { connection } from "next/server";
import { apiHandler, withScope } from "@golden-legs/core";

export const GET = apiHandler(async () => {
  // Always answer at request time; never prerender a database check.
  await connection();
  return withScope(({ healthService }) => healthService.check());
});
