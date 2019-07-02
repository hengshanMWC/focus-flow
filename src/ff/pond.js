import FocusFlow from './constructor'
/**
 * 收集管道
 * callback(ctx, next, close)
 * @param {String|Function|FocusFlow} sign 标记|回调函数|FocusFlow实例，用来合并管道函数
 * @param {Function|Object} callback 回调函数|函数this
 * @param {Object} [hand = this.options.hand]
 * @return this
 * */
function use (sign, callback, hand) {
	if(typeof sign === 'function'){
		if (callback) hand = callback
		callback = sign
		sign = this.pond.length
	} else if(typeof sign === 'number'){
		sign = this.pond.length//管道仓库的长度
	} else if (sign instanceof FocusFlow){
		//FocusFlow,this
		return this.docking(sign, callback)
	}
	callback = this.redirect(callback, hand)
	this.pond.push({
		sign,
		callback
	})
	return this
}
/**
 * 抛错管道
 * callback(error, ctx, next, close)
 * @param {Function} callback 
 * @param {Object} [hand = this.options.hand] 函数指向的this
 * @return this 
 */
function error (callback, hand  = this.options.hand) {
	let basic = this.basic
	callback = this.redirect(callback, hand)    		
	basic.error = async function (error, thread) {
		thread.ctx.$info.index = null
		await callback(error, thread.ctx, thread.$next, thread.$close)
	}
	return this
}
/**
 * 成功管道
 * callback(ctx, next, close)
 * @param {Function} callback 
 * @param {Object} [hand = this.options.hand] 函数指向的this
 * @return this 
 */
function success (callback, hand) {
	return this.isState('success', callback, hand)
}
/**
 * 失败管道
 * callback(ctx, next, close)
 * @param {Function} callback 
 * @param {Object} [hand = this.options.hand]
 * @return this 
 */
function fail (callback, hand) {
	return this.isState('fail', callback, hand)
}
/**
 * 结束管道
 * callback(ctx)
 * @param {Function} callback 
 * @param {Object} [hand = this.options.hand] 函数指向的this
 * @return this 
 */
function end (callback, hand  = this.options.hand) {
	let basic = this.basic
	callback = this.redirect(callback, hand)    
	basic.end = async thread => {
		//end后删除线程
		this.closeThread(thread)
		await callback(thread.ctx)
	}
	return this
}
/**
 * 成功失败的方法
 * @param {String} state 
 * @param {Function} callback 
 * @param {Object} [hand = this.options.hand] 函数指向的this
 * @return this
 * @private	 
 */
function isState (state, callback, hand  = this.options.hand) {
	callback = this.redirect(callback, hand)    
	this.basic[state] = async thread => {
		thread.ctx.$info.index = null
		await callback(thread.ctx, thread.$next, thread.$close)
	}
	return this
}
/**
 * 合并其他FocusFlow的管道
 * @param {FocusFlow} ff 
 * @param {Object} [hand = this.options.hand]
 * @return this
 * @private
 */
function docking(ff, hand = this.options.hand){
	ff.pond.forEach(obj => this.use(obj.sign, obj.callback, hand))
	return this;
}
/**
 * 改变this指向
 * @param {Function} callback 
 * @param {Object} [hand = this.options.hand] 函数指向的this
 * @return {Function}
 * @private
 */
function redirect(callback, hand = this.options.hand){
	return typeof hand === 'object' && hand !== null 
		? callback.bind(hand)
		: callback
}
export default {
  use,
	error,
	success,
	fail,
	end,
	isState,
	docking,
  redirect,
}