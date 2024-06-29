(() => {
  const globalReplaces =  {

  }

  const result = new Proxy(globalReplaces, {
    get (target, prop) {
      if (prop in target) {
        return globalReplaces[prop]
      }
      return globalThis[prop]
    },
    set (target, prop, newValue) {
      target[prop] = newValue
    }
  })

  globalReplaces.globalThis = result
  globalReplaces.window = result
  globalReplaces.self = result

  return result
})()
