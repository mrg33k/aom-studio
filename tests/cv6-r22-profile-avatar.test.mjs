import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8');
const profile = readFileSync(new URL('../src/dashboard/cv6next/UserProfileAvatar.jsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../src/dashboard/cv6next/Settings.jsx', import.meta.url), 'utf8');
const settingsData = readFileSync(new URL('../src/dashboard/cv6next/data/useSettings.js', import.meta.url), 'utf8');
const avatarApi = readFileSync(new URL('../api/dashboard/avatar.js', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/dashboard/cv6next/SharedNav.jsx', import.meta.url), 'utf8');

test('edit pencil owns the bottom-right edge while active presence moves left', () => {
  assert.match(css, /\.cv6-room-presence \{[\s\S]*?left:-2px;[\s\S]*?right:auto;/);
  assert.match(css, /\.cv6-room-avatar-edit \{[\s\S]*?left:auto;[\s\S]*?right:-3px;[\s\S]*?bottom:-3px;/);
  assert.match(css, /\.cv6-room-avatar-edit \{[\s\S]*?border-radius:50%/);
});

test('signed-in profile exposes the shared initials, color, and picture editor', () => {
  assert.match(profile, /aria-label="Edit your profile picture"/);
  assert.match(profile, /AvatarIdentityDialog/);
  assert.match(profile, /eyebrow="Your profile"/);
  assert.match(settings, /Tap the picture to change its photo, initials, or color\./);
  assert.match(settingsData, /avatar_initials/);
  assert.match(settingsData, /avatar_color/);
  assert.match(settingsData, /remove_image = true/);
});

test('profile writes are authenticated, self-only, and never trust a target user id', () => {
  assert.match(avatarApi, /const who = await callerIdentity\(req\)/);
  assert.match(avatarApi, /you can only update your own profile/);
  assert.match(avatarApi, /const userId = who\.userId/);
  assert.match(avatarApi, /\.\.\.currentMetadata/);
  assert.doesNotMatch(avatarApi, /Access-Control-Allow-Origin', '\*'/);
  assert.match(settingsData, /authFetch\('\/api\/dashboard\/avatar'/);
});

test('desktop profile control reflects the persisted picture and opens Account directly', () => {
  assert.match(nav, /CurrentUserProfileButton/);
  assert.match(nav, /metadata\.avatar_url/);
  assert.match(nav, /cv6:profile-identity-changed/);
  assert.match(nav, /aria-label="Edit your profile"/);
});
