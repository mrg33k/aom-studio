import puppeteer from 'puppeteer-core'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']})
async function shot(name, actions){
  const p=await b.newPage(); await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
  await p.goto('http://localhost:5173/cvg',{waitUntil:'networkidle0',timeout:45000}).catch(()=>{})
  await new Promise(r=>setTimeout(r,2000))
  for(const a of actions){ try{await p.click(a);await new Promise(r=>setTimeout(r,1600))}catch(e){console.log('skip',a)} }
  await p.screenshot({path:name}); await p.close(); console.log('shot',name)
}
await shot('chk-chatroom.png',['.d-crewrow'])
await shot('chk-cmdmenu.png',['.d-cmd .go'])
await b.close()
