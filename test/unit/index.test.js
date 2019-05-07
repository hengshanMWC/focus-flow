import FF from '../../src/index'
function fnError(error){
  console.log(typeof error)
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
    expect(ctx.$info.sign).toBe(true)
    ctx.text = 'null'
    next()
  }
  function fnFail(ctx, next){
    expect(ctx.text).toBe('fail')
    expect(ctx.$info.sign).toBe(false)
    ctx.text = 'null'
    next()
  }
  function fnEnd(ctx, next){
    expect(ctx.text).toBe('null')
    expect(ctx.$info.sign).toBeNull()
    next()
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
})
