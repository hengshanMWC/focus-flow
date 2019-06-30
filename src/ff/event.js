// 参数都是一个实例
export default {
  onFull (callback, hand = this.options.hand) {
    callback = this.redirect(callback, hand)
    this.event.full = callback
    return this
  },
  onQueueFull (callback, hand = this.options.hand) {
    callback = this.redirect(callback, hand)
    this.event.queueFull = callback
    return this
  },
}