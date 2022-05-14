
import Reload from '../src/reload'

import Seneca from 'seneca'


describe('reload', () => {

  test('happy', async () => {
    const seneca = Seneca({ legacy: false }).test().use('promisify').use(Reload)
    await seneca.ready()
  })


  test('first-load', async () => {
    const s0 = await Seneca({ legacy: false })
      .test()
      .use('promisify')
      .use(Reload, { active: 'off' !== process.argv[2] })
      .use('./p0')
      .ready()

    expect(await s0.post('role:p0,color:red')).toMatchObject({ color: 'red' })
    expect(await s0.post('role:p0,color:green')).toMatchObject({ color: 'green' })

    await s0.close()
  })
})

