let semver = require('semver')
let fs = require('fs')
let exists = fs.existsSync
let path = require('path')
let join = path.join
let read = file => JSON.parse(fs.readFileSync(file).toString())

module.exports = function depStatus (dir, opts={}) {
  if (!dir || typeof dir !== 'string')
    throw ReferenceError('File path required to check dependencies')

  let {time} = opts
  if (time)
    console.time(`Dependency status for ${dir}`)

  let packageFile = join(dir, 'package.json')
  let hasPackage = exists(packageFile)
  let packageLockFile = join(dir, 'package-lock.json')
  let hasPackageLock = exists(packageLockFile)

  if (!hasPackage)
    throw ReferenceError('File path does not contain a package.json file')

  let result = {
    ok: [],
    missing: [],
    outdated: [],
    warn: []
  }

  let package = read(packageFile)
  let deps = package.dependencies
  if (!deps)
    return result // Exit early

  let lockDeps
  if (hasPackageLock) {
    let packageLock = read(packageLockFile)
    lockDeps = packageLock.dependencies
  }

  let tree = Object.getOwnPropertyNames(deps)
  tree.forEach(dep => {
    let folder = dep
    let versionNeeded = deps[dep]
    // Prefer lockfile dep if available
    if (lockDeps && lockDeps[dep])
    versionNeeded = lockDeps[dep]

    // Handle deps pinned to tag names, or malformed versions
    let isValid = semver.valid(semver.coerce(versionNeeded))
    if (!isValid && !lockDeps ||
        !isValid && lockDeps && !lockDeps[dep]) {
      result.warn.push(dep)
    }
    else {
      // Fall back to version claimed by the lockfile
      if (!isValid) versionNeeded = lockDeps[dep]
      // Handle namespaced packages
      if (dep.startsWith('@')) folder = dep.split('/').join(path.sep)
      let depPackageFile = join(dir, 'node_modules', folder, 'package.json')

      if (!exists(depPackageFile)) {
        result.missing.push(dep)
      }
      else {
        let versionInstalled = read(depPackageFile).version
        try {
          let isOk = semver.satisfies(versionInstalled, versionNeeded)
          let isAhead = semver.gt(versionInstalled, versionNeeded)
          if (isOk)
            result.ok.push(dep)
          else if (isAhead)
            result.warn.push(dep)
          else
            result.outdated.push(dep)
        }
        catch (err) {
          result.warn.push(dep)
        }
      }
    }
  })
  if (time)
    console.timeEnd(`Dependency status for ${dir}`)

  return result
}
