import puppeteer from 'puppeteer-core'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
await p.goto('http://localhost:5173/cvg',{waitUntil:'networkidle0'}).catch(()=>{})
await new Promise(r=>setTimeout(r,2200))
await p.evaluate(()=>document.querySelector('.d-crewrow')?.click())
await new Promise(r=>setTimeout(r,2000))
await p.screenshot({path:'chk-chatroom2.png'})
await b.close(); console.log('done')
