import puppeteer from 'puppeteer-core'
import { toFile, fromFile } from '@sketch-hq/sketch-file'
import { randomUUID } from 'crypto'
import { resolve } from 'path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const UMD = resolve(process.cwd(), 'node_modules/html2sketch/dist/html2sketch.min.js')
const OUT = resolve(process.cwd(), 'corner-screens.sketch')
const uuid = () => randomUUID().toUpperCase()
const ruler = { _class: 'rulerData', base: 0, guides: [] }
const exportOptions = { _class: 'exportOptions', exportFormats: [], includedLayerIds: [], layerOptions: 0, shouldTrim: false }

// row 0 = desktop, row 1 = mobile. actions = [{click, wait}]
const D = { w: 1440, h: 900 }, M = { w: 390, h: 844 }
const SCREENS = [
  { row:0, url:'http://localhost:8746/',              sel:'.deck', name:'CV5 — Command Deck (home)',        vw:1460, vh:1000 },
  { row:0, url:'http://localhost:5173/cvg',           sel:'body',  name:'CV5 — /cvg full shell (nav + menus)', vw:D.w, vh:D.h },
  { row:0, url:'http://localhost:5173/cvg',           sel:'body',  name:'CV5 — Chat room (1:1 agent)',       vw:D.w, vh:D.h, actions:[{click:'.d-crewrow',wait:1800}] },
  { row:0, url:'http://localhost:5173/cvg',           sel:'body',  name:'CV5 — Command menu (open)',         vw:D.w, vh:D.h, actions:[{click:'.d-cmd .go',wait:1400}] },
  { row:0, url:'http://localhost:5173/cvg?support=1', sel:'body',  name:'CV5 — Support dashboard',           vw:D.w, vh:D.h },
  { row:0, url:'http://localhost:5173/cv4',           sel:'body',  name:'CV4 — Home (current design)',        vw:D.w, vh:D.h },
  // mobile row
  { row:1, url:'http://localhost:8746/',              sel:'.deck', name:'CV5 — Command Deck (mobile)',        vw:M.w, vh:M.h },
  { row:1, url:'http://localhost:5173/cvg',           sel:'body',  name:'CV5 — /cvg shell (mobile)',          vw:M.w, vh:M.h },
  { row:1, url:'http://localhost:5173/cvg',           sel:'body',  name:'CV5 — Chat room (mobile)',           vw:M.w, vh:M.h, actions:[{click:'.d-crewrow',wait:1800}] },
  { row:1, url:'http://localhost:5173/cvg?support=1', sel:'body',  name:'CV5 — Support (mobile)',             vw:M.w, vh:M.h },
  { row:1, url:'http://localhost:5173/cv4',           sel:'body',  name:'CV4 — Home (mobile)',                vw:M.w, vh:M.h },
]

const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new', args:['--no-sandbox','--force-device-scale-factor=1'] })
const artboards = []
const cursor = { 0:0, 1:0 }
const ROWY = { 0:0, 1:1180 }
for (const s of SCREENS) {
  try {
    const page = await browser.newPage()
    await page.setViewport({ width:s.vw, height:s.vh, deviceScaleFactor:1 })
    await page.goto(s.url, { waitUntil:'networkidle0', timeout:45000 }).catch(()=>{})
    await page.evaluate(()=>document.fonts&&document.fonts.ready).catch(()=>{})
    await new Promise(r=>setTimeout(r,2000))
    for (const a of (s.actions||[])) {
      try { await page.evaluate(sel=>document.querySelector(sel)?.click(), a.click); await new Promise(r=>setTimeout(r,a.wait||1200)) }
      catch(e){ console.log('  action skip', a.click, e.message.split('\n')[0]) }
    }
    await page.addScriptTag({ path: UMD })
    const { groupJSON, box } = await page.evaluate(async (sel)=>{
      const node = document.querySelector(sel) || document.body
      const r = node.getBoundingClientRect()
      const g = await window.html2sketch.nodeToGroup(node)
      return { groupJSON:g.toSketchJSON(), box:{ w:Math.max(1,Math.round(r.width)), h:Math.max(1,Math.round(r.height)) } }
    }, s.sel)
    const count = (n)=>1+(n.layers||[]).reduce((a,c)=>a+count(c),0)
    groupJSON.frame = { ...groupJSON.frame, x:0, y:0 }
    const x = cursor[s.row], y = ROWY[s.row]
    const ab = {
      _class:'artboard', do_objectID:uuid(), name:s.name, nameIsFixed:true,
      booleanOperation:-1, isFixedToViewport:false, isFlippedHorizontal:false, isFlippedVertical:false,
      isLocked:false, isVisible:true, layerListExpandedType:0, resizingConstraint:63, resizingType:0,
      rotation:0, shouldBreakMaskChain:false, exportOptions, hasClickThrough:true,
      frame:{ _class:'rect', constrainProportions:false, x, y, width:box.w, height:box.h },
      clippingMaskMode:0, hasClippingMask:false, groupLayout:{ _class:'MSImmutableFreeformGroupLayout' },
      layers:[groupJSON], hasBackgroundColor:true,
      backgroundColor:{ _class:'color', alpha:1, red:0.0196, green:0.051, blue:0.075 },
      horizontalRulerData:ruler, verticalRulerData:ruler,
      includeBackgroundColorInExport:true, includeInCloudUpload:true, isFlowHome:false,
      resizesContent:false, presetDictionary:{},
    }
    artboards.push(ab)
    cursor[s.row] += box.w + (s.row===1?60:120)
    console.log('OK', s.name, '-', count(groupJSON), 'layers', box.w+'x'+box.h)
    await page.close()
  } catch(e){ console.log('FAIL', s.name, '-', e.message.split('\n')[0]) }
}
await browser.close()

