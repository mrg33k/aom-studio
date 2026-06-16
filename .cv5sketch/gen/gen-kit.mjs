import puppeteer from 'puppeteer-core'
import { toFile, fromFile } from '@sketch-hq/sketch-file'
import { randomUUID } from 'crypto'
import { resolve } from 'path'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const UMD=resolve(process.cwd(),'node_modules/html2sketch/dist/html2sketch.min.js')
const OUT=resolve(process.cwd(),'cv5-ui-kit.sketch')
const uuid=()=>randomUUID().toUpperCase()
const ruler={_class:'rulerData',base:0,guides:[]}
const exportOptions={_class:'exportOptions',exportFormats:[],includedLayerIds:[],layerOptions:0,shouldTrim:false}

const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--force-device-scale-factor=1']})
const p=await b.newPage(); await p.setViewport({width:1500,height:1400,deviceScaleFactor:1})
await p.goto('http://localhost:8747/cv5-ui-kit.html',{waitUntil:'networkidle0'}).catch(()=>{})
await p.evaluate(()=>document.fonts&&document.fonts.ready).catch(()=>{})
await new Promise(r=>setTimeout(r,1200))
await p.addScriptTag({path:UMD})
const items=await p.evaluate(async()=>{
  const out=[]
  for(const el of document.querySelectorAll('.kit')){
    const r=el.getBoundingClientRect()
    const g=await window.html2sketch.nodeToGroup(el)
    out.push({name:el.getAttribute('data-name')||'item',json:g.toSketchJSON(),w:Math.max(1,Math.round(r.width)),h:Math.max(1,Math.round(r.height))})
  }
  return out
},)
await b.close()

// grid flow layout
const PAD=70, MAXW=2400, GAPY=80
let x=0,y=0,rowH=0
const artboards=[]
for(const it of items){
  if(x>0 && x+it.w>MAXW){ x=0; y+=rowH+GAPY; rowH=0 }
  it.json.frame={...it.json.frame,x:0,y:0}
  artboards.push({
    _class:'artboard',do_objectID:uuid(),name:it.name,nameIsFixed:true,
    booleanOperation:-1,isFixedToViewport:false,isFlippedHorizontal:false,isFlippedVertical:false,
    isLocked:false,isVisible:true,layerListExpandedType:0,resizingConstraint:63,resizingType:0,
    rotation:0,shouldBreakMaskChain:false,exportOptions,hasClickThrough:true,
    frame:{_class:'rect',constrainProportions:false,x,y,width:it.w,height:it.h},
    clippingMaskMode:0,hasClippingMask:false,groupLayout:{_class:'MSImmutableFreeformGroupLayout'},
    layers:[it.json],hasBackgroundColor:true,
    backgroundColor:{_class:'color',alpha:1,red:0.0078,green:0.031,blue:0.047},
    horizontalRulerData:ruler,verticalRulerData:ruler,
    includeBackgroundColorInExport:true,includeInCloudUpload:true,isFlowHome:false,resizesContent:false,presetDictionary:{},
  })
  const count=(n)=>1+(n.layers||[]).reduce((a,c)=>a+count(c),0)
  console.log('OK',it.name,'-',count(it.json),'layers',it.w+'x'+it.h)
  x+=it.w+PAD; rowH=Math.max(rowH,it.h)
}
const page1={_class:'page',do_objectID:uuid(),name:'CV5 — UI Kit',nameIsFixed:false,
  booleanOperation:-1,isFixedToViewport:false,isFlippedHorizontal:false,isFlippedVertical:false,
  isLocked:false,isVisible:true,layerListExpandedType:0,resizingConstraint:63,resizingType:0,
  rotation:0,shouldBreakMaskChain:false,exportOptions,
  frame:{_class:'rect',constrainProportions:false,x:0,y:0,width:MAXW,height:y+rowH+200},
  clippingMaskMode:0,hasClippingMask:false,hasClickThrough:true,groupLayout:{_class:'MSImmutableFreeformGroupLayout'},
  layers:artboards,horizontalRulerData:ruler,verticalRulerData:ruler,includeInCloudUpload:true}
const document={_class:'document',do_objectID:uuid(),colorSpace:0,currentPageIndex:0,
  assets:{_class:'assetCollection',do_objectID:uuid(),images:[],colorAssets:[],gradientAssets:[],imageCollection:{_class:'imageCollection',images:{}},colors:[],gradients:[],exportPresets:[]},
  foreignLayerStyles:[],foreignSymbols:[],foreignTextStyles:[],foreignSwatches:[],
  layerStyles:{_class:'sharedStyleContainer',do_objectID:uuid(),objects:[]},
  layerSymbols:{_class:'symbolContainer',do_objectID:uuid(),objects:[]},
  layerTextStyles:{_class:'sharedTextStyleContainer',do_objectID:uuid(),objects:[]},
  sharedSwatches:{_class:'swatchContainer',do_objectID:uuid(),objects:[]},
  fontReferences:[],pages:[page1]}
const abE={}; artboards.forEach(a=>abE[a.do_objectID]={name:a.name})
const meta={commit:'',pagesAndArtboards:{[page1.do_objectID]:{name:page1.name,artboards:abE}},
  version:155,compatibilityVersion:99,coeditCompatibilityVersion:155,app:'com.bohemiancoding.sketch3',autosaved:0,variant:'NONAPPSTORE',
  created:{commit:'',appVersion:'2024.1',build:0,app:'com.bohemiancoding.sketch3',compatibilityVersion:99,version:155,variant:'NONAPPSTORE',coeditCompatibilityVersion:155},
  saveHistory:[],appVersion:'2024.1',build:0,fonts:[],pagesAndArtboardsCounts:{}}
const user={document:{pageListHeight:85,pageListCollapsed:0},[page1.do_objectID]:{scrollOrigin:'{0, 0}',zoomValue:0.6}}
await toFile({contents:{document,meta,user,workspace:{}},filepath:OUT})
const re=await fromFile(OUT)
console.log('WROTE',OUT,'- artboards:',re.contents.document.pages[0].layers.length)
