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
何为跨管道？因为有些情景可能不止一条管道分支。打个比方，我们
## explain
### 回调函数接受的参数
__ctx__：管道传递的上下文

$info：
* id: 线程的id
* index：当前管道坐标
* ff: 创建该线程的FF实例
* life: 线程的生命周期
***
__next__：可传递2个参数。
* 第一个参数param是Number类型时，会跳转到第param条管道并执行
* 第一个参数param是String类型时，会跳转到标记为param的管道并执行
* 第一个参数param是Boolean类型时，会跳转到相应的基本管道并执行
* 第一个参数param是FocusFlow类型时，会进行跨管道（相当于FocusFlow的实例.start(当前ctx，第二个参数)），第二个参数重复以上行为
### start








