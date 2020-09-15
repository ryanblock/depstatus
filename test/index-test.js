let depStatus = require('../src')
let cpr = require('cpr')
let { existsSync: exists, mkdirSync: mkdir, readFileSync, renameSync } =  require('fs')
let { join } = require('path')
let rm = require('rimraf')
let test = require('tape')

let mock = join(process.cwd(), 'test', 'mock')
let tmp = join(process.cwd(), 'test', 'tmp')
let getCounts = result => {
  let packageFile = join(tmp, 'package.json')
  let deps = JSON.parse(readFileSync(packageFile).toString()).dependencies || 0
  let depCount = Object.getOwnPropertyNames(deps).length
  let resultCount = 0
  Object.getOwnPropertyNames(result).forEach(r => resultCount += result[r].length)
  return { depCount, resultCount }
}

function reset (callback) {
  rm(tmp, err => {
    if (err || exists(tmp)) throw Error('Reset failed')
    else {
      callback()
    }
  })
}

let opts = { deleteFirst: true, confirm: true }

test('Set up env', t => {
  t.plan(2)
  reset(() => {
    mkdir(tmp, { recursive: true })
    t.ok(depStatus, 'Loaded depStatus')
    t.ok(exists(tmp), 'Created tmp dir')
  })
})

test('Failing states', t => {
  t.plan(5)
  try {depStatus()}
  catch (err) { t.pass('depStatus failed on no param') }
  try {depStatus('')}
  catch (err) { t.pass('depStatus failed on empty string') }
  try {depStatus(1)}
  catch (err) { t.pass('depStatus failed on number') }
  try {depStatus({})}
  catch (err) { t.pass('depStatus failed on object literal') }
  try {depStatus('/foo/bar/baz/')}
  catch (err) { t.pass('depStatus failed on path missing package.json') }
})

test('Everything is ok', t => {
  t.plan(3)
  reset(() => {
    cpr(join(mock, 'ok'), tmp, opts, err => {
      if (err) t.fail(err)
      else {
        renameSync(join(tmp, 'nm'), join(tmp, 'node_modules'))
        let result = depStatus(tmp, { time: true })
        t.ok(result, 'Got dependency status report')
        let { depCount, resultCount } = getCounts(result)
        t.equal(depCount, resultCount, `Got back expected number of dependencies: ${depCount}`)
        t.equal(result.ok.length, depCount, 'All dependencies are ok')
        console.log(JSON.stringify(result, null, 2))
      }
    })
  })
})

test('Deps are missing', t => {
  t.plan(3)
  reset(() => {
    cpr(join(mock, 'missing'), tmp, opts, err => {
      if (err) t.fail(err)
      else {
        let result = depStatus(tmp, { time: true })
        t.ok(result, 'Got dependency status report')
        let { depCount, resultCount } = getCounts(result)
        t.equal(depCount, resultCount, `Got back expected number of dependencies: ${depCount}`)
        t.equal(result.missing.length, depCount, 'All dependencies are missing')
        console.log(JSON.stringify(result, null, 2))
      }
    })
  })
})

test('Deps are outdated on the filesystem', t => {
  t.plan(3)
  reset(() => {
    cpr(join(mock, 'outdated'), tmp, opts, err => {
      if (err) t.fail(err)
      else {
        renameSync(join(tmp, 'nm'), join(tmp, 'node_modules'))
        let result = depStatus(tmp, { time: true })
        t.ok(result, 'Got dependency status report')
        let { depCount, resultCount } = getCounts(result)
        t.equal(depCount, resultCount, `Got back expected number of dependencies: ${depCount}`)
        t.equal(result.outdated.length, depCount, 'All dependencies are outdated')
        console.log(JSON.stringify(result, null, 2))
      }
    })
  })
})

test('Deps throw warnings', t => {
  t.plan(3)
  reset(() => {
    cpr(join(mock, 'warn'), tmp, opts, err => {
      if (err) t.fail(err)
      else {
        renameSync(join(tmp, 'nm'), join(tmp, 'node_modules'))
        let result = depStatus(tmp, { time: true })
        t.ok(result, 'Got dependency status report')
        let { depCount, resultCount } = getCounts(result)
        t.equal(depCount, resultCount, `Got back expected number of dependencies: ${depCount}`)
        t.equal(result.warn.length, depCount, 'All dependencies are warned')
        console.log(JSON.stringify(result, null, 2))
      }
    })
  })
})

test('No deps', t => {
  t.plan(3)
  reset(() => {
    cpr(join(mock, 'empty'), tmp, opts, err => {
      if (err) t.fail(err)
      else {
        let result = depStatus(tmp) // Test time disabled
        t.ok(result, 'Got dependency status report')
        let { depCount, resultCount } = getCounts(result)
        t.equal(depCount, resultCount, `Got back expected number of dependencies: ${depCount}`)
        t.equal(result.warn.length, depCount, 'No dependencies returned')
        console.log(JSON.stringify(result, null, 2))
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
