const { app, BrowserWindow, dialog, ipcMain, Menu, Tray, net } = require('electron')
const Store = require('./scrips/store')
const PackageCheck = require('./scrips/packageCheck')
const path = require('path')
const childprocess = require('child_process')
const assetsDir = path.join(__dirname, 'assets')
const fspm = require('fspm')
const tmp = require('tmp')
//require('update-electron-app')()

const store = new Store({
  // We'll call our data file 'user-preferences'
  configName: 'user-preferences',
  defaults: {
    windowBounds: { width: 800, height: 600 },
    sysfol: app.getPath('home'),
    port: 9000
  }
});

let tray = null
let win = null
let contextMenu = null
let serverstatus = {}

function createTray() {
  checkPackageFolder()
 // restartServer()
  var loginsettings = app.getLoginItemSettings()
  tray = new Tray(path.join(assetsDir, 'plane.png'))
  contextMenu = Menu.buildFromTemplate([
    {
      label: 'Run At Startup', type: 'checkbox',
      id: 'runatstartup',
      checked: loginsettings.executableWillLaunchAtLogin,
      click: toggleStartup
    },
    {
      label: 'Quit', click: () => {
        app.isQuiting = true;
        app.quit();
      }
    },
  ])
  tray.setToolTip('This is my application.')
  tray.setContextMenu(contextMenu)

  tray.on('click', (event) => {
    if (!win) {
      createWindow()
    } else {
      win.show()
    }
  })
}

function createWindow() {
  let { width, height } = store.get('windowBounds');
  win = new BrowserWindow({
    width: width,
    height: height,

    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    },
  })

  win.on('resize', () => {
    // The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
    // the height, width, and x and y coordinates.
    let { width, height } = win.getBounds();
    // Now that we have them, save them using the `set` method.
    store.set('windowBounds', { width, height });
  });

  win.on('minimize', function (event) {
    event.preventDefault();
    win.hide();
  });

  win.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      win.hide();
    }

    return false;
  });

  win.loadFile('views/index.html')
  //win.webContents.openDevTools() 
}

function toggleStartup() {
  var settings = app.getLoginItemSettings()
  settings.openAtLogin = !settings.executableWillLaunchAtLogin,
    settings.args = [' --minimized'],
    app.setLoginItemSettings(settings)
  contextMenu.getMenuItemById('runatstartup').checked = settings.openAtLogin
  win.webContents.send('index.state', {
    runatstartup: settings.openAtLogin
  })
}

function checkPackageFolder() {
  let communFolder = store.get('communityFolder');
  var askFolder = false
  if (!communFolder) {
    var check = new PackageCheck()
    if (check.pcgfolder) {
      var choice = dialog.showMessageBoxSync(null, {
        type: 'question',
        title: 'Found package folder',
        message: 'The app found the community package folder at:\n' + check.pcgfolder + '\nIs this correct?',
        buttons: ['Yes', 'No']
      })
      if (choice == 0) {
        askFolder = false
        communFolder = check.pcgfolder
      }
      else {
        askFolder = true
      }
    }
  }
  else {
    askFolder = false
  }

  if (askFolder) {
    let dir = dialog.showOpenDialogSync(null, {
      properties: ['openDirectory'],
      title: "Please select the MSFS community package folder",
      buttonLabel: 'Select Folder'
    })
    if (dir) {
      communFolder = dir
    }
    else {
      dialog.showMessageBoxSync(null, {
        type: 'error',
        title: 'Community folder missing',
        message: "You'll have to select the MSFS community folder for this app to work.",
      })
    }
  }
  store.set('communityFolder', communFolder);
}

/*function restartServer() {
  if (serverstatus.status) {
    serverstatus = fspm.server.stop()
  }
  try {
    fspm.server.run(store.get('communityFolder'), store.get('sysfol'), store.get('port'))
      .then((result) => {
        serverstatus = result
        if (win) {
          win.webContents.send('index.state', {
            serverrunning: {
              message: 'Starting server...',
              status: false
            }
          })
          var request = net.request('http://localhost:' + store.get('port'))
          request.on('response', (response) => {
            win.webContents.send('index.state', {
              serverrunning: serverstatus
            })
          })
          request.on('error', (err) => {
            serverstatus = {
              message: err.message,
              status: false
            }
            if (win) {
              win.webContents.send('index.state', {
                serverrunning: serverstatus
              })
            }
          })
          request.end()
        }
      })
      .catch((err) => {
        serverstatus = {
          message: err.message,
          status: false
        }
        if (win) {
          win.webContents.send('index.state', {
            serverrunning: serverstatus
          })
        }
      })
  }
  catch (err) {
    serverstatus = {
      message: err.message,
      status: false
    }
    if (win) {
      win.webContents.send('index.state', {
        serverrunning: serverstatus
      })
    }
  }
}
*/


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })

  // Create myWindow, load the rest of the app, etc...
  app.on('ready', () => {
    createTray()
    if (!process.argv.includes('--minimized')) {
      createWindow()
    }
  })
}

