import FocusFlow from './ff/constructor'
import pond from './ff/pond'
import threads from './ff/threads'
let prototype = FocusFlow.prototype
const obj = {
  ...pond,
  ...threads
}
Object.keys(obj).forEach(key => {
  Object.defineProperty(prototype, key, {
    value: obj[key]
  })
})
export default FocusFlow