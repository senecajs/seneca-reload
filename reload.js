const Module = require('module')

const { FSWatcher } = require('chokidar')

module.exports = reload

module.exports.defaults = {
  active: true, // NOTE: set to false for production!
}

function reload(options) {
  let seneca = this

  if (!options.active) {
    return {
      exportmap: {
        make: function (plugin_require) {
          let reload = function (path) {
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
  const filepaths = {}
  const watch = new FSWatcher()
  watch.on('change', clear_require)

  function update_watch() {
    for (fp in filepaths) {
      seneca.log.debug('WATCH', fp)
      watch.add(fp)
    }
  }

  function clear_require() {
    for (fp in filepaths) {
      seneca.log.debug('CLEAR', fp)
      delete require.cache[fp]
    }
  }

  Module.prototype.require = function require(path) {
    const target = orig_require.call(this, path)
    const fullpath = Module._resolveFilename(path, this)

    // TODO: all reload files get flushed - narrow this to each reload call
    if (filepaths[this.filename]) {
      filepaths[fullpath] = 1
    }

    return target
  }

  return {
    exportmap: {
      make: function (plugin_require) {
        return function reload(path) {
          let make_args = [...arguments].slice(1)
          headpath = plugin_require.resolve(path)
          filepaths[headpath] = 1

          let make = plugin_require(path)
          let action = make(...make_args)

          update_watch()

          let reload = function () {
            // TODO: avoid doing this on each call
            make = plugin_require(path)
            action = make(...make_args)

            return action.call(this, ...arguments)
          }

          Object.defineProperty(reload, 'name', {
            value: 'reload_' + action.name,
          })

          return reload
        }
      },
    },
  }
}
