import puppeteer from 'puppeteer-core'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']})
const p=await b.newPage(); await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
await p.goto('http://localhost:5173/cvg',{waitUntil:'networkidle0'}).catch(()=>{})
await new Promise(r=>setTimeout(r,2200))
// try clicking crew row via el.click()
const clicked = await p.evaluate(()=>{ const el=document.querySelector('.d-crewrow'); if(el){el.click();return el.textContent.trim().slice(0,30)} return 'NO .d-crewrow' })
console.log('crew click ->', clicked)
await new Promise(r=>setTimeout(r,1800))
let state = await p.evaluate(()=>({ hasComposer: !!document.querySelector('textarea, [contenteditable="true"]'), body: document.body.innerText.replace(/\n/g,' ').slice(0,140) }))
console.log('after crew click:', JSON.stringify(state))
// fallback: try drawer AGENTS section — list agent buttons
const agentsInfo = await p.evaluate(()=>{
  const cands=[...document.querySelectorAll('button,[role=button],a')].filter(e=>/elon|rex|gary/i.test(e.textContent||''))
  return cands.slice(0,6).map(e=>({t:(e.textContent||'').trim().slice(0,24), cls:e.className.slice(0,40)}))
})
console.log('agent-like clickables:', JSON.stringify(agentsInfo))
await b.close()
