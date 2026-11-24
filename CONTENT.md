The smallest real weivel plugin, kept as a GitHub template another plugin starts from. It registers one service,
declares one action that calls it, and reads two settings, so a new plugin begins from something that already loads
under the host program and passes its tests.

## What it is not

It provides no capability and does nothing useful: `greet` answers a configured text. It is not a library to depend
on, and nothing should consume its `plugin-stub:actions` service. For a plugin that provides a forebay contract, start
from `forebay/provider-stub` instead.

## Structure

- `plugin.json`: the manifest. It consumes the standard services `weivel.config` and `weivel.log`, provides
  `plugin-stub:actions`, declares the `greet` action calling that service's `greet` method, and gives the defaults
  of the `logging` and `greeting` settings.
- `src/plugin.ts`: `activate` reaches both standard services and registers `plugin-stub:actions`.
- `src/actions.ts`: the service. `greet` reads the `greeting` setting afresh, writes it to the plugin's log and
  answers `{ greeting }`. The runtime honours `logging` itself, so the plugin never reads it.
- `src/contract.ts`: the binding's shapes of the two standard services, only the members this plugin calls.

## Testing

`npm test` builds `runtime` from `siblings/library` (`scripts/native.ts`), builds, type-checks and runs vitest.
`test/stub.test.ts` bundles the plugin and starts the real `runtime` over a temporary home with
`@weivel/typescript`'s host program: it calls the service, runs `greet` through the program's ACTION mode, reads the
log the run wrote, and checks the real home's places were left as they were.

## Start from this template

Create a repository from this template, then rename every identifier below:

- `plugin-stub`: `importName` and `id` in `plugin.json`, `importName` in `repo.json`, `name` and the repository
  URL in `package.json`, the plugin id in `test/stub.test.ts`, the error and log texts in `src/plugin.ts` and
  `src/actions.ts`, and `unscoped_name` in `.github/workflows/release.yml`.
- `plugin-stub:actions`: the service id in `plugin.json` (`services.provides` and every action's `call.service`),
  `ACTIONS_SERVICE` in `src/plugin.ts`, and the lookup in `test/stub.test.ts`.
- `greet` and `greeting`: the action, its method and its setting, in `plugin.json`, `src/actions.ts` and the tests.
- `StubActions` and `stubActions` in `src/actions.ts`, `displayName` and `repo` in `plugin.json`, `description`,
  `topics` and `keywords` in `repo.json` and `package.json`, and `description` in `.github/docs-config.yml`.
- `stub-home-` and `stub-bundles-`, the temporary folder prefixes in `test/fixtures/home.ts` and `test/stub.test.ts`.

Keep `repo.json`'s `dependencies`: they pin the `weivel/typescript` binding and `spisor/library`'s runtime the
tests run on. Add a service id to `services.consumes` for every service the plugin reaches.
