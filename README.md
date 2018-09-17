greasy-hosts
============
External editor integration for [Greasemonkey](https://github.com/greasemonkey/greasemonkey)

Example usage [badbrainz/greasemonkey/commits/open-external](https://github.com/badbrainz/greasemonkey/commits/open-external)

Config
------
```js
chrome.storage.local.set({
  appConfig: {
    enabled: true,
    cmd: <exe_path_or_alias>,
    args: []
  }
})
```

Requirements
------------
 * Node.js v10.0.0
