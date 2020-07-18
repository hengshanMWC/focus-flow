// import FocusFlow from '../../dist/focusFlow.es.min.js'
import FocusFlow from '../../src'
// const FocusFlow = require('../../dist/focusFlow.cjs.min')
// beforeAll(() => {
//   jest.useFakeTimers()
// })
function fnError(error, ctx, next){
  expect(error.name).toBe("ReferenceError")
  expect(ctx.text).toBe('error')
  ctx.text = 'null'
  next()
}
let list = [{name: 'mwc'}]
function getList(){
  return new Promise(function(resolve){
    resolve({data: list})
  })
}
describe('provide basic', () => {
  let ff = null;
  function fnSuccess(ctx, next){
    expect(ctx.text).toBe('success')
    //sign在执行success和fail回调函数的时候，会提前变成null
    expect(ctx.$info.index).toBe(null)
    ctx.text = 'null'
    next()
  }
  function fnFail(ctx, next){
    expect(ctx.text).toBe('fail')
    expect(ctx.$info.index).toBe(null)
    ctx.text = 'null'
    next()
  }
  function fnEnd(ctx){
    expect(ctx.text).toBe('null')
    expect(ctx.$info.index).toBeNull()
  }
  beforeEach(() => {
    FocusFlow
    ff = new FocusFlow()
      .error(fnError)
      .success(fnSuccess)
      .fail(fnFail)
      .end(fnEnd)
  })
  test ('basic', () => {
    ff.start({text: 'success'})
  })
  test ('false', () => {
    ff.start(false, {text: 'fail'})
  })
  test ('error', () => {
    ff
      .use('error', function(){
        ctx
        next()
      })
      .start({text: 'error'})
  })
})
test('flow span', async done => {
  const fn = jest.fn()
  let ff4 = new FocusFlow()
    .use('wear', async function(ctx, next){
      expect(fn.mock.calls.length).toBe(0)
      ctx.res = await getList()
      expect(ctx.res.data).toEqual(list)
      next()
    })
    .use(async function(ctx, next){
      expect(ctx.res.data).toEqual(list)
      next(234234234)
    })
  let ff3 = new FocusFlow()
    .use(fn)
    .use(ff4)
  let ff2 = new FocusFlow()
    .use(function(ctx, next){
      expect(ctx.list).toHaveLength(3)
      next(ff3, 'wear')
    })
    .use(fn)
  new FocusFlow()
    .use(function({ list }, next){
      expect(list).toHaveLength(2)
      list.push('锤子')
      next(2)
    })
    .use(fn)
    .use(function(ctx, next, close){
      expect.assertions(6)
      expect(fn.mock.calls.length).toBe(0)
      setTimeout(function(){
        next(ff2)
        done()
      })
    })
    .start({list: [
      '苹果',
      '香蕉',
    ]})
})
test('switch&hand&queue', () => {
  let index = 0
  let obj = {
    name: 'mwc',
    height: '179',
    sex: '1'
  }
  let obj2 = {
    name: 'ab',
    height: '30',
    sex: '1'
  }
  let obj3 = {
    fn () {
      expect(this.c).toBe(10)
    },
    c: 10
  }
  let ff = new FocusFlow({
    hand: obj,
    life: 1000,
    threadMax: 2,
    guard: true,
    queue: true,
    queueMax: 3
  })
  ff
    .use(function(ctx, next){
      expect(this).not.toBe(obj)
      expect(this).toBe(obj2)
      next()
    }, obj2)
    .use(async function(ctx, next){
      await getList()
      index++
      expect(this).toBe(obj)
      next()
    })
    .end(obj3.fn, obj3)
    .onFull(function(ctx, obj) {
      expect(ff).toBe(obj)
    })
    .onQueueFull(function () {
      expect(ff.queue.length).toBe(3)
    })
    // 关闭线程池
    .close()
    // 进入队列
    .start()
    // 关闭队列入口
    .closeQueue()
    // 无效
    .start()
  // 队列有1个
  expect(ff.queue.length).toBe(1)
  ff
    // 打开线程池，队列中的任务进入线程池
    .open()
    // 第二个进入线程池
    .start()
    // 线程池已满并且队列入口被关闭，无效任务
    .start()
  expect(ff.queue.length).toBe(0)
  ff 
    // 打开队伍入口
    .openQueue()   
    // 第一个进入队列 
    .start()
    // 第二个进入队列
    .start()
    // 第三个进入队列，队列已满
    .start()
    // 无效任务
    .start()
  expect(ff.queue.length).toBe(3)
  ff
    // 关闭队列的出口
    .closeExit()
    // 清除线程池
    .emptyThreads()
  expect(ff.threads.length).toBe(0)  
  expect(ff.queue.length).toBe(3)
  ff
    // 打开队列的入口
    .openExit()
  expect(ff.threads.length).toBe(2)  
  expect(ff.queue.length).toBe(1)
  ff
    // 清空队列
    .emptyQueue()
  expect(ff.queue.length).toBe(0)  
  expect(ff.length).toBe(2)  
  // 异步
  expect(index).toBe(0)
})
describe('100', () => {
  test('error&sign', () => {
    new FocusFlow()
      .use((ctx, next) => {
        // 故意触发error的默认钩子
        asdasd
        next(12)
      })
      .start(123)
  })
})
