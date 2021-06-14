
module.exports = function make_red(z) {
  return async function red(msg) {
    return {color:msg.color,x:111,z}
  }
}