app.on('activate', () => {

})

ipcMain.on('registerstartuptoglle', (event, arg) => {
  toggleStartup()
})

ipcMain.on('index.loaded', (event, arg) => {
  win.webContents.send('index.state', {
    comfol: store.get('communityFolder'),
    sysfol: store.get('sysfol'),
    port: store.get('port'),
    runatstartup: app.getLoginItemSettings().executableWillLaunchAtLogin,
    serverrunning: serverstatus
  })
})

ipcMain.on('changecommfold', (event, arg) => {
  let dir = dialog.showOpenDialogSync(null, {
    properties: ['openDirectory'],
    title: "Please select the MSFS community package folder",
    buttonLabel: 'Select Folder'
  })
  if (dir) {
    store.set('communityFolder', dir[0]);
    win.webContents.send('index.state', {
      comfol: dir
    })
  }
})

ipcMain.on('open', (event, arg) => {
  childprocess.exec('start "" "' + arg + '"')
})

ipcMain.on('changesysfold', (event, arg) => {
  let dir = dialog.showOpenDialogSync(null, {
    properties: ['openDirectory'],
    title: "Please select the folder to expose in-game",
    buttonLabel: 'Select Folder'
  })
  if (dir) {
    store.set('sysfol', dir[0]);
    win.webContents.send('index.state', {
      sysfol: dir
    })
  }
})

/*ipcMain.on('server.reboot', (event, arg) => {
  store.set('port', arg)
  restartServer()
})*/

function refreshApps() {
  var apps = fspm.apps.list(store.get('communityFolder'))
  var simpad = fspm.base.getManifest(store.get('communityFolder'))
  return ({
    apps: apps,
    simpad: simpad
  })
}

ipcMain.on('apps.loaded', (event, arg) => {
  win.webContents.send('apps.state', refreshApps())
})

ipcMain.on('app.uninstall', (event, arg) => {
  var result = fspm.apps.remove(store.get('communityFolder'), arg)
  win.webContents.send('apps.state', refreshApps())
})

ipcMain.on('app.install', (event, arg) => {
  let file = dialog.showOpenDialogSync(null, {
    properties: ['openFile'],
    title: "Please select app package tar.gz file",
    filters: [
      { name: 'FSPM app', extensions: ['tar.gz'] }
    ],
    buttonLabel: 'Select App Package'
  })
  if (file) {
    const tmpobj = tmp.dirSync();
    var result = fspm.apps.install(store.get('communityFolder'), tmpobj.name, file[0])
      .then(result => {
        win.webContents.send('apps.state', refreshApps())
      })
      .catch(result => {
        dialog.showMessageBox(null, {
          type: 'error',
          buttons: ['OK'],
          defaultId: 2,
          title: 'Error',
          message: 'App install error',
          detail: result.message,
        })
      })
  }
})

ipcMain.on('simpad.install', (event, arg) => {
  var result = fspm.base.add(store.get('communityFolder'), path.join('resources', 'ingamepanel-simpad'))
  win.webContents.send('apps.state', refreshApps())
})

ipcMain.on('app.urlinstall', (event, arg) => {
  var downwin = new BrowserWindow({
  })

  downwin.loadURL('https://flightsim.to/file/3181/fspm-vfr-map') 

  downwin.webContents.session.on('will-download', (event, item, webContents) => {
    item.once('done', (event, state) => {
      if (state === 'completed') {
        const tmpobj = tmp.dirSync();
        var result = fspm.apps.install(store.get('communityFolder'), tmpobj.name, item.getSavePath())
          .then(result => {
            win.webContents.send('apps.state', refreshApps())
          })
          .catch(result => {
            dialog.showMessageBox(null, {
              type: 'error',
              buttons: ['OK'],
              defaultId: 2,
              title: 'Error',
              message: 'App install error',
              detail: result.message,
            })
          })        
        downwin.close()
      } else {
        dialog.showMessageBoxSync(null, {
          type: 'error',
          title: 'File download problem',
          message: 'The app failed to download',
          buttons: ['Ok']
        })
      }
    }) 
  })


})