import puppeteer from 'puppeteer-core'
import { toFile, fromFile } from '@sketch-hq/sketch-file'
import { randomUUID } from 'crypto'
import { resolve } from 'path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = process.argv[2] || 'http://localhost:8747/cv5-command-deck.html'
const SEL = process.argv[3] || '.deck'
const NAME = process.argv[4] || 'Command Deck — Desktop'
const OUT = process.argv[5] || resolve(process.cwd(), 'out.sketch')
const UMD = resolve(process.cwd(), 'node_modules/html2sketch/dist/html2sketch.min.js')

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--force-device-scale-factor=1'] })
const page = await browser.newPage()
await page.setViewport({ width: 1460, height: 1000, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.evaluate(() => document.fonts && document.fonts.ready)
await new Promise(r => setTimeout(r, 800))
await page.addScriptTag({ path: UMD })

const { groupJSON, box } = await page.evaluate(async (sel) => {
  const node = document.querySelector(sel) || document.body
  const r = node.getBoundingClientRect()
  const g = await window.html2sketch.nodeToGroup(node)
  return { groupJSON: g.toSketchJSON(), box: { w: Math.round(r.width), h: Math.round(r.height) } }
}, SEL)
await browser.close()

// count layers
const count = (n) => 1 + (n.layers || []).reduce((a, c) => a + count(c), 0)
console.log('converted layers (group tree nodes):', count(groupJSON), 'artboard', box.w + 'x' + box.h)

// place group at origin inside the artboard
groupJSON.frame = { ...groupJSON.frame, x: 0, y: 0 }

const uuid = () => randomUUID().toUpperCase()
const ruler = { _class: 'rulerData', base: 0, guides: [] }
const exportOptions = { _class: 'exportOptions', exportFormats: [], includedLayerIds: [], layerOptions: 0, shouldTrim: false }

const artboard = {
  _class: 'artboard', do_objectID: uuid(), name: NAME, nameIsFixed: true,
  booleanOperation: -1, isFixedToViewport: false, isFlippedHorizontal: false, isFlippedVertical: false,
  isLocked: false, isVisible: true, layerListExpandedType: 0, resizingConstraint: 63, resizingType: 0,
  rotation: 0, shouldBreakMaskChain: false, exportOptions, hasClickThrough: true,
  frame: { _class: 'rect', constrainProportions: false, x: 0, y: 0, width: box.w, height: box.h },
  clippingMaskMode: 0, hasClippingMask: false, groupLayout: { _class: 'MSImmutableFreeformGroupLayout' },
  layers: [groupJSON],
  hasBackgroundColor: true,
  backgroundColor: { _class: 'color', alpha: 1, red: 0.0196, green: 0.051, blue: 0.075 },
  horizontalRulerData: ruler, verticalRulerData: ruler,
  includeBackgroundColorInExport: true, includeInCloudUpload: true, isFlowHome: false,
  resizesContent: false, presetDictionary: {},
}

const page1 = {
  _class: 'page', do_objectID: uuid(), name: 'Corner V5', nameIsFixed: false,
  booleanOperation: -1, isFixedToViewport: false, isFlippedHorizontal: false, isFlippedVertical: false,
  isLocked: false, isVisible: true, layerListExpandedType: 0, resizingConstraint: 63, resizingType: 0,
  rotation: 0, shouldBreakMaskChain: false, exportOptions,
  frame: { _class: 'rect', constrainProportions: false, x: 0, y: 0, width: box.w, height: box.h },
  clippingMaskMode: 0, hasClippingMask: false, hasClickThrough: true,
  groupLayout: { _class: 'MSImmutableFreeformGroupLayout' },
  layers: [artboard],
  horizontalRulerData: ruler, verticalRulerData: ruler, includeInCloudUpload: true,
}

const documentId = uuid()
const document = {
  _class: 'document', do_objectID: documentId,
  colorSpace: 0, currentPageIndex: 0,
  assets: { _class: 'assetCollection', do_objectID: uuid(), images: [], colorAssets: [], gradientAssets: [], imageCollection: { _class: 'imageCollection', images: {} }, colors: [], gradients: [], exportPresets: [] },
  foreignLayerStyles: [], foreignSymbols: [], foreignTextStyles: [], foreignSwatches: [],
  layerStyles: { _class: 'sharedStyleContainer', do_objectID: uuid(), objects: [] },
  layerSymbols: { _class: 'symbolContainer', do_objectID: uuid(), objects: [] },
  layerTextStyles: { _class: 'sharedTextStyleContainer', do_objectID: uuid(), objects: [] },
  sharedSwatches: { _class: 'swatchContainer', do_objectID: uuid(), objects: [] },
  fontReferences: [],
  pages: [page1],
}

const meta = {
  commit: '', pagesAndArtboards: { [page1.do_objectID]: { name: page1.name, artboards: { [artboard.do_objectID]: { name: artboard.name } } } },
  version: 155, compatibilityVersion: 99, coeditCompatibilityVersion: 155,
  app: 'com.bohemiancoding.sketch3', autosaved: 0, variant: 'NONAPPSTORE',
  created: { commit: '', appVersion: '2024.1', build: 0, app: 'com.bohemiancoding.sketch3', compatibilityVersion: 99, version: 155, variant: 'NONAPPSTORE', coeditCompatibilityVersion: 155 },
  saveHistory: [], appVersion: '2024.1', build: 0,
  fonts: [], pagesAndArtboardsCounts: {},
}
const user = { document: { pageListHeight: 85, pageListCollapsed: 0 }, [page1.do_objectID]: { scrollOrigin: '{0, 0}', zoomValue: 1 } }

await toFile({ contents: { document, meta, user, workspace: {} }, filepath: OUT })
console.log('wrote', OUT)
// verify reopen
const re = await fromFile(OUT)
console.log('reopened OK — pages:', re.contents.document.pages.length, 'top layers on page:', re.contents.document.pages[0].layers.length)
