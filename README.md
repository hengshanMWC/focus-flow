## focus-flow
让前端代码变成一条流
## Features
* 将后端中间件方式移植到前端，通过传递ctx上下文来处理业务逻辑，从而降低耦合度
* 模仿线程概念，实现防抖
* 支持async/await
## Installing
`npm i focus-flow`
## Chestnut
曾几何时，你有没有被反复无常的需求弄得心烦意乱。

举个例子：一个商城代理模块，当代理要发展下线的时候，要通过二维码让新用户扫码，才可以绑定用户。
```
function isRegister(){
  if(is){
    getUserInfo()
  } else {
    register()
  }
}
agent(id){
  //是否有代理id
  if(id) 
}
register(){
  agent()
  getUserInfo()
}
```
好不容易把业务写好了，过了数天，产品：“小马啊，发展下线这个逻辑改成-----非代理用户，第一次扫代理二维码的时候就成为代理的下线”。

这时候又得屁颠颠的从register函数上找到agent注释掉，放到合适的地方。

又过了数天，产品走过来一边帮按摩一边说：”小马啊，发展下线这个逻辑改成......“（产品猝

遇到类似这样的变更，都得到之前的业务逻辑上来找这函数，如果时间一长，或者代码一庞大，改起来就会变得缩手缩脚，那该怎么办呢？

正好之前学node的时候接触过koa，洋葱般的中间件方式是那么的让人着迷，一个个中间件通过维护上下文ctx来降低掉函数间的耦合度。那正是我想要的，那何不把它移植到前端来？

然后搞搞，终于把业务代码变成了下面这样
```
//每个回调函数会接受到3个参数，分别是ctx、next、close
const master = new FF()
  .use(isRegister) //是否注册
  .use(register) //注册
  .use(getUserInfo) //获取用户
  .use(agent) //成为下线
//启动的时候
master.start()
```
可读性变得更强，并且修改变动每条管道(use的回调函数之为管道)的时候，我们只需要关注ctx即可。

当然，如果你不想按步就班，你大可next(FocusFlow|Number|String|Boolean)来进行定点执行或跨管道
## Concept
### 跨管道
何为跨管道？因为有些情景可能不止一条管道分支，宛如git上的一条条不同的分支，正常流程上线用到master分支，但当你要处理bug的时候，有可能就需要一个bug_dev分支了。同理，当我们的master管道出现正常流程之外的事情，我们可以在回调函数里面是用next(ff2, [sign]),就像git checkout ff2那样，让一个专门处理非正常流程的分支去处理这些逻辑，这样整个业务在宏观上变得层级分明。
### 线程
```
getList(){
  if(close) return 
  close = true
  //异步逻辑，完成后把close设置成false
}
```
上拉加载的时候，用节流去限制请求接口次数。不知道你有没有写过类似代码，或者用闭包去实现。如上功能，FF也可以实现。
```
const ff = new FF()
  .use(getList(ctx, next){
    //异步逻辑,完成后next
    //还有一个状况，假设判断后台的所有列表数据已经返回完了，那么再触发这段管道就没有意义了。这时候我们就可以使用ctx.$info.ff.close关闭掉线程池。
  })
ff.start({接口参数})
```
每当ff使用start(成功使用)的时候，内部就会新建一条线程，该线程会负责该次start的请求。而ff中的threads是专门用来储存这些线程。
```
//默认配置
new FF({
  threadMax: 1, //最大线程数
  switch: true, //是否开放线程池
  life: 10000, //清理线程的周期，毫秒单位
  hand: null, //函数this指向
})
```
__threadMax__：用来限制threads的上限，当达到上限且其中线程都仍活跃，使用start就不会再创建成功，也就意味着该次的start无法成功执行
__switch__：threadMax如果是一个容器，那么switch则是这个容器的开关
__life__：规定线程的寿命，每当回调函数使用next时，都会刷新线程的寿命。线程池会根据线程的寿命去清理掉那些过期的线程。
__hand__：函数的全局this指向
## explain
### 基本管道
__success__：next()到底的时候就会触发该管道,当然，你也可以next(true)直接执行成功管道
__fail__：next(false)的时候触发
__end__：
### 回调函数接受的参数
__ctx__：管道传递的上下文，ff.start(参数)会附加到ctx上。

$info：
* id: 线程的id
* index：当前管道坐标
* ff: 创建该线程的FF实例
* life: 线程的生命周期
***
__next__：可传递2个参数。
* 第一个参数param是Number类型时，会跳转到第param条管道并执行（没有符合则相当于next()）
* 第一个参数param是String类型时，会跳转到标记为param的管道并执行（没有符合则相当于next()）
* 第一个参数param是Boolean类型时，会跳转到相应的基本管道并执行
* 第一个参数param是FocusFlow类型时，会进行跨管道（相当于FocusFlow的实例.start(当前ctx，第二个参数)），第二个参数重复以上行为
***
__close__：清理当前执行线程，但线程是还会执行完任务
### start








