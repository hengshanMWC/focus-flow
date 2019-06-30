export default {
  // 队列出队
  processNextMessage () {
    if (!(this.queue.length && this.queueExit)) return
    this.start(this.queue.shift())
    if (this.ram) this.processNextMessage()
  },
  /**
	 * 关闭队列，之前的队列会继续执行
	 * @return this
	 */
  closeQueue () {
		this.options.queue = false;
		return this
  },
	/**
	 * 打开队列
	 * @return this
	 */
  openQueue () {
		this.options.queue = true;
		return this		
  },
  /**
	 * 清空队列
	 * @return this
	 */
	emptyQueue () {
		this.queue = [];
		return this
  },
  /**
   * 队列出口封闭
   * @return this
   */
  exportClosed () {
    this.queueExit = false
    return this
  },
  /**
   * 队列出口打开
   * @return this
   */
  exportOpen () {
    this.queueExit = true
    this.processNextMessage()
    return this
  }
}