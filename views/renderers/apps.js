const { ipcRenderer } = require('electron')
const { stat } = require('fs')
const path = require('path')

var state = {
  simpad: null,
  apps: null
}

ipcRenderer.send('apps.loaded')
ipcRenderer.on('apps.state', (event, options) => {
  Object.assign(state, options) 
  render(state)
})

$('#installsimpad').click( () => {
  ipcRenderer.send('simpad.install')
})

$('#addapp').click( () => {
  ipcRenderer.send('app.install')
})

function render(options) {
  console.log(state) 
  if (state.simpad.status){
    rendersimpad(state.simpad.manifest)
  }
  
  if (state.apps.status){
    renderapps(state.apps.list)
  }
  
}


function rendersimpad(manifest){
  $('#simpadstatus').text('Version: ' + manifest.package_version)
  $('#installsimpad').hide()
}

function renderapps(apps){
  $('#apptable').html('')
  apps.forEach(app => {
    $.getJSON(path.join(app.location, 'html_ui', 'InGamePanels', 'simpad', app.id, 'package.json'), package => {
      var card = document.createElement('li')
      var cardcontent = document.createElement('div')
      cardcontent.classList.add('media')
      var favicon = document.createElement('img')
      favicon.classList.add('mr-3', 'appimg')
      //favicon location
      var favpath = path.join(app.location, 'html_ui', 'InGamePanels', 'simpad', app.id, 'favicon.png')
      favicon.src = favpath
      var mediabody = document.createElement('div')
      mediabody.classList.add('media-body')
      var heading = document.createElement('h5')
      heading.classList.add('mt-0')
      heading.innerHTML = package.fspm.title
      var description = document.createElement('div')
      description.innerText = package.description
      var uninstalbut = document.createElement('button')
      uninstalbut.innerText = 'Uninstall'
      uninstalbut.onclick = function(){
        ipcRenderer.send('app.uninstall', app.location)
      }
      mediabody.appendChild(heading)
      mediabody.appendChild(description)
      mediabody.appendChild(uninstalbut)
      cardcontent.appendChild(favicon)
      cardcontent.appendChild(mediabody)
      card.appendChild(cardcontent)
      $('#apptable').append(card)
    })
  });
}
