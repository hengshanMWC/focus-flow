export default class FocusFlow {
	static _id = 0; //每次生成线程+1
	constructor(options = {}){
		this.pond = [] //管道仓库
    this.threads = [] //线程池
    this.defaults(options)
    this.junction()
	}
	defaults(options){
		const template = {
			threadMax: 1, //最大线程数
			switch: true, //是否开放线程池
			life: 10000, //清理线程的周期，毫秒单位
      hand: null, //函数this指向
		}
		this.options = Object.assign(template, options)
	}
  // 初始化状态函数
  junction(){
    function template(ctx, next){
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
	/**
	 * 返回管道的数量（不包括基本管道）
	 */
	get length(){
		return this.pond.length
	}
	/**
	 * 判断线程池是否开放
	 */
	get ram(){
		return this.options.switch && ( this.options.threadMax > this.threads.length )
	}
	/**
   * 执行管道流
   * @param {any} ctx object上下文内容|any管道标记
   * @param {any} sign object上下文内容|any管道标记
	 * @return this 
   */
	start(ctx, sign){
		if(this.inspect()) return this
		if(typeof ctx !== 'object'){
			[ ctx, sign ] = [ sign, ctx ]
		}
		let thread = this.createThread(ctx)
		thread.next(sign)
		return this
	}
	/**
	 * 目标管道，有则进入，没有则下一个
	 * @param {Thread} thread 
	 * @param {String|Number} sign 
	 * @private
	 */
	nextStart(thread, sign){
		let index = this.matching(sign)
		if(index === -1){
			thread.ctx.$info.index++
		} else {
			thread.ctx.$info.index = index
		}
		this.run(thread)
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
}