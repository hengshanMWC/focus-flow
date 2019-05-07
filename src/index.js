import Thread from './thread.js'
export default class FocusFlow {
	static _id = 0;//每次生成线程+1
	constructor(param = {}){
		this.pond = []//管道仓库
    this.threads = [] //线程池
    this.defaults(param)
    this.junction()
	}
	defaults(param){
		const template = {
			threadMax: 1,//最大线程数
			guard: true,//是否开放线程池
			life: 10000,//清理线程的周期，毫秒单位
      hand: null, //函数this指向
		}
		Object.assign(this, template, param)
	}
  // 初始化状态函数
  junction(){
    function template(ctx,next){
      next()
    }
    //水流（线程）必经之地
    this.basic = {}
		this
    .error(function (error) {console.log(error)})//报错触发
		.success(template)//sign为true
    .fail(template)//sign为false
    .end(function () {})//sign为null
  }
	//管道的数量
	get length(){
		return this.basic.length
	}
	//判断线程池是否有位置
	get ram(){
		return this.guard && ( this.threadMax > this.threads.length )
	}
	/**
	 * 收集管道
	 * @param {String|Function|FocusFlow} sign 标记|回调函数|FocusFlow实例，用来合并管道函数
	 * @param {Function|Object} callback 回调函数|函数this
	 * @param {Object} hand 函数的this
	 * @return {Object} this
	 * */
  use(sign, callback, hand) {
    let arg = arguments
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
	 * 改变this指向
	 * @param {Function} callback 
	 * @param {Object} [hand = this.hand] 
	 * @return {Function}
	 * @private
	 */
  redirect(callback, hand = this.hand){
    return typeof hand === 'object' && hand !== null 
      ? callback.bind(hand)
      : callback
	}
	/**
	 * 抛错管道
	 * @param {Function} callback 
	 * @return {Object} this 
	 */
	error(callback){
		let basic = this.basic
		let fn = async error => {
			await callback(error)
			//end后删除线程
      this.closeThread(thread)
		}
		basic.error = fn
		return this
	}
  /**
	 * 成功管道
	 * @param {Function} callback 
	 * @return {Object} this 
	 */
	success(callback){
		return this.isState('success', callback)
	}
	/**
	 * 失败管道
	 * @param {Function} callback 
	 * @return {Object} this 
	 */
	fail(callback){
		return this.isState('fail', callback)
	}
	/**
	 * 结束管道
	 * @param {Function} callback 
	 * @return {Object} this 
	 */
	end(callback){
		let basic = this.basic
		let fn = async thread => {
			await callback(thread.ctx)
			//end后删除线程
      this.closeThread(thread)
		}
		basic.end = fn
		return this
	}
	
	/**
	 * 成功失败的方法
	 * @param {String} state 
	 * @param {Function} callback 
	 * @return {Object} this
	 * @private	 
	 */
	isState(state, callback){
		async function fnState(thread) {
			await callback(thread.ctx, thread.$next, thread.$close)
			thread.ctx.$info.sign = null
		}
		this.basic[state] = fnState.bind(this)
		return this
	}
	/**
   * 执行管道流
   * @param {Object|String|Number} ctx {object上下文内容|any管道标记}
   * @param {Object|String|Number} sign {object上下文内容|any管道标记}
	 * @return {Object} this 
   */
	start(ctx, sign){
		if(this.inspect()) return this
		if(typeof ctx !== 'object'){
			[ ctx, sign ] = [ sign, ctx ]
		}
		let thread = this.createThread(ctx, sign)
		thread.next(sign)
		return this
	}
	/**
	 * 判断线程池是否满员，满员则清除失活的线程
	 * @return {Boolean}
	 */
	inspect(){
		if(!this.ram) {
      return !this.clean()
		}
		return false
	}
	/**
	 * 目标管道，有则进入，没有则下一个
	 * @param {Thread} thread 
	 * @param {String|Number} sign 
	 * @private
	 */
	async nextStart(thread, sign){
		let index = this.matching(sign)
		if(index === -1){
			thread.ctx.$info.sign++
		} else {
			thread.ctx.$info.sign = index
		}
		await this.run(thread)
	}
	/**
	 * 执行管道
	 * @param {Thread} thread 
	 * @param {Boolean} state 
	 * @private
	 */
	async run(thread, state){
		let pond = this.pond
		let ctx = thread.ctx
		let surplus = ctx.$info.sign < pond.length
		try {
			if(ctx.$info.sign === null){
				//为null则end
				await this.basic.end(thread)
			} else if(state === false){
				//管道失败
				await this.basic.fail(thread, thread.$close);
			} else if(!surplus || state === true){
				//管道完成
				await this.basic.success(thread, thread.$close);
			} else if (surplus){
				//还有管道
				await pond[ctx.$info.sign++].callback(ctx, thread.$next, thread.$close)
			}
		} catch(error) {
			this.basic.error(error)
		}
		
	}
	/**
	 * 关闭线程池
	 * @return {Object} this
	 */
  close() {
		this.guard = false;
		return this
  }
	/**
	 * 打开线程池
	 * @return {Object} this
	 */
  open() {
		this.guard = true;
		return this		
  }
	/**
   * 通过标记获取管道下标
   * @param {String|Number} sign 标记
	 * @return {Number}
	 * @private
   */
	matching(sign){
		return this.pond.findIndex(obj => obj.sign === sign)
	}
  /**
   * 创建线程
   * @param {Object} ctx 上下文
	 * @return {Thread}
	 * @private
   */
	createThread(ctx){
    let thread = new Thread(this, ctx)
		this.threads.push(thread)
		return thread
	}
	/**
	 * 关闭线程(关闭后还会继续执行后面next的方法)
	 * @param {Thread} thread 
	 * @private
	 */
  closeThread(thread){
		let index = this.threads.findIndex( obj => obj === thread)
		this.threads.splice(index, 1 + index)
	}
	/**
	 * 清理线程池
	 * @return {Object} this
	 */
	closeThreads(){
		this.threads = [];
		return this
	}
	/**
	 * 清理过期的线程
	 * @return {Boolean} 是否有过期的线程清理成功
	 */
	clean(){
		let oldLen = this.threads.length
		this.threads = this.threads.filter(thread => thread.ctx.$info.life > Date.now())
		return oldLen < this.threads.length
	}
	/**
	 * 合并其他FocusFlow的管道
	 * @param {FocusFlow} ff 
	 * @param {Object} [hand = this.hand]
	 * @return {Object} this
	 * @private
	 */
	docking(ff, hand = this.hand){
    ff.pond.forEach(obj => this.use(obj.sign, obj.callback, hand))
		return this;
	}
}