const totalW = Math.max(cursor[0], cursor[1], 1)
const page1 = {
  _class:'page', do_objectID:uuid(), name:'Corner — Screens', nameIsFixed:false,
  booleanOperation:-1, isFixedToViewport:false, isFlippedHorizontal:false, isFlippedVertical:false,
  isLocked:false, isVisible:true, layerListExpandedType:0, resizingConstraint:63, resizingType:0,
  rotation:0, shouldBreakMaskChain:false, exportOptions,
  frame:{ _class:'rect', constrainProportions:false, x:0, y:0, width:totalW, height:2100 },
  clippingMaskMode:0, hasClippingMask:false, hasClickThrough:true,
  groupLayout:{ _class:'MSImmutableFreeformGroupLayout' }, layers:artboards,
  horizontalRulerData:ruler, verticalRulerData:ruler, includeInCloudUpload:true,
}
const document = {
  _class:'document', do_objectID:uuid(), colorSpace:0, currentPageIndex:0,
  assets:{ _class:'assetCollection', do_objectID:uuid(), images:[], colorAssets:[], gradientAssets:[], imageCollection:{ _class:'imageCollection', images:{} }, colors:[], gradients:[], exportPresets:[] },
  foreignLayerStyles:[], foreignSymbols:[], foreignTextStyles:[], foreignSwatches:[],
  layerStyles:{ _class:'sharedStyleContainer', do_objectID:uuid(), objects:[] },
  layerSymbols:{ _class:'symbolContainer', do_objectID:uuid(), objects:[] },
  layerTextStyles:{ _class:'sharedTextStyleContainer', do_objectID:uuid(), objects:[] },
  sharedSwatches:{ _class:'swatchContainer', do_objectID:uuid(), objects:[] },
  fontReferences:[], pages:[page1],
}
const abEntries = {}; artboards.forEach(a=>abEntries[a.do_objectID]={ name:a.name })
const meta = {
  commit:'', pagesAndArtboards:{ [page1.do_objectID]:{ name:page1.name, artboards:abEntries } },
  version:155, compatibilityVersion:99, coeditCompatibilityVersion:155,
  app:'com.bohemiancoding.sketch3', autosaved:0, variant:'NONAPPSTORE',
  created:{ commit:'', appVersion:'2024.1', build:0, app:'com.bohemiancoding.sketch3', compatibilityVersion:99, version:155, variant:'NONAPPSTORE', coeditCompatibilityVersion:155 },
  saveHistory:[], appVersion:'2024.1', build:0, fonts:[], pagesAndArtboardsCounts:{},
}
const user = { document:{ pageListHeight:85, pageListCollapsed:0 }, [page1.do_objectID]:{ scrollOrigin:'{0, 0}', zoomValue:0.4 } }
await toFile({ contents:{ document, meta, user, workspace:{} }, filepath:OUT })
const re = await fromFile(OUT)
console.log('WROTE', OUT, '- artboards:', re.contents.document.pages[0].layers.length)
