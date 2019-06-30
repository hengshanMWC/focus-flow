import FocusFlow from './ff/constructor'
import pond from './ff/pond'
import threads from './ff/threads'
import transfer from './ff/transfer'
import event from './ff/event'
import queue from './ff/queue'
let prototype = FocusFlow.prototype
const obj = {
  ...pond,
  ...threads,
  ...transfer,
  ...event,
  ...queue,
}
Object.keys(obj).forEach(key => {
  Object.defineProperty(prototype, key, {
    value: obj[key]
  })
})
export default FocusFlow