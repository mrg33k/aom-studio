import puppeteer from 'puppeteer-core'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']})
for (const [path,name] of [['/cv4','cv4'],['/cvg','cvg']]){
  const p=await b.newPage()
  await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
  await p.goto('http://localhost:5173'+path,{waitUntil:'networkidle0',timeout:45000}).catch(e=>console.log(path,'goto warn',e.message))
  await new Promise(r=>setTimeout(r,2500))
  const txt=await p.evaluate(()=>document.body.innerText.slice(0,120).replace(/\n/g,' '))
  await p.screenshot({path:'probe-'+name+'.png'})
  console.log(path,'->',JSON.stringify(txt))
  await p.close()
}
await b.close()
