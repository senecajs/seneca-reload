
const Seneca = require('seneca')

let s0 = Seneca({legacy:false})

s0
  .use('promisify')
  .use('repl')
  .use('..')
  .use('./p0')
  .act('role:p0,color:red', s0.util.print)
  .act('role:p0,color:green', s0.util.print)

