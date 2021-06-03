
const d0 = require('./d0')

module.exports = function make_green() {
  return async function green(msg) {
    return {g:1,...d0.green(msg)}
  }
}
