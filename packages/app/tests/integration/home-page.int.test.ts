import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, expect, inject, test } from "vitest";

const execFileAsync = promisify(execFile);
const AGENT_BROWSER = path.resolve(import.meta.dirname, "../../../../node_modules/.bin/agent-browser");
// A dedicated session keeps this run's browser state apart from other agents.
const SESSION = `integration-${process.pid}`;

async function agentBrowser(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(AGENT_BROWSER, ["--session", SESSION, ...args]);
  return stdout.trim();
}

afterAll(async () => {
  await agentBrowser("close");
});

test("home page renders in a real browser with the app title", async () => {
  await agentBrowser("open", inject("baseUrl"));

  expect(await agentBrowser("get", "title")).toBe("GoldenLegs");
});
