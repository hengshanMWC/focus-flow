/**
 * 执行管道流
 * @param {any} ctx object上下文内容|any管道标记
 * @param {any} sign object上下文内容|any管道标记
 * @return this 
 */
function start (ctx, sign) {
	if(typeof ctx !== 'object'){
		[ ctx, sign ] = [ sign, ctx ]
	}
	if (this.spill(ctx, sign)) return this
	let thread = this.newThread(ctx)
	thread.next(sign)
	return this
}
/**
 * 目标管道，有则进入，没有则下一个
 * @param {Thread} thread 
 * @param {String|Number} sign 
 * @private
 */
function nextStart (thread, sign) {
	let index = this.matching(sign)
	if(index === -1){
		thread.ctx.$info.index = thread.onceZero 
			? 0
			: thread.ctx.$info.index++
	} else {
		thread.ctx.$info.index = index
	}
	if (thread.onceZero) thread.onceZero = false
	this.run(thread)
}
/**
 * 执行管道
 * @param {Thread} thread 
 * @param {Boolean} state 
 * @private
 */
async function run (thread, state) {
	let pond = this.pond
	let ctx = thread.ctx
	let surplus = ctx.$info.index < pond.length
	try {
		if(ctx.$info.index === null){
			//为null则end
			await this.basic.end(thread)
		} else if(state === false){
			//管道失败
			await this.basic.fail(thread);
		} else if(!surplus || state === true){
			//管道完成
			await this.basic.success(thread);
		} else if (surplus){
			//还有管道
			pond[ctx.$info.index++].callback(ctx, thread.$next, thread.$close)
		}
	} catch(error) {
		this.basic.error(error, thread)
	}
}
/**
 * 判断是否可执行
 * @param {Object} ctx 上下文内容
 * @param {any} sign 管道标记
 * @return {Boolean}  
 * @private
 */
function spill (ctx, sign) {
	if(this.inspect()) {
		typeof this.event.full === 'function' && this.event.full(ctx, this)
		if (this.queueFull) {
			this.queue.push({ctx, sign})
		} else if (this.options.queue && typeof this.event.queueFull === 'function') {
				this.event.queueFull(ctx, this)
		}
		return true
	}
	return false
}
/**
 * 通过标记获取管道下标,如果是Number则直接返回
 * @param {String|Number} sign 标记
 * @return {Number}
 * @private
 */
function matching (sign) {
	let pond = this.pond
	return typeof sign !== 'number' 
		? pond.findIndex(obj => obj.sign === sign)
		: sign >= pond.length
			? -1
			: sign
}
export default {
  start,
	nextStart,
	run,
	spill,
	matching,
}