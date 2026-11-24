import type { PluginContext } from "@weivel/typescript/context";
import type { Plugin } from "@weivel/typescript/host";
import { stubActions } from "./actions.js";
import type { Config, Log } from "./contract.js";

const ACTIONS_SERVICE = "plugin-stub:actions";

function required<Service>(context: PluginContext, id: string): Service {
  const service = context.services.get(context.service<Service>(id));
  if (service === undefined) throw new Error(`plugin-stub reaches no ${id} service`);
  return service;
}

const plugin: Plugin = {
  activate(context) {
    const config = required<Config>(context, "weivel.config");
    const log = required<Log>(context, "weivel.log");
    context.services.register(context.service(ACTIONS_SERVICE), stubActions(config, log));
  },
  deactivate() {},
};

export default plugin;
