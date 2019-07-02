// 参数都是一个实例
/**
 * 线程池溢满事件
 * callback(ctx, FocusFlow)
 * @param {Function} callback 回调函数
 * @param {Object} [hand = this.options.hand] this
 * @return this
 */
function onFull (callback, hand = this.options.hand) {
  callback = this.redirect(callback, hand)
  this.event.full = callback
  return this
}
/**
 * 队列溢满事件
 * callback(ctx, FocusFlow)
 * @param {Function} callback 回调函数
 * @param {Object} [hand = this.options.hand] this
 * @return this
 */
function onQueueFull (callback, hand = this.options.hand) {
  callback = this.redirect(callback, hand)
  this.event.queueFull = callback
  return this
}
export default {
  onFull,
  onQueueFull,
}