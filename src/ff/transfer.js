export default {
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
	},
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
	},
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