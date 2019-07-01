import Thread from '../plugin/thread'
/**
 * 判断线程池是否满员，满员则清除失活的线程
 * @return {Boolean}
 */
function inspect () {
	if (!this.ram) {
		return !this.clean()
	}
	return false
}
/**
 * 关闭线程池，之前的线程会继续执行
 * @return this
 */
function close () {
	this.options.switch = false;
	return this
}
/**
 * 打开线程池
 * @return this
 */
function open () {
	this.options.switch = true;
	this.processNextMessage()
	return this		
}
/**
 * 创建线程
 * @param {Object} ctx 上下文
 * @return {Thread}
 * @private
 */
function newThread (ctx) {
	let thread = new Thread(this, ctx)
	this.threads.push(thread)
	return thread
}
/**
 * 关闭线程(关闭后还会继续执行后面next的方法)
 * @param {Thread} thread 
 * @private
 */
function closeThread (thread) {
	let index = this.threads.findIndex( obj => obj === thread)
	this.threads.splice(index, 1 + index)
	this.processNextMessage()
}
/**
 * 清空线程池，剩余的线程会执行完
 * @return this
 */
function emptyThreads () {
	this.threads = [];
	this.processNextMessage()
	return this
}
/**
 * 清理过期的线程
 * @return {Boolean} 是否有过期的线程被清理
 */
function clean () {
	let oldLen = this.threads.length
	this.threads = this.threads.filter(thread => thread.ctx.$info.life > Date.now())
	return oldLen < this.threads.length
}
export default {
	inspect,
  close,
  open,
	newThread,
  closeThread,
	emptyThreads,
	clean,
}