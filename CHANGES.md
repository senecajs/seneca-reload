# Changes

## 0.6.0 2026-11-22

First entry of this change log. Earlier versions are on npm and in the git
history.

* Seneca 4: the peer dependency is `seneca` `^4.0.0` (was
  `>=3||>=4.0.0-rc2`). Seneca 3 users stay on `@seneca/reload@0.5`.
* Node.js 24 or later (`engines.node` `>=24`).
* The peer dependency `seneca-promisify` is removed. Seneca 4 has
  promises built in, and the tests no longer load the plugin (D4).
* The file watcher is closed by a `this.destroy` handler when Seneca
  closes, instead of a legacy `role:seneca,cmd:close` hook, which Seneca 4
  reports with the warning `SENECA_DEP_LEGACY_CLOSE_HOOK` (D4).
* The `types` field names `dist/reload.d.ts`, which the package ships. In
  0.5.0 it named `dist/gateway.d.ts`, which does not exist.
* The tests now cover reloading: a child process changes an action file
  and a file that it requires, in a temporary directory, and waits for the
  new result. They also check that the watcher is closed when Seneca
  closes, and the inactive mode (`active: false`).
