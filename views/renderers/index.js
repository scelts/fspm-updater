const { ipcRenderer, app } = require('electron')
const path = require('path')

var state = {
  comfol: "",
  sysfol: "",
  port: 9001,
  runatstartup: false,
  serverrunning: {
    status: false,
    message: 'Server not even initialized'
  },
  simpad: {status: false},
  apps: {status: false}
}

ipcRenderer.send('index.loaded')
ipcRenderer.send('apps.loaded')

ipcRenderer.on('index.state', (event, options) => {
  Object.assign(state, options) 
  render(state)
})
ipcRenderer.on('apps.state', (event, options) => {
  Object.assign(state, options) 
  render(state)
})


//enable tooltips
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

$('#runatstart').change( () => {
  ipcRenderer.send('registerstartuptoglle')
})

$('#changecomm').click( () => {
  ipcRenderer.send('changecommfold')
})

$('#comfolbtn').click( () => {
  ipcRenderer.send('open', state.comfol)
})

$('#changefilsys').click( () => {
  ipcRenderer.send('changesysfold')
})

$('#filesysbtn').click( () => {
  ipcRenderer.send('open', state.sysfol)
})

$('#portnumber').change( (target) => {
  state.port = target.currentTarget.value
})

$('#startstopser').click( () => {
  ipcRenderer.send('server.reboot', state.port)
})

$('#installsimpad').click( () => {
  ipcRenderer.send('simpad.install')
})

$('#addapp').click( () => {
  ipcRenderer.send('app.install')
})


function render(options) {
  var comfol = options.comfol
  if (comfol.length > 60){
    comfol = comfol.substring(0, 10) + ' ... ' + comfol.slice(comfol.length - 50)
  }
  var sysfol = options.sysfol
  if (sysfol.length > 60){
    sysfol = sysfol.substring(0, 10) + ' ... ' + sysfol.slice(sysfol.length - 50)
  }
  $('#comfolbtn').text(comfol)
  $('#filesysbtn').text(sysfol)
  if (state.serverrunning.status){
    $('#serverstatus').removeClass('badge-danger').addClass('badge-success').text('Running')
  }
  else{
    $('#serverstatus').removeClass('badge-success').addClass('badge-danger').text('Stopped')
  }
  $('#serverstatus').html(options.serverrunning.message)
  $('#portnumber').val(options.port)
  $('#runatstart').prop('checked', options.runatstartup);

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

function appcard(package, app, updatable, installable){
  var card = document.createElement('li')
  var cardcontent = document.createElement('div')
  cardcontent.classList.add('media')
  var favicon = document.createElement('img')
  favicon.classList.add('mr-3', 'appimg')
  //favicon location
  if (app){
    favicon.src = path.join(app.location, 'html_ui', 'InGamePanels', 'simpad', app.id, 'favicon.png')
  }
  else{
    favicon.src = package.fspm.favicon
  }
  var mediabody = document.createElement('div')
  mediabody.classList.add('media-body')
  var heading = document.createElement('h5')
  heading.classList.add('mt-0')
  heading.innerHTML = package.fspm.title
  var description = document.createElement('div')
  description.innerText = package.description
  var uninstalbut = document.createElement('button')
  if (installable){
    uninstalbut.innerText = 'Install'
    uninstalbut.onclick = function(){
      ipcRenderer.send('app.urlinstall', package.fspm.url)
    }
  }
  else{
    uninstalbut.innerText = 'Uninstall'
    uninstalbut.onclick = function(){
      ipcRenderer.send('app.uninstall', app.location)
    }
  }
  var updatebut
  if (updatable){
    updatebut = document.createElement('button')
    updatebut.innerText = 'Update'
  }
  mediabody.appendChild(heading)
  mediabody.appendChild(description)
  mediabody.appendChild(uninstalbut)
  if (updatebut) mediabody.appendChild(updatebut) 
  cardcontent.appendChild(favicon)
  cardcontent.appendChild(mediabody)
  card.appendChild(cardcontent)
  return(card) 
}


function getApp(app){
  return new Promise((resolve, reject) => {
    $.getJSON(path.join(app.location, 'html_ui', 'InGamePanels', 'simpad', app.id, 'package.json'), package => {
      var updatable = false
      var storeapp = storeapps.filter(e => e.name === package.name)
      var storeind = storeapps.findIndex(e => e.name === package.name)
      if (storeapp.length == 1){
        if (storeapp[0].version != package.version){
          updatable = true
        }
      }
      $('#apptable').append(appcard(package, app, updatable, false))
      storeapps.splice(storeind, 1)
      resolve()
    })
  })
}
var storeapps
async function renderapps(apps){
  $('#apptable').html('')
  $.getJSON('teststore.json', async storeappsret => {
    storeapps = storeappsret
    for (let i = 0; i < apps.length; i++){
      await getApp(apps[i])
    }

    storeapps.forEach( package => {
      $('#apptable').append(appcard(package, null, false, true))
    })
  })
}

render(state)