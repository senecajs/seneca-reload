const Seneca = require('seneca')

let s0 = Seneca({ legacy: false, log: 'flat' })

s0.use('promisify')
  .use('repl')
  .use('..', { active: false })
  .use('./p0')
  .act('role:p0,color:red', s0.util.print)
  .act('role:p0,color:green', s0.util.print)
