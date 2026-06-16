import puppeteer from 'puppeteer-core'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const D={w:1440,h:900}, M={w:390,h:844}
const VIEWS=[
  {f:'01-command-deck-desktop.png', url:'http://localhost:8746/',           vw:1460,vh:1000},
  {f:'02-cvg-shell-desktop.png',    url:'http://localhost:5173/cvg',        vw:D.w,vh:D.h},
  {f:'03-chat-room-desktop.png',    url:'http://localhost:5173/cvg',        vw:D.w,vh:D.h, click:'.d-crewrow'},
  {f:'04-command-menu-desktop.png', url:'http://localhost:5173/cvg',        vw:D.w,vh:D.h, click:'.d-cmd .go'},
  {f:'05-support-desktop.png',      url:'http://localhost:5173/cvg?support=1',vw:D.w,vh:D.h},
  {f:'06-cv4-home-desktop.png',     url:'http://localhost:5173/cv4',        vw:D.w,vh:D.h},
  {f:'07-command-deck-mobile.png',  url:'http://localhost:8746/',           vw:M.w,vh:M.h},
  {f:'08-cvg-shell-mobile.png',     url:'http://localhost:5173/cvg',        vw:M.w,vh:M.h},
  {f:'09-chat-room-mobile.png',     url:'http://localhost:5173/cvg',        vw:M.w,vh:M.h, click:'.d-crewrow'},
  {f:'10-support-mobile.png',       url:'http://localhost:5173/cvg?support=1',vw:M.w,vh:M.h},
  {f:'11-cv4-home-mobile.png',      url:'http://localhost:5173/cv4',        vw:M.w,vh:M.h},
]
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--hide-scrollbars','--force-device-scale-factor=2']})
for(const v of VIEWS){
  const p=await b.newPage(); await p.setViewport({width:v.vw,height:v.vh,deviceScaleFactor:2})
  await p.goto(v.url,{waitUntil:'networkidle0',timeout:45000}).catch(()=>{})
  await p.evaluate(()=>document.fonts&&document.fonts.ready).catch(()=>{})
  await new Promise(r=>setTimeout(r,2200))
  if(v.click){ await p.evaluate(s=>document.querySelector(s)?.click(),v.click).catch(()=>{}); await new Promise(r=>setTimeout(r,1800)) }
  await p.screenshot({path:'views/'+v.f})
  console.log('shot',v.f)
  await p.close()
}
await b.close()
