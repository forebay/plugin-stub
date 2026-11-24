/**
 * The shapes weivel/typescript's binding gives the standard services this plugin calls: each operation one async
 * method taking its input parameters by name. Only the members this plugin calls are named.
 */

/** The standard `weivel.config` service: this plugin's settings, its stored values laid over its manifest's defaults. */
export interface Config {
  /** Answers the setting under `key`, or a symbol when there is none. */
  get_tree(input: { key: string }): Promise<unknown>;
}

/** The standard `weivel.log` service, which writes to this plugin's log file while its `logging` setting is on. */
export interface Log {
  write(input: { level: number; message: string }): Promise<void>;
}

export const WEIVEL_LOG = { INFO: 3 } as const;
