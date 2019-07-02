// 队列出队
function processNextMessage () {
  if (!(this.queue.length && this.queueExit)) return
  this.start(this.queue.shift())
  if (this.ram) this.processNextMessage()
}
/**
 * 关闭队列入口
 * @return this
 */
function closeQueue () {
  this.options.queue = false;
  return this
}
/**
 * 打开队列入口
 * @return this
 */
function openQueue () {
  this.options.queue = true;
  return this		
}
/**
 * 清空队列
 * @return this
 */
function emptyQueue () {
  this.queue = [];
  return this
}
/**
 * 关闭队列出口
 * @return this
 */
function closeExit () {
  this.queueExit = false
  return this
}
/**
 * 打开队列出口
 * @return this
 */
function openExit () {
  this.queueExit = true
  this.processNextMessage()
  return this
}
export default {
  processNextMessage,
  closeQueue,
  openQueue,
	emptyQueue,
  closeExit,
  openExit
}