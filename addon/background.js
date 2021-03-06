const defaultOptions = {
  startCollapsed:1,
  showFavicons:0,
  showFaviconPlaceholder:1,
  displayInlineNotes:0,
  compactMode:0,
  launchWithDoubleClick:0
}
var update = async (type = '') => {
  browser.runtime.sendMessage({ type:type }).then((msg) => {
    console[msg.type](msg.response)
  }, (err) => {
    console.error(err)
  })
},
eventTgts = [
  browser.bookmarks.onChanged,
  browser.bookmarks.onCreated,
  browser.bookmarks.onMoved,
  browser.bookmarks.onRemoved
],
options = defaultOptions,
checkDefaults = (opt) => {
  let optNames = Object.getOwnPropertyNames(defaultOptions)
  isSame = 0
  optNames.forEach((item, i, arr) => {
    if (opt[item] === defaultOptions[item]) {
      isSame++
    }
  })
  if (isSame < 4) {
    return false
  } else {
    return true
  }
},
loadOptions = (obj) => {
  if (obj.options && !checkDefaults(obj.options)) {
    options.startCollapsed = obj.options.startCollapsed
    options.showFavicons = obj.options.showFavicons
    options.displayInlineNotes = obj.options.displayInlineNotes
    options.compactMode = obj.options.compactMode
    options.launchWithDoubleClick = obj.options.launchWithDoubleClick
  }
}
browser.storage.local.get().then((res) => {
  loadOptions(res)
})

eventTgts.forEach((tgt, i, arr) => {
  tgt.addListener(() => {
    update('reload')
  })
})
browser.browserAction.onClicked.addListener((tab) => {
  browser.sidebarAction.open()
})
browser.storage.onChanged.addListener((change, area) => {
  if (area === 'local') {
    loadOptions(change)
  }
})