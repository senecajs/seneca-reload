"use strict";
/* Copyright © 2021-2022 Richard Rodger, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const module_1 = __importDefault(require("module"));
const path_1 = __importDefault(require("path"));
const chokidar_1 = require("chokidar");
function reload(options) {
    let seneca = this;
    if (!options.active) {
        return {
            exportmap: {
                make: function (plugin_require) {
                    let reload = function (path) {
                        let make_args = [...arguments].slice(1);
                        let make = plugin_require(path);
                        let action = make(...make_args);
                        return action;
                    };
                    return reload;
                },
            },
        };
    }
    const orig_require = module_1.default.prototype.require;
    const filepaths = {};
    const watch = new chokidar_1.FSWatcher();
    watch.on('change', clear_require);
    function update_watch() {
        for (let fp in filepaths) {
            if (options.log.watchfile) {
                seneca.log.debug('WATCH', fp);
            }
            watch.add(fp);
        }
    }
    function clear_require() {
        for (let fp in filepaths) {
            if (options.log.watchfile) {
                seneca.log.debug('CLEAR', fp);
            }
            delete require.cache[fp];
        }
    }
    module_1.default.prototype.require = function require(path) {
        const target = orig_require.call(this, path);
        const fullpath = module_1.default._resolveFilename(path, this);
        // TODO: all reload files get flushed - narrow this to each reload call
        if (filepaths[this.filename]) {
            filepaths[fullpath] = 1;
        }
        return target;
    };
    seneca.add('role:seneca,cmd:close', function (msg, reply) {
        const seneca = this;
        watch
            .close()
            .then(() => seneca.prior(msg, reply))
            .catch((err) => reply(err));
    });
    return {
        exportmap: {
            make: function (plugin_require) {
                return function reload(path) {
                    let make_args = [...arguments].slice(1);
                    let found = false;
                    let headpath;
                    try {
                        headpath = plugin_require.resolve(path);
                        found = true;
                    }
                    catch (e) {
                        // If not found, watch action path for creation.
                        // NOTE: calls to the action will still fail.
                        if ('MODULE_NOT_FOUND' === e.code) {
                            const searchpaths = plugin_require.resolve.paths(path);
                            headpath = path_1.default.join(searchpaths[0], path);
                        }
                        else {
                            throw e;
                        }
                    }
                    filepaths[headpath] = 1;
                    let make;
                    let action;
                    let action_name = path.replace(/[^a-bA-B0-9_]/g, '_');
                    if (found) {
                        make = plugin_require(path);
                        action = make(...make_args);
                        action_name = action.name;
                    }
                    update_watch();
                    let reload = function () {
                        // TODO: avoid doing this on each call
                        make = plugin_require(path);
                        action = make(...make_args);
                        return action.call(this, ...arguments);
                    };
                    Object.defineProperty(reload, 'name', {
                        value: 'reload_' + action_name,
                    });
                    return reload;
                };
            },
        },
    };
}
reload.defaults = {
    active: true,
    log: {
        watchfile: false
    }
};
exports.default = reload;
if ('undefined' !== typeof (module)) {
    module.exports = reload;
}
//# sourceMappingURL=reload.js.map