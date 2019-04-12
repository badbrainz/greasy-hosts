// Original source: https://github.com/raffaeleflorio/webextension-browser-proxy
{
  const handler = {
    get: (target, prop, receiver) => {
      const value = target[prop]
      if (typeof value === "object") {
        return new Proxy(value, handler);
      } else if (typeof value === "function") {
        return (...args) => {
          let promise = {};
          const ret_promise = new Promise((resolve, reject) => {
            promise.resolve = resolve;
            promise.reject = reject;
          });

          const callBack = (...results) => {
            if (chrome.runtime.lastError)
              promise.reject(chrome.runtime.lastError)
            else
              promise.resolve(results.length <= 1 ? results[0] : results)
          }

          try {
            const ret_prop = value.apply(target, [...args, callBack]);
            if (typeof ret_prop !== "undefined")
              return ret_prop;
            else
              return ret_promise;
          } catch (e) {
            try {
              /* if target[prop] doesn't accept callback, return target[prop](args) */
              return value.apply(target, args);
            } catch (e) {
              /* if target[prop] doesn't accept parameter, return target[prop]() */
              return value();
            }
          }
        }
      } else {
        return value;
      }
    }
  }

  if (typeof browser === "undefined" && typeof chrome !== "undefined") {
    browser = new Proxy(chrome, handler);
    browser.isPolyfilled = true;
  } else {
    browser.isPolyfilled = false;
  }
}
