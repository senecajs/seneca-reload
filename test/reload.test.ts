
import ChildProcess from 'node:child_process'
import Fs from 'node:fs'
import Os from 'node:os'
import Path from 'node:path'

import { FSWatcher } from 'chokidar'
import Seneca from 'seneca'

import Reload from '../src/reload'


describe('reload', () => {

  test('happy', async () => {
    const seneca = Seneca({ legacy: false }).test().use(Reload)
    await seneca.ready()
    await seneca.close()
  })


  test('first-load', async () => {
    const s0 = await Seneca({ legacy: false })
      .test()
      .use(Reload, { active: 'off' !== process.argv[2] })
      .use('./p0')
      .ready()

    expect(await s0.post('role:p0,color:red')).toMatchObject({ color: 'red' })
    expect(await s0.post('role:p0,color:green')).toMatchObject({ color: 'green' })

    await s0.close()
  })


  test('inactive', async () => {
    const s0 = await Seneca({ legacy: false })
      .test()
      .use(Reload, { active: false })
      .use('./p0')
      .ready()

    expect(await s0.post('role:p0,color:red'))
      .toMatchObject({ color: 'red', x: 1111, z: -1 })
    expect(await s0.post('role:p0,color:green'))
      .toMatchObject({ color: 'green', g: 1, x: 22 })

    await s0.close()
  })


  test('close-stops-watching', async () => {
    const close = jest.spyOn(FSWatcher.prototype, 'close')
    try {
      const s0 = await Seneca({ legacy: false })
        .test()
        .use(Reload)
        .use('./p0')
        .ready()

      expect(close).not.toHaveBeenCalled()
      await s0.close()
      expect(close).toHaveBeenCalledTimes(1)
    }
    finally {
      close.mockRestore()
    }
  })


  // Jest has its own module registry, so the plugin cannot clear cached
  // modules inside a jest test. This test runs test/reload-child.js in a
  // plain Node process instead, against files in a temporary directory.
  // The child changes the files, polls until the action returns the new
  // result (no fixed sleeps), closes Seneca, and must then exit by itself,
  // which it can only do once the file watcher is closed.
  test('reload-on-change', async () => {
    const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'seneca-reload-'))
    try {
      const res = await run_child(dir, 60000)

      if (0 !== res.code) {
        console.log(res)
      }
      expect(res.signal).toBeNull()
      expect(res.code).toEqual(0)

      const steps = res.stdout
        .split('\n')
        .filter((line: string) => line.startsWith('STEP '))
        .map((line: string) => JSON.parse(line.substring(5)))

      expect(steps).toEqual([
        { step: 'load', out: { v: 1, dep: 1, arg: 'A' } },
        { step: 'action-change', out: { v: 2, dep: 1, arg: 'A' } },
        { step: 'dependency-change', out: { v: 2, dep: 2, arg: 'A' } },
        { step: 'closed' },
      ])

      // The plugin uses this.destroy, not the legacy close hook.
      expect(res.stderr).not.toMatch(/SENECA_DEP|DeprecationWarning/)
    }
    finally {
      Fs.rmSync(dir, { recursive: true, force: true })
    }
  }, 90000)
})


function run_child(dir: string, deadline: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = ChildProcess.spawn(
      process.execPath,
      ['--trace-deprecation', Path.join(__dirname, 'reload-child.js'), dir],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => stdout += chunk)
    child.stderr.on('data', (chunk) => stderr += chunk)

    // Only reached if the child hangs, for example because the watcher
    // is still open after close.
    const timer = setTimeout(() => child.kill('SIGKILL'), deadline)

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal, stdout, stderr })
    })
  })
}
