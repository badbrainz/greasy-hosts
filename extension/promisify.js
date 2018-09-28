export default function(api, func) {
  return function(...args) {
    return new Promise(function(resolve, reject) {
      args.push(function(...result) {
        const { runtime: { lastError } } = chrome;
        if (lastError) return reject(lastError);
        resolve(result.length <= 1 ? result[0]: result);
      })
      api[func](...args);
    });
  }
}
