// Run by test/reload.test.ts in a plain Node process, so that the plugin
// clears Node's own module cache (jest has its own module registry).
// Usage: node test/reload-child.js <temporary directory>
// Needs the build: the plugin is loaded from the package main, dist/reload.js.

const Fs = require('node:fs')
const Path = require('node:path')

const Seneca = require('seneca')
const Reload = require('..')

const dir = process.argv[2]
const actfile = Path.join(dir, 'act.js')
const depfile = Path.join(dir, 'dep.js')

// Generous, for a loaded machine. Normally a change is seen in milliseconds.
const DEADLINE = 30000


function write_act(v) {
  Fs.writeFileSync(
    actfile,
    "const dep = require('./dep.js')\n" +
    'module.exports = function make_act(arg) {\n' +
    '  return async function act(msg) {\n' +
    '    return { v: ' + v + ', dep: dep.d, arg }\n' +
    '  }\n' +
    '}\n'
  )
}


function write_dep(d) {
  Fs.writeFileSync(depfile, 'module.exports = { d: ' + d + ' }\n')
}


function step(step, out) {
  console.log('STEP ' + JSON.stringify(null == out ? { step } : { step, out }))
}


// Rewrite the file and call the action until the result changes. Each
// round writes the file again, because the watcher only sees changes made
// after it is ready, and that point is not observable from outside.
async function until(seneca, name, change, done) {
  const start = Date.now()
  for (; ;) {
    change()
    const out = await seneca.post('a:1')
    if (done(out)) {
      return out
    }
    if (DEADLINE < Date.now() - start) {
      throw new Error('no reload after ' + name + ': ' + JSON.stringify(out))
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}


async function run() {
  write_dep(1)
  write_act(1)

  const seneca = Seneca({ legacy: false })
    .test()
    .use(Reload)
    .use(function p0() {
      const reload = this.export('reload/make')(require)
      this.message('a:1', reload(actfile, 'A'))
    })

  await seneca.ready()

  step('load', clean(await seneca.post('a:1')))

  step('action-change', clean(await until(seneca, 'action change',
    () => write_act(2), (out) => 2 === out.v)))

  step('dependency-change', clean(await until(seneca, 'dependency change',
    () => write_dep(2), (out) => 2 === out.dep)))

  await seneca.close()
  step('closed')

  // No process.exit: the process ends only when nothing, such as an open
  // file watcher, keeps it alive.
}


function clean(out) {
  return { v: out.v, dep: out.dep, arg: out.arg }
}


run().catch((err) => {
  console.error(err)
  process.exit(1)
})
