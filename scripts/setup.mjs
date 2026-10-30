// `npm run setup`: prepares a local GoldenLegs environment. Plain Node with no
// dependencies, because it runs before `npm install`.

import { runSetup } from "./setup/run-setup.mjs";
import { createSystem } from "./setup/system.mjs";

process.exitCode = runSetup(createSystem());
