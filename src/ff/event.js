// 参数都是一个实例
export default {
  /**
   * 线程池溢满事件
   * @param {Function} callback 回调函数
   * @param {Object} [hand = this.options.hand] this
   * @return this
   */
  onFull (callback, hand = this.options.hand) {
    callback = this.redirect(callback, hand)
    this.event.full = callback
    return this
  },
  /**
   * 队列溢满事件
   * @param {Function} callback 回调函数
   * @param {Object} [hand = this.options.hand] this
   * @return this
   */
  onQueueFull (callback, hand = this.options.hand) {
    callback = this.redirect(callback, hand)
    this.event.queueFull = callback
    return this
  },
}