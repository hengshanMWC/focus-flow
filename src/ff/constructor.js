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
}