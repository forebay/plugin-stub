import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { bundlePlugin } from "@weivel/typescript/bundle";
import { startHost, type RunningHost } from "@weivel/typescript/program";
import { scratchHome, type PlacedLibrary, type ScratchFile } from "@weivel/typescript/testing";

export const REPOSITORY = resolve(import.meta.dirname, "..", "..");
export const HOST_ID = "test-host";

const NATIVE = join(REPOSITORY, "native");

/** The stub's manifest as `plugin.json` holds it. */
export type Manifest = { readonly id: string; readonly version: string; readonly entry: string } & Record<string, unknown>;

export interface Home {
  readonly base: string;
  readonly runtime: string;
  /** Puts the process's places back as they were and deletes the home. */
  remove(): void;
}

function places(base: string): Record<string, string> {
  return {
    SPISOR_HOME: join(base, "portable"),
    SPISOR_STATE: join(base, "state"),
    SPISOR_CACHE: join(base, "cache"),
    SPISOR_SECRETS: join(base, "secrets"),
    HOME: join(base, "user"),
    USERPROFILE: join(base, "user"),
  };
}

function installFiles(base: string, manifest: Manifest, bundle: string, settings: Record<string, unknown>): ScratchFile[] {
  const installed = join(base, "cache", "bundles", manifest.id, manifest.version);
  return [
    { path: join(installed, "plugin.json"), content: manifest },
    { path: join(installed, manifest.entry), copyFrom: bundle },
    { path: join(installed, ".installed.json"), content: { files: {} } },
    { path: join(base, "application", "config", `${manifest.id}.json`), content: settings },
  ];
}

function homeFiles(base: string, libraries: Readonly<Record<string, PlacedLibrary>>, bundle: string, settings: Record<string, unknown>): ScratchFile[] {
  const manifest = stubManifest();
  const catalog = join(base, "catalog", "index.json");
  return [
    { path: catalog, content: { format: 1, items: {} } },
    { path: join(base, "state", "hosts", `${HOST_ID}.json`), content: { id: HOST_ID, kind: "host", version: "1.0.0", home: join(base, "application") } },
    { path: join(base, "state", "processes", `${HOST_ID}.json`), content: { pid: null, holders: [process.pid] } },
    {
      path: join(base, "cache", "hosts", "javascript-host.json"),
      content: { host: "2.0.0", libraries: { runtime: { version: "0.2.0", ...libraries.runtime }, koffi: { version: "2.0.0", directory: join(base, "koffi") } } },
    },
    ...installFiles(base, manifest, bundle, settings),
    { path: join(base, "application", "config", "settings.json"), content: { plugins: { [manifest.id]: { enabled: true } }, catalog: { sources: [{ kind: "local", path: catalog }] } } },
  ];
}

/**
 * Lays out a fresh home under the temporary directory, as an install leaves one: the registered loader `test-host`,
 * the javascript-host's hint naming runtime, the stub installed and enabled with `settings` over its defaults, and this
 * process recorded as the loader's holder, so a SERVE run keeps running. The process's places point into it until `remove`.
 */
export function homeWith(bundle: string, settings: Record<string, unknown> = {}): Home {
  const home = scratchHome({
    prefix: "stub-home-",
    libraries: { runtime: join(NATIVE, "runtime") },
    environment: places,
    files: (base, libraries) => homeFiles(base, libraries, bundle, settings),
  });
  return { base: home.base, runtime: home.libraries.runtime!.binary, remove: home.remove };
}

export function stubManifest(): Manifest {
  return JSON.parse(readFileSync(join(REPOSITORY, "plugin.json"), "utf8"));
}

/** Bundles the stub's entry into one module, as a plugin's build does, under `directory`. */
export function bundled(directory: string): Promise<string> {
  return bundlePlugin(join(REPOSITORY, "src", "plugin.ts"), directory);
}

/** Starts the host program over `home` with these arguments after the loader id, its log kept quiet. */
export function hostIn(home: Home, actionArguments: readonly string[] = []): Promise<RunningHost> {
  const quiet = (): void => undefined;
  return startHost({ hostLibraryPath: home.runtime, arguments: [HOST_ID, ...actionArguments], log: { debug: quiet, info: quiet, warn: quiet, error: quiet } });
}

/** Every line the log files in `home` hold, readable once the run stopped and its writer wrote them. */
export function loggedIn(home: Home): string {
  const files = readdirSync(home.base, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".log"));
  return files.map((file) => readFileSync(join(home.base, file), "utf8")).join("\n");
}

/** The places runtime resolves for this user with no override set, read before any home moves `HOME`. */
function realPlaces(): string[] {
  const user = homedir();
  const portable = join(user, ".spisor");
  if (process.platform === "win32") return [portable, join(process.env.LOCALAPPDATA ?? join(user, "AppData", "Local"), "spisor")];
  if (process.platform === "darwin") return [portable, join(user, "Library", "Application Support", "spisor"), join(user, "Library", "Caches", "spisor")];
  return [portable, join(process.env.XDG_STATE_HOME ?? join(user, ".local", "state"), "spisor"), join(process.env.XDG_CACHE_HOME ?? join(user, ".cache"), "spisor")];
}

function filesUnder(directory: string): string[] {
  try {
    return readdirSync(directory, { recursive: true, encoding: "utf8" }).map((file) => {
      const status = statSync(join(directory, file));
      return `${join(directory, file)} ${status.size} ${status.mtimeMs}`;
    });
  } catch {
    return [];
  }
}

/** Every file in the real places, each with its size and modified time. */
export function realPlacesSnapshot(): readonly string[] {
  return realPlaces().flatMap(filesUnder).sort();
}
