// Steps of `npm run setup`. Each one gets its side effects injected (see system.mjs),
// returns { skipped: true, reason } when there is nothing to do and throws SetupError
// with a user-facing message when it cannot continue.

import path from "node:path";

const ENV_FILE = ".env";
const ENV_EXAMPLE_FILE = ".env.example";
const PASSWORD_LINE = /^DB_PASSWORD=(.*)$/m;
const QUOTED = /^(["'])(.*)\1$/;
// The only engines.node form the installer understands; anything else fails loudly.
const MINIMUM_RANGE = /^>=\s*(\d+)\.(\d+)\.(\d+)$/;
// 24 random bytes → 32 base64url characters, safe in .env and in a connection URL.
const PASSWORD_BYTES = 24;
// Must match the volume name in compose.yaml.
const DATABASE_VOLUME = "postgres-data";

export class SetupError extends Error {}

const DONE = { skipped: false };

export function checkNodeVersion({ current, required }) {
  const match = required.trim().match(MINIMUM_RANGE);
  if (!match) {
    throw new SetupError(`Nieobsługiwany zakres engines.node w package.json: "${required}". Instalator rozumie tylko ">=X.Y.Z".`);
  }
  // "22.17.0-nightly…" → [22, 17, 0]
  const running = current.split("-")[0].split(".").map(Number);
  if (compareVersions(running, match.slice(1).map(Number)) < 0) {
    throw new SetupError(`Wymagany Node.js ${required}, a uruchomiony jest ${current}. Zaktualizuj Node.js.`);
  }
  return DONE;
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return 0;
}

export function checkDocker({ exec }) {
  if (exec("docker", ["compose", "version"], { capture: true }).status !== 0) {
    throw new SetupError("Nie znaleziono Docker Compose. Zainstaluj Dockera z wtyczką Compose.");
  }
  if (exec("docker", ["info"], { capture: true }).status !== 0) {
    throw new SetupError(
      "Docker nie odpowiada: demon nie działa albo brakuje uprawnień do /var/run/docker.sock " +
        "(na Linuksie dodaj użytkownika do grupy docker). Sprawdź szczegóły: docker info.",
    );
  }
  return DONE;
}

export function installDependencies({ exec }) {
  runOrFail(exec, ["install"], "npm install nie powiódł się. Sprawdź komunikat npm powyżej.");
  return DONE;
}

export function ensureEnvFile({ exec, fs, randomBytes, root }) {
  const envPath = path.join(root, ENV_FILE);
  if (fs.existsSync(envPath)) {
    const line = fs.readFileSync(envPath, "utf8").match(PASSWORD_LINE);
    if (!line) {
      throw new SetupError(`Plik ${ENV_FILE} istnieje, ale nie ma linii DB_PASSWORD. Dopisz ją ręcznie; instalator nie zmienia istniejącego pliku.`);
    }
    if (!line[1].trim().replace(QUOTED, "$2")) {
      throw new SetupError(`Plik ${ENV_FILE} istnieje, ale DB_PASSWORD jest puste. Uzupełnij je ręcznie; instalator nie zmienia istniejącego pliku.`);
    }
    return { skipped: true, reason: `${ENV_FILE} już istnieje` };
  }

  const examplePath = path.join(root, ENV_EXAMPLE_FILE);
  if (!fs.existsSync(examplePath)) {
    throw new SetupError(`Brak pliku ${ENV_EXAMPLE_FILE}. Sprawdź, czy klon repozytorium jest kompletny.`);
  }
  if (databaseVolumeExists(exec)) {
    throw new SetupError(
      `Brak ${ENV_FILE}, ale wolumen bazy już istnieje i ma hasło z poprzedniej konfiguracji. ` +
        `Przywróć poprzedni ${ENV_FILE} albo usuń dane bazy: docker compose down -v (nieodwracalne).`,
    );
  }

  const password = randomBytes(PASSWORD_BYTES).toString("base64url");
  const example = fs.readFileSync(examplePath, "utf8");
  const content = PASSWORD_LINE.test(example)
    ? example.replace(PASSWORD_LINE, `DB_PASSWORD=${password}`)
    : `${example.trimEnd()}\nDB_PASSWORD=${password}\n`;
  // "wx" never overwrites a file created in the meantime; 0o600 keeps the password private.
  try {
    fs.writeFileSync(envPath, content, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new SetupError(`Plik ${ENV_FILE} powstał w trakcie działania instalatora. Uruchom npm run setup ponownie.`);
    }
    throw error;
  }
  return DONE;
}

function databaseVolumeExists(exec) {
  // --no-interpolate: the project name is needed before .env (and its DB_* values) exists.
  const config = exec("docker", ["compose", "config", "--no-interpolate", "--format", "json"], { capture: true });
  if (config.status !== 0) {
    throw new SetupError("Nie udało się odczytać konfiguracji docker compose (compose.yaml).");
  }
  const project = parseProjectName(config.stdout);
  const volumes = exec(
    "docker",
    [
      "volume", "ls", "-q",
      "--filter", `label=com.docker.compose.project=${project}`,
      "--filter", `label=com.docker.compose.volume=${DATABASE_VOLUME}`,
    ],
    { capture: true },
  );
  if (volumes.status !== 0) {
    throw new SetupError("Nie udało się sprawdzić wolumenów Dockera (docker volume ls). Bez tego instalator nie utworzy .env.");
  }
  return volumes.stdout.trim() !== "";
}

function parseProjectName(output) {
  let name;
  try {
    name = JSON.parse(output).name;
  } catch {
    // handled below together with a missing name
  }
  if (typeof name !== "string" || name === "") {
    throw new SetupError("Nie udało się odczytać nazwy projektu z docker compose config. Zaktualizuj Docker Compose.");
  }
  return name;
}

export function startDatabase({ exec }) {
  runOrFail(exec, ["run", "db:up"], "Nie udało się uruchomić PostgreSQL. Jeśli port jest zajęty, zmień DB_PORT w .env.");
  return DONE;
}

export function runMigrations({ exec }) {
  runOrFail(
    exec,
    ["run", "db:migrate"],
    "Migracje nie powiodły się. Jeśli baza odrzuca hasło, wolumen pochodzi z innej konfiguracji: " +
      "przywróć poprzedni .env albo usuń dane bazy przez docker compose down -v (nieodwracalne).",
  );
  return DONE;
}

function runOrFail(exec, npmArgs, message) {
  if (exec("npm", npmArgs).status !== 0) {
    throw new SetupError(message);
  }
}
