

// TODO: turn it off via an option for production

const Module = require('module')

const { FSWatcher } = require('chokidar')


const orig_require = Module.prototype.require
const filepaths = {}
const watch = new FSWatcher()
watch.on('change', clear_require)


Module.prototype.require = function require(path) {
  const target = orig_require.call(this, path)
  const fullpath = Module._resolveFilename(path, this)

  // TODO: all reload files get flushed - narrow this to each reload call
  if(filepaths[this.filename]) {
    filepaths[fullpath]=1
  }

  return target
}



module.exports = function reload(options) {
  return {
    exportmap: {
      make: function(plugin_require) {
        return function reload(path) {
          let make_args = [...arguments].slice(1)
          headpath = plugin_require.resolve(path)
          filepaths[headpath]=1

          let reloading_action = function() {
            // TODO: avoid doing this on each call
            let make = plugin_require(path)
            update_watch()

            let action = make(...make_args)
            return action.call(this, ...arguments)
          }

          return reloading_action
        }
      }
    }
  }
}


function update_watch() {
  for(fp in filepaths) {
    console.log('WATCH',fp)
    watch.add(fp)
  }
}

function clear_require() {
  for(fp in filepaths) {
    console.log('CLEAR',fp)
    delete require.cache[fp]
  }
}
