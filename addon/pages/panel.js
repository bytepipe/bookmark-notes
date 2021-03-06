const defaultOptions = {
  startCollapsed:1,
  showFavicons:0,
  showFaviconPlaceholder:1,
  displayInlineNotes:0,
  compactMode:0,
  launchWithDoubleClick:0
}
var tree = { id:'root________', children:[] },
    notes,
    collapsedFolders = [],
    openedFolders = [],
    favicons = {},
    popup = { element:document.querySelector('#popup-bg') },
    popupTitle = document.querySelector('#popup-title'),
    popupUrl = document.querySelector('#popup-url'),
    options = defaultOptions,
    bookmarkLaunching = false,
    timerId

// initial storage gets
browser.storage.local.get().then((res) => {
  if (res.collapsed) {
    collapsedFolders = res.collapsed
  }
  if (res.opened) {
    openedFolders = res.opened
  }
  if (res.options) {
    options = res.options
  }
  if (res.favicons) {
    favicons = res.favicons
  }
}, (err) => {
  console.error(`error getting local storage: '${err}'`)
})
browser.storage.sync.get('notes').then((res) => {
  notes = res.notes || {}
}, (err) => {
  console.error(`error getting synced notes: '${err}`)
})

var checkTitle = (input = { title:'', url:'' }) => {
  switch (input.title) {
    case '':
    case undefined:
      if (input.url && input.url !== '') {
        return input.url
      } else {
        return '(No data)'
      }
    default:
      return input.title
  }
},
setAttributes = async (el, atts, method = 'set') => {
  let doAttr = (e, a = atts) => {
    let attNames = Object.getOwnPropertyNames(a)
    attNames.forEach((item, index) => {
      switch (method) {
        case 'set':
          e.setAttribute(attNames[index], a[attNames[index]])
        break
        case 'remove':
          e.removeAttribute(atts[index])
        break
        default:
          console.error(`invalid method for setAttributes: '${method}'`)
      }
    })
  }
  if (el.length) {
    // if el is an array instead of a single NodeObject, handle it appropriately
    if (atts.length) {
      el.forEach((item, index) => {
        doAttr(item, atts[index])
      })
    } else {
      el.forEach((item, index) => {
        doAttr(item)
  })
    }
  } else {
    doAttr(el)
  }
},
getAttributes = (input, attr) => {
  let output = []
  input.forEach((item, index, arr) => {
    output.push(item.getAttribute(attr))
  })
  return output
},
makeTemplate = async (i) => {
  let elType = 'li',
  handleFunc,
  handleParams,
  setParams = [{ 'data-id':i.id, 'class':'item' }, { 'class':'title' }],
  el,
  favicon = document.createElement('img'),
  elChild = document.createElement('span'),
  elTarget = {
    arr:[],
    v:0
  },
  isCollapsed = (id) => {
    switch (options.startCollapsed) {
      case 1:
        if (openedFolders.length !== 0 && openedFolders.includes(id)) {
          return ''
        } else {
          return ' collapsed'
        }
      default:
        if (collapsedFolders.length !== 0 && collapsedFolders.includes(id)) {
          return ' collapsed'
        } else {
          return ''
        }
    }
  }
  elChild.appendChild(document.createTextNode(`${checkTitle(i)}`))
  switch (i.type) {
    case 'bookmark':
      setParams[1].title = i.url
      setParams[1]['data-title'] = checkTitle(i)
      handleFunc = openPopup
      handleParams = { title:i.title, url:i.url, id:i.id }
    break
    case 'folder':
      elType = 'ul'
      handleFunc = expandCollapse
      handleParams = i.id
      elTarget.v = 1
      setParams[0].class += isCollapsed(i.id)
    break
    default:
      // nothing to see here, go home
    break
  }
  el = document.createElement(elType)
  elTarget.arr = [el, elChild]
  if (options.showFavicons) {
    switch (favicons[i.id]) {
      case undefined:
        if (options.showFaviconPlaceholder && i.type === 'bookmark') {
          await setAttributes(favicon, {
            'src': '/img/default.svg',
            'class': 'favicon'
          })
          setParams[0].class += ' has-favicon'
          el.appendChild(favicon)
        }
      break
      default:
        await setAttributes(favicon, {
          'src':favicons[i.id],
          'class':'favicon'
        })
        setParams[0].class += ' has-favicon'
        el.appendChild(favicon)
    }
  }
  el.appendChild(elChild)
  setParams[0].class += ` ${i.type}`
  setAttributes([el, elChild], setParams)
  if (i.type !== 'separator') {
    addListeners('click', elTarget.arr[elTarget.v], handleFunc, handleParams)
  }
  return el
},
addListeners = async (event = '', element, func, params) => {
  element.addEventListener(event, (ev) => {
    func(params, ev)
  })
},
makeTree = async (item, parent = tree) => {
  let parentEl = document.querySelector(`[data-id="${parent.id}"]`)
  parentEl.appendChild(await makeTemplate(item))
  if (item.children) {
    for (child of item.children) {
      // we iterate on this function for each child of the folder
      await makeTree(child, parent.children.find(el => el.id === item.id))
    }
  }
},
openPopup = async (obj) => {
  let delayedOpen = () => {
    if (notes[obj.id]) {
      document.querySelector('#note-input').value = notes[obj.id]
    }
    setAttributes([document.body, popup.element, popupTitle, popupUrl],
      [{ 'popup-opened': 'true' },
      { 'data-open-id': obj.id },
      { 'title': obj.title },
      { 'title': obj.url, 'href': obj.url }])
    document.querySelector('#note-input').focus()
    bookmarkLaunching = false
  },
  launchBookmark = () => {
    window.clearTimeout(timerId)
    window.open(obj.url)
  }
  if (options.launchWithDoubleClick) {
    if (!bookmarkLaunching) {
      timerId = window.setTimeout(delayedOpen, 200)
      bookmarkLaunching = true
    } else {
      launchBookmark()
      bookmarkLaunching = false
    }
  } else {
    delayedOpen()
  }
},
closePopup = async (method) => {
  popup.id = popup.element.getAttribute('data-open-id')
  switch (method) {
    case 'save':
      notes[popup.id] = document.querySelector('#note-input').value
      browser.storage.sync.set({ notes:notes })
    case 'cancel':
      setAttributes([document.body, popup.element], ['popup-opened', 'data-open-id'], 'remove')
      document.querySelector('#note-input').value = ''
    break
    default:
      console.error(`unknown popup handling method: ${method}`)
  }
},
expandCollapse = async (elId, ev) => {
  ev.currentTarget.parentElement.classList.toggle('collapsed')
  let collEl = getAttributes(document.querySelectorAll('.collapsed'), 'data-id'),
  openEl = getAttributes(document.querySelectorAll('.folder:not(.collapsed)'), 'data-id'),
  newColl = collapsedFolders || [],
  newOpen = openedFolders || []
  if (options.startCollapsed) {
    switch (collEl.length) {
      case 0:
        /* if there are no open elements, but there are
        * still folder IDs in openedFolders, remove them all */
        if (openedFolders !== []) {
          newOpen = []
        }
        break
      default:
        // add new items to storage, and remove old ones
        openEl.forEach((item, index, arr) => {
          if (!openedFolders.includes(item)) {
            newOpen.push(item)
          }
        })
        openedFolders.forEach((item, index, arr) => {
          if (!openEl.includes(item)) {
            newOpen.splice(newOpen.indexOf(item), 1)
          }
        })
    }
    openedFolders = newOpen
  } else {
    switch (collEl.length) {
      case 0:
        if (collapsedFolders !== []) {
          newColl = []
        }
        break
      default:
        collEl.forEach((item, index, arr) => {
          if (!collapsedFolders.includes(item)) {
            newColl.push(item)
          }
        })
        collapsedFolders.forEach((item, index, arr) => {
          if (!collEl.includes(item)) {
            newColl.splice(newColl.indexOf(item), 1)
          }
        })
    }
    collapsedFolders = newColl
  }
  browser.storage.local.set({ collapsed:newColl, opened:newOpen })
},
panelInit = async (isReload = false) => {
  if (!isReload) {
    // we don't need to add listeners to Save & Cancel buttons if we already have, so don't
    document.querySelector('#popup-buttons>.button.cancel').addEventListener('click', (ev) => {
      closePopup('cancel', ev)
    })
    document.querySelector('#popup-buttons>.button.save').addEventListener('click', (ev) => {
      closePopup('save', ev)
    })
  } else {
    // clear the tree if we're reloading the bookmarks from scratch
    document.querySelector('#tree').innerHTML = ''
  }
  await browser.bookmarks.getTree().then((res) => {
    tree = res[0]
  }, (err) => {
    console.error(`error getting bookmarks: '${err}'`)
  })
  tree.children.forEach((b, i, arr) => {
    makeTree(b)
  })
}

// - - - end function defs - - -

panelInit()

browser.runtime.onMessage.addListener((msg, sender, respond) => {
  switch (msg.type) {
    case 'reload':
      respond({ type:'log', response:'*thumbs up emoji*' })
      panelInit(true)
      break
    default:
      respond({ type:'error', response:`unknown or missing message type: '${msg.type}'` })
  }
})
browser.storage.onChanged.addListener((change, area) => {
  if (area === 'sync') {
    notes = change.notes.newValue
  }
  if (area === 'local' && change.options) {
    options = change.options.newValue
    panelInit(true)
  }
})