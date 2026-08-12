import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('new users enter the complete onboarding flow on web', () => {
  const main = read('src/main.jsx')
  assert.match(main, /navigate\('\/onboarding', \{ replace: true \}\)/)
  assert.match(main, /path="\/onboarding\/voice" element=\{<Navigate to="\/onboarding" replace \/>\}/)
})

test('onboarding separates account sign-in from read-only searchable mail', () => {
  const login = read('src/pages/Login.jsx')
  const onboarding = read('src/pages/Onboarding.jsx')
  const oauth = read('api/integrations/oauth/start.js')
  assert.match(login, /Continue with Google/)
  assert.match(login, /Continue with Microsoft/)
  assert.match(login, /Continue with Apple/)
  assert.match(login, /Create a free account/)
  assert.match(onboarding, /access=search/)
  assert.match(onboarding, /cannot send, delete, archive, or move/)
  assert.match(oauth, /gmail\.readonly/)
})

test('native app gates new accounts through onboarding', () => {
  const root = read('ios-native/Corner/Views/RootView.swift')
  const screen = read('ios-native/Corner/Views/NativeOnboardingView.swift')
  assert.match(root, /api\.needsOnboarding/)
  assert.match(screen, /Choose your starting brain/)
  assert.match(screen, /searchableMailOAuthURL/)
  assert.match(screen, /Connect read-only/)
})

test('new workspace collision check compares the slug, not UUID owner column', () => {
  const create = read('api/onboarding/create-agents.js')
  assert.match(create, /worlds\?slug=eq\./)
  assert.doesNotMatch(create, /or=\(slug\.eq\.[^`]+client_id\.eq/)
})
