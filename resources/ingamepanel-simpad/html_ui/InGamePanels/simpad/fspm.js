var IngamePanelCustomPanelLoaded = false;
document.addEventListener('beforeunload', function () {
  IngamePanelCustomPanelLoaded = false;
}, false);

class IngamePanelCustomPanel extends HTMLElement {
  constructor() {
    super();
  }
}

mainView(window.appslist);
window.customElements.define("ingamepanel-fspm", IngamePanelCustomPanel);

window.setInterval(() => {
  let abssec = SimVar.GetGlobalVarValue('LOCAL TIME', 'Seconds')
  let hourpct = parseFloat(abssec) / 3600
  let hour = Math.floor(hourpct)
  let minute = Math.floor(60 *(hourpct - hour))
  document.getElementById('time').innerText = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0')
}, 500)

function backToHome(){
  document.getElementById('CustomPanelIframe').style.display = 'none'
  document.getElementById('sliderholder').style.display = 'block'  
}

function iFrameSet(url){
  document.getElementById('CustomPanelIframe').src = url
  document.getElementById('CustomPanelIframe').style.display = 'block'
  document.getElementById('sliderholder').style.display = 'none' 
}

window.onmessage = function (e) {
  var   response = {
    "read": [],
    "write": [],
    "packages": []
  }
  var request = e.data
  if (request.read) {
    request.read.forEach(element => {
      let simvar = SimVar.GetSimVarValue(element.name, element.unit)
      response.read.push({
        "name": element.name,
        "unit": element.unit,
        "value": simvar
      })
    });
  }
  if (request.write) {
    request.write.forEach(element => {
      SimVar.SetSimVarValue(element.name, element.unit, element.value)
      response.write.push({
        "name": element.name,
        "unit": element.unit,
      })
    });
  }
  var iframe = document.getElementById("CustomPanelIframe");
  iframe.contentWindow.postMessage(response, '*');
};

function mainView(packages){
  var slider = document.createElement('div')
  slider.classList.add('slider')

  packages.forEach(pckg => {

    var card = document.createElement('div')
    card.classList.add('slidecard')
    slider.appendChild(card)
    
    var cardContent = document.createElement('div')
    cardContent.onclick = () =>{ iFrameSet(pckg.url) }
    card.appendChild(cardContent)

    var ImgParent = document.createElement('div')
    var icon = document.createElement('img')
    icon.src = pckg.icon
    cardContent.appendChild(ImgParent)
    ImgParent.appendChild(icon)
    
    var name = pckg.name
    if (name.length > 13){ name = name.substring(0, 10) + '...'}
    
    var title = document.createElement('h2')
    title.innerText = name
    cardContent.appendChild(title)

  });
  document.getElementById('sliderholder').appendChild(slider)
}

checkAutoload();