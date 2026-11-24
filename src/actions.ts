import { WEIVEL_LOG, type Config, type Log } from "./contract.js";

/** The service `plugin-stub:actions`, whose methods the manifest's actions call. */
export interface StubActions {
  greet(): Promise<{ greeting: string }>;
}

/** Reads the setting afresh on every call, so a change made while the host runs applies to the next greet. */
async function greetingOf(config: Config): Promise<string> {
  const value = await config.get_tree({ key: "greeting" });
  if (typeof value !== "string") throw new Error("the greeting setting of plugin-stub must be a text");
  return value;
}

/** `greet` answers the configured greeting and logs that it did. */
export function stubActions(config: Config, log: Log): StubActions {
  return {
    async greet() {
      const greeting = await greetingOf(config);
      await log.write({ level: WEIVEL_LOG.INFO, message: `plugin-stub greeted: ${greeting}` });
      return { greeting };
    },
  };
}
