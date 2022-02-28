var Airtable = require('airtable')
// read-only API key from rhizomaticode
var base = new Airtable({ apiKey: 'keyRHmFMa5W4S4TUJ' }).base('app1AzaEIEVOFm3nN')
module.exports = store

function store(state, emitter) {
  state.links = [] // all links

  state.tags = []

  state.isDragging = false 

  state.currentResults = [] 

  state.drag = { x: 0, y: 0 }

  state.colors = ['red']

  state.colorsByTag = {}

  window.addEventListener('resize', () => {
    updateResults()
    emitter.emit('render')
  })

  emitter.on('navigate', () => {
    console.log(`Navigated to ${state.route}`)
  })

  emitter.on('image:mousedown', (i, e) => {
    e.preventDefault()
    const el = state.currentResults[i]
    bringToFront(i)
    state.drag.x = e.clientX
    state.drag.y = e.clientY
    state.drag.el = el
    document.onmousemove = dragElement
    document.onmouseup = stopDrag
    emitter.emit('render')
  })

  emitter.on('clear selection', () => {
    state.currentResults.forEach((el) => el.selected = false)
    emitter.emit('render')
  })

  function stopDrag () {
    state.drag.el.transition = 'all 1s'
    document.onmousemove = null
    document.onmouseup = null
    state.isDragging = false
    emitter.emit('render')
  }

  function dragElement(e) {
    e.preventDefault()
    state.isDragging = true
    const el = state.drag.el
    el.transition = 'none'
    const x = state.drag.x - e.clientX
    const y = state.drag.y - e.clientY
    state.drag.x = e.clientX
    state.drag.y = e.clientY
    el.top = el.top - y
    el.left = el.left - x
    emitter.emit('render')
  }

  function bringToFront(i) {
    const el = state.currentResults[i]
    state.currentResults.splice(i, 1)
    //console.log(newResults, )
    state.currentResults.push(el)
  }

  function setSelected(i) {
    state.currentResults.forEach((el) => el.selected = false)
    const el = state.currentResults[i]
    el.selected = true
    const width = Math.min(800, window.innerWidth)
    if(el.left + width > window.innerWidth) {
      el.left =  rand(10, window.innerWidth - width - 10)
    }
    if(el.top > window.innerHeight / 3) el.top = rand(20, window.innerHeight/3)
    // el.top = 60
    // el.left = 60
    // el.width = window.innerWidth - 200
  }

  emitter.on('image:click', (i) => {
    bringToFront(i)
    setSelected(state.currentResults.length - 1)
    emitter.emit('render')
   // state.currentResults = newResults
    //emitter.emit('render')
    console.log('clicked on image', state.currentResults, i)
  })

  emitter.on('toggle tag', (tagIndex) => {
    state.tags[tagIndex].selected = ! state.tags[tagIndex].selected
    filterResultsByTags()
    emitter.emit('render')
  })

  function filterResultsByTags () {
    const filtered = state.tags.filter((tag) => tag.selected)
    const tags = filtered.map((tag) => tag.label)
    state.colors = filtered.map((tag) => tag.color)
    state.currentResults = state.links.filter((link) => {
      let containsTag = false
      if(link.Tags) {
        link.Tags.forEach((t) => {
          if(tags.indexOf(t) > -1) {
            containsTag = true
            console.log(t, state.colorsByTag)
            link.color = state.colorsByTag[t]
          }
        })
      }
      return containsTag
    }).map((link, i) => ({
      link: link,
      width: rand(100, 350),
      top: Math.random() * window.innerHeight,
      left: Math.random() * (window.innerWidth - 300),
      transition: 'all 1s',
      selected: false,
      id: `link-${i}`
    }))
    updateResults()
    emitter.emit('render')
    console.log('tags are', tags)
  }

  // update tags currently shown
  function updateTags () {
    const allTags =  state.links.reduce((prev, next) => prev.concat(next.Tags), [])
    const filteredTags = allTags.filter((item, index) => allTags.indexOf(item) === index)
    state.colorsByTag = {}
    state.tags = filteredTags
    .map((tag, i) => ({
      label: tag, 
      selected: false, 
      color: `hsl(${360*i/filteredTags.length}, 100%, 70%)`
    }))

    state.tags.forEach((tag) => { state.colorsByTag[tag.label] = tag.color })
    updateResults()
  }

  const rand = (min=0, max=1) => min + Math.random() * (max - min)

  function updateResults() {
    const length = state.currentResults.length
    const _w = 800
    let w = length > 8 ? (length > 12 ? rand(_w/6, _w/5) : rand(_w/4, _w/3)) : rand(_w/2, _w/3)
    state.currentResults.forEach((link, i) => {
      const width = link.selected? Math.min(800, window.innerWidth) : w
      link.width = w
     // if(!link.selected) {
        link.top=  Math.random() * (window.innerHeight - 200) + 40
        link.left = Math.random() * (window.innerWidth - 300)
     // }
      link.transition = 'all 1s'
       if(link.left + width > window.innerWidth) {
         link.left =  rand(10, window.innerWidth - width - 10)
       }
      if(link.selected && link.top > window.innerHeight / 3) link.top = rand(20, window.innerHeight/3)
    })
  }

  base('Links').select({
    // Selecting the first 50 records in Grid view:
    // maxRecords: 1000,
    pageSize: 10,
    view: "Grid view"
  }).eachPage(function page(records, fetchNextPage) {
    state.links = state.links.concat(records.map((record) => record.fields)).sort((a, b) => Math.random)
    console.log('records', records, state.links)
    state.currentResults = state.links.map((link, i) => ({
      link: link,
      width: rand(100, 350),
      top: Math.random() * window.innerHeight,
      left: Math.random() * (window.innerWidth - 300),
      id: `link-${i}`,
      selected: false
    }))
   fetchNextPage()
    updateTags()
    emitter.emit(state.events.RENDER)
  }, function done(err) {
    if (err) { console.error(err); return; }
  })

  //   const DATA_URL = `${window.location.origin}/json`
  //   fetch(DATA_URL)
  //   .then(response => response.json())
  //   .then(data => {
  //     state.links = data 
  //     console.log(state.links)
  //     emitter.emit(state.events.RENDER)
  //   });
}
