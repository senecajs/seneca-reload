

module.exports = function p0(options) {
  let seneca = this

  let reload = seneca.export('reload/make')(require)

  let z = -1
  
  seneca
    .fix('role:p0')
    .message('color:red', reload('./p0/red.js',z))
    .message('color:green', reload('./p0/green.js'))
  
}
