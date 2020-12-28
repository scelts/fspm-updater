const fs = require('fs')
const { app } = require('electron');

class PackageCheck {
  constructor() {
    var appdata = app.getPath("appData")
    var MSappdata = appdata.replace('Roaming', 'Local') + '\\Packages'
    this.pcgfolder = this.foldercheck(MSappdata, 'Microsoft.FlightSimulator', 'LocalCache\\Packages')
    if (!this.pcgfolder){
      this.pcgfolder = this.foldercheck(appdata, "Microsoft Flight Simulator", 'Packages')
    }
    if (this.pcgfolder){
      this.pcgfolder += '\\Community'
    }
  }

  foldercheck(root, mask, pcg) {
    try {
      var packageDirs = fs.readdirSync(root, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
      var packageFolder = packageDirs.find(e => e.includes(mask))
      return root + '\\' + packageFolder + '\\' + pcg
    }
    catch {
      return null
    }
  }

}

module.exports = PackageCheck