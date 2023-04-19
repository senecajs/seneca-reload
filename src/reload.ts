/* Copyright © 2021-2022 Richard Rodger, MIT License. */

import Module from 'module'
import Path from 'path'

import { FSWatcher } from 'chokidar'


function reload(this: any, options: any) {
  let seneca = this

  if (!options.active) {
    return {
      exportmap: {
        make: function(plugin_require: any) {
          let reload = function(path: string) {
            let make_args = [...arguments].slice(1)

            let make = plugin_require(path)
            let action = make(...make_args)

            return action
          }

          return reload
        },
      },
    }
  }

  const orig_require = Module.prototype.require
  const filepaths: any = {}
  const watch = new FSWatcher()
  watch.on('change', clear_require)

  function update_watch() {
    for (let fp in filepaths) {
      if (options.log.watchfile) {
        seneca.log.debug('WATCH', fp)
      }
      watch.add(fp)
    }
  }

  function clear_require() {
    for (let fp in filepaths) {
      if (options.log.watchfile) {
        seneca.log.debug('CLEAR', fp)
      }
      delete require.cache[fp]
    }
  }

  (Module as any).prototype.require = function require(path: string) {
    const target = orig_require.call(this, path)
    const fullpath = (Module as any)._resolveFilename(path, this)

    // TODO: all reload files get flushed - narrow this to each reload call
    if (filepaths[this.filename]) {
      filepaths[fullpath] = 1
    }

    return target
  }


  seneca.add('role:seneca,cmd:close', function(this: any, msg: any, reply: any) {
    const seneca = this
    watch
      .close()
      .then(() => seneca.prior(msg, reply))
      .catch((err) => reply(err))
  })



  return {
    exportmap: {
      make: function(plugin_require: any) {
        return function reload(path: any) {
          let make_args = [...arguments].slice(1)

          let found = false
          let headpath

          try {
            headpath = plugin_require.resolve(path)
            found = true
          }
          catch (e: any) {

            // If not found, watch action path for creation.
            // NOTE: calls to the action will still fail.
            if ('MODULE_NOT_FOUND' === e.code) {
              const searchpaths = plugin_require.resolve.paths(path)
              headpath = Path.join(searchpaths[0], path)
            }
            else {
              throw e
            }
          }

          filepaths[headpath] = 1

          let make
          let action
          let action_name = path.replace(/[^a-bA-B0-9_]/g, '_')

          if (found) {
            make = plugin_require(path)
            action = make(...make_args)
            action_name = action.name
          }

          update_watch()

          let reload = function(this: any) {
            // TODO: avoid doing this on each call
            make = plugin_require(path)
            action = make(...make_args)

            return action.call(this, ...arguments)
          }

          Object.defineProperty(reload, 'name', {
            value: 'reload_' + action_name,
          })

          return reload
        }
      },
    },
  }
}


reload.defaults = {
  active: true, // NOTE: set to false for production!
  log: {
    watchfile: false
  }
}


export default reload

if ('undefined' !== typeof (module)) {
  module.exports = reload
}
