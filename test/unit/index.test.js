import FF from '../../dist/focusFlow.es'
// beforeAll(() => {
//   jest.useFakeTimers()
// })
function fnError(error, ctx){
  expect(error.name).toBe("ReferenceError")
  expect(ctx.text).toBe('error')
  ctx.text = 'null'
}
let list = [{name: 'mwc'}]
function getList(){
  return new Promise(function(resolve){
    resolve({data: list})
  })
}
test ('use', () => {
  function fnNumber(ctx, next){
    expect(ctx.number).toBe(1)
    expect(ctx.$info.id + 1).toBe(FF._id)
    next()
  }
  new FF()
    .use(fnNumber)
    .start({number: 1})
})
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
    ff = new FF()
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
  test ('number', () => {
    ff.start(1, {text: 'success'})
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
  let ff4 = new FF()
    .use('wear', async function(ctx, next){
      expect(fn.mock.calls.length).toBe(0)
      ctx.res = await getList()
      expect(ctx.res.data).toEqual(list)
      next()
    })
  let ff3 = new FF()
    .use(fn)
    .use(ff4)
  let ff2 = new FF()
    .use(function(ctx, next){
      expect(ctx.list).toHaveLength(3)
      next(ff3, 'wear')
    })
    .use(fn)
  new FF()
    .use(function({ list }, next){
      expect(list).toHaveLength(2)
      list.push('锤子')
      next(2)
    })
    .use(fn)
    .use(function(ctx, next, close){
      expect.assertions(5)
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
test('switch&hand', () => {
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
  let ff = new FF({
    hand: obj,
    life: 1000,
    threadMax: 1,
    guard: true
  })
    .use(function(ctx, next){
      expect(this).not.toBe(obj)
      expect(this).toBe(obj2)
      next()
    }, obj2)
    .use(function(ctx, next){
      expect(this).toBe(obj)
      next()
    })
  ff.close()
  ff.start()
  ff.open()
  expect(ff.length).toBe(2)
  ff.start()
})