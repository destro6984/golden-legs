import { describe, expect, it } from "vitest";
import { createLogger, logger } from "./logger";

function captureLogs() {
  const lines: Record<string, unknown>[] = [];
  const destination = { write: (line: string) => lines.push(JSON.parse(line)) };
  return { lines, log: createLogger(destination) };
}

describe("createLogger", () => {
  it("writes structured JSON with the message and context", () => {
    const { lines, log } = captureLogs();

    log.info({ path: "/api/health" }, "request handled");

    expect(lines).toEqual([expect.objectContaining({ msg: "request handled", path: "/api/health" })]);
  });

  it("redacts credentials at the top level and one level deep", () => {
    const { lines, log } = captureLogs();

    log.info({ password: "p1", user: { token: "t1", cookie: "c1", name: "ada" } }, "login");

    expect(lines[0]).toMatchObject({
      password: "[redacted]",
      user: { token: "[redacted]", cookie: "[redacted]", name: "ada" },
    });
  });

  it("writes to stdout when no destination is given", () => {
    expect(logger.info).toBeTypeOf("function");
    expect(createLogger().level).toBe("info");
  });
});
