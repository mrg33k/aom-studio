import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/dashboard/cv6next/CornerCV6.jsx', import.meta.url), 'utf8')

test('Home initializes its mission label helper before live mission data refreshes recent rooms', () => {
  const homeStart = source.indexOf('function Home(')
  const helper = source.indexOf('const missionLabelClean =', homeStart)
  const recentProjection = source.indexOf('const recentList =', homeStart)

  assert.notEqual(homeStart, -1)
  assert.notEqual(helper, -1)
  assert.notEqual(recentProjection, -1)
  assert.ok(helper < recentProjection, 'missionLabelClean must be initialized before recent mission rows can call it')
})
