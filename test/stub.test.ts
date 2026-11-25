import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunningHost } from "@weivel/typescript/program";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { bundled, homeWith, hostIn, loggedIn, realPlacesSnapshot, type Home } from "./fixtures/home.js";

const realBefore = await realPlacesSnapshot();
const RUN_BOUND = 60_000;

interface Actions {
  greet(): Promise<{ greeting: string }>;
}

let bundles: string;
let stubBundle: string;
const homes: Home[] = [];
const hosts: RunningHost[] = [];

async function home(settings: Record<string, unknown> = {}): Promise<Home> {
  const made = await homeWith(stubBundle, settings);
  homes.push(made);
  return made;
}

async function serving(made: Home): Promise<RunningHost> {
  const host = await hostIn(made);
  hosts.push(host);
  return host;
}

function actionsOf(host: RunningHost): Actions {
  const actions = host.service<Actions>("plugin-stub", "plugin-stub:actions");
  if (actions === undefined) throw new Error("plugin-stub registered no actions service");
  return actions;
}

async function action(made: Home, name: string): Promise<number> {
  const host = await hostIn(made, ["action", "plugin-stub", name, "{}"]);
  return host.ended;
}

beforeAll(async () => {
  bundles = mkdtempSync(join(tmpdir(), "stub-bundles-"));
  stubBundle = await bundled(join(bundles, "stub"));
}, RUN_BOUND);

afterEach(async () => {
  for (const host of hosts.splice(0)) await host.stop();
  for (const made of homes.splice(0)) made.remove();
});

afterAll(() => rmSync(bundles, { recursive: true, force: true }));

describe("plugin-stub under the host program, over runtime in a temporary home", () => {
  it("greets with the default greeting of its manifest", async () => {
    const host = await serving(await home());

    expect(await actionsOf(host).greet()).toEqual({ greeting: "hello" });
  }, RUN_BOUND);

  it("greets with the greeting its settings hold", async () => {
    const host = await serving(await home({ greeting: "good evening" }));

    expect(await actionsOf(host).greet()).toEqual({ greeting: "good evening" });
  }, RUN_BOUND);

  it("refuses a greeting setting that is not a text", async () => {
    const host = await serving(await home({ greeting: 5 }));

    await expect(actionsOf(host).greet()).rejects.toThrow("greeting");
  }, RUN_BOUND);

  it("runs the greet action through the program's ACTION mode and refuses one it does not declare", async () => {
    const made = await home();

    const greeted = await action(made, "greet");
    const unknown = await action(made, "no-such-action");

    expect(greeted).toBe(0);
    expect(unknown).not.toBe(0);
  }, RUN_BOUND);

  it("logs the greeting while its logging setting is on", async () => {
    const made = await home({ greeting: "logged greeting" });
    const host = await serving(made);

    await actionsOf(host).greet();
    await host.stop();

    expect(loggedIn(made)).toContain("plugin-stub greeted: logged greeting");
  }, RUN_BOUND);

  it("logs nothing of the greeting once its logging setting is off", async () => {
    const made = await home({ greeting: "unlogged greeting", logging: false });
    const host = await serving(made);

    await actionsOf(host).greet();
    await host.stop();

    expect(loggedIn(made)).not.toContain("unlogged greeting");
  }, RUN_BOUND);

  it("left the real home's places as they were", async () => {
    expect(await realPlacesSnapshot()).toEqual(realBefore);
  });
});
