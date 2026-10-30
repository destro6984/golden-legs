import { connection } from "next/server";
import { getRequestScope } from "@/lib/container";

export async function GET() {
  // Always answer at request time; never prerender a database check.
  await connection();
  try {
    const scope = await getRequestScope();
    await scope.resolve("em").getConnection().execute("select 1");
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
