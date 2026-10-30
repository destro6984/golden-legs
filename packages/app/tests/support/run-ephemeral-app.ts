import { startEphemeralApp } from "./ephemeral-app";

// `npm run app:ephemeral`: a throwaway app + database for manual or agent testing.
const app = await startEphemeralApp();
console.log(`GoldenLegs is running at ${app.url}`);
console.log(`Try: npx agent-browser open ${app.url} && npx agent-browser snapshot`);
console.log("Press Ctrl+C to stop and remove the database.");

let isStopping = false;
async function shutdown(): Promise<void> {
  if (isStopping) {
    return;
  }
  isStopping = true;
  await app.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
