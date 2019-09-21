let depStatus = require('../src')
let cpr = require('cpr')
let fs = require('fs')
let exists = fs.existsSync
let join = require('path').join
let mkdir = require('mkdirp').sync
let rm = require('rimraf')
let test = require('tape')

let mock = join(process.cwd(), 'test', 'mock')
let tmp = join(process.cwd(), 'test', 'tmp')
let getCounts = result => {
  let packageFile = join(tmp, 'package.json')
  let deps = JSON.parse(fs.readFileSync(packageFile).toString()).dependencies || 0
  let depCount = Object.getOwnPropertyNames(deps).length
  let resultCount = 0
  Object.getOwnPropertyNames(result).forEach(r => resultCount += result[r].length)
  return {depCount, resultCount}
}

function reset (callback) {
  rm(tmp, err => {
    if (err || exists(tmp)) throw Error('Reset failed')
    else {
      callback()
    }
  })
}

test('Set up env', t => {
  t.plan(2)
  reset(() => {
    mkdir(tmp)
    t.ok(depStatus, 'Loaded depStatus')
    t.ok(exists(tmp), 'Created tmp dir')
  })
})

test('Failing states', t => {
  t.plan(5)
  try {depStatus()}
  catch (err) {t.pass('depStatus failed on no param')}
  try {depStatus('')}
  catch (err) {t.pass('depStatus failed on empty string')}
  try {depStatus(1)}
  catch (err) {t.pass('depStatus failed on number')}
  try {depStatus({})}
  catch (err) {t.pass('depStatus failed on object literal')}
  try {depStatus('/foo/bar/baz/')}
  catch (err) {t.pass('depStatus failed on path missing package.json')}
})

test('Everything is ok', t => {
  t.plan(3)
  reset(() => {
    cpr(join(mock, 'ok'), tmp, {overwrite:true}, err => {
      if (err) t.fail(err)
      else {
        fs.renameSync(join(tmp, 'nm'), join(tmp, 'node_modules'))
        let result = depStatus(tmp, {time:true})
        t.ok(result, 'Got dependency status report')
        let {depCount, resultCount} = getCounts(result)
        t.equal(depCount, resultCount, `Got back expected number of dependencies: ${depCount}`)
        t.equal(result.ok.length, depCount, 'All dependencies are ok')
        console.log(result)
      }
    })
  })
})

test('Deps are missing', t => {
  t.plan(3)
  reset(() => {
    cpr(join(mock, 'missing'), tmp, {overwrite:true}, err => {
      if (err) t.fail(err)
      else {
        let result = depStatus(tmp, {time:true})
        t.ok(result, 'Got dependency status report')
        let {depCount, resultCount} = getCounts(result)
        t.equal(depCount, resultCount, `Got back expected number of dependencies: ${depCount}`)
        t.equal(result.missing.length, depCount, 'All dependencies are missing')
        console.log(result)
      }
    })
  })
})

test('Deps are outdated on the filesystem', t => {
  t.plan(3)
  reset(() => {
    cpr(join(mock, 'outdated'), tmp, {overwrite:true}, err => {
      if (err) t.fail(err)
      else {
        fs.renameSync(join(tmp, 'nm'), join(tmp, 'node_modules'))
        let result = depStatus(tmp, {time:true})
        t.ok(result, 'Got dependency status report')
        let {depCount, resultCount} = getCounts(result)
        t.equal(depCount, resultCount, `Got back expected number of dependencies: ${depCount}`)
        t.equal(result.outdated.length, depCount, 'All dependencies are outdated')
        console.log(result)
      }
    })
  })
})

test('Deps throw warnings', t => {
  t.plan(3)
  reset(() => {
    cpr(join(mock, 'warn'), tmp, {overwrite:true}, err => {
      if (err) t.fail(err)
      else {
        fs.renameSync(join(tmp, 'nm'), join(tmp, 'node_modules'))
        let result = depStatus(tmp, {time:true})
        t.ok(result, 'Got dependency status report')
        let {depCount, resultCount} = getCounts(result)
        t.equal(depCount, resultCount, `Got back expected number of dependencies: ${depCount}`)
        t.equal(result.warn.length, depCount, 'All dependencies are warned')
        console.log(result)
      }
    })
  })
})

test('No deps', t => {
  t.plan(3)
  reset(() => {
    cpr(join(mock, 'empty'), tmp, {overwrite:true}, err => {
      if (err) t.fail(err)
      else {
        let result = depStatus(tmp)
        t.ok(result, 'Got dependency status report')
        let {depCount, resultCount} = getCounts(result)
        t.equal(depCount, resultCount, `Got back expected number of dependencies: ${depCount}`)
        t.equal(result.warn.length, depCount, 'No dependencies returned')
        console.log(result)
      }
    })
  })
})

test('Tear down env', t => {
  t.plan(1)
  reset(() => {
    t.notOk(exists(tmp), 'Destroyed tmp dir')
  })
})
