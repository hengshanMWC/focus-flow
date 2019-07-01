import FocusFlow from '../ff/constructor.js'
export default class Thread {
	constructor(ff, ctx){
		this.ctx = Object.assign({}, ctx)
		this.$next = this.next.bind(this)
		this.$close = this.close.bind(this)
		this.ff = ff
		this.onceZero = true // start匹配不到就从0开始
		this.initInfo(ff)
	}
  /**
   * 初始化上下文的$info
   * @param {FocusFlow} ff 
	 * @private 
   */
	initInfo(ff){
		let $info = {
			id: FocusFlow._id++,//线程id
			ff,
			index: 0,//从0开始
		}
		Object.defineProperty(this.ctx, '$info', {
			value: $info,
		})
		this.active()
	}
	/**
	* 执行下一个管道
	* @param {FocusFlow|String|Number|Boolean} ff FocusFlow跨管道|管道标记
	* @param {String|Number|Boolean} sign 管道标记
	* @private
	*/
	next (ff, sign) {
		if(ff instanceof FocusFlow) return this.span(ff, sign)
		let $ff = this.ctx.$info.ff
		this.active()
		// if($ff.ram) this.active()
		if(typeof ff === 'boolean'){
      $ff.run(this, ff)
		} else if(ff !== undefined && typeof ff !== 'boolean'){
			$ff.nextStart(this, ff)
		} else {
			$ff.run(this)
		}
	}
  /**
   * 跨管道
   * @param: {FocusFlow} ff
   * @param: {String|Number} 执行管道的标记
	 * @private 
   */
	span (ff, sign) {
    this.close()
		ff.start(this.ctx, sign)
		return this;
	}
	//更新线程寿命，防止被回收
	active(){
		let info = this.ctx.$info;
		info.life = Date.now() + info.ff.options.life
	}
	//关闭线程
	close(){
    this.ff.closeThread(this)
	}
}