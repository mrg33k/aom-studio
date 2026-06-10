/**
 * badges.js — shared badge art + discovery label maps.
 *
 * R18b: extracted from HUD.jsx so the persistent ManifestDrawer (rendered on
 * every screen) and the in-game HUD read the same source of truth.
 */

// Cache-bust version: bump when the Ch1 badge/frame PNGs are re-processed so
// browsers + CDN refetch instead of serving stale opaque (checkerboard) bytes.
const ASSET_V = '?v=2';

export const BADGE_ART = {
  // Chapter 1
  groundwater_hydrology: '/mission-water/chapter-1/badges/badge_groundwater_hydrology.png' + ASSET_V,
  environmental_chemistry: '/mission-water/chapter-1/badges/badge_environmental_chemistry.png' + ASSET_V,
  climate_science: '/mission-water/chapter-1/badges/badge_climate_science.png' + ASSET_V,
  water_security: '/mission-water/chapter-1/badges/badge_water_security.png' + ASSET_V,
  mission_imperative: '/mission-water/chapter-1/badges/badge_mission_imperative.png' + ASSET_V,
  pete_conrad_legacy: '/mission-water/chapter-1/badges/badge_pete_conrad_legacy.png' + ASSET_V,
  // Chapter 2
  badge_ch2_space_hydrology: '/mission-water/chapter-2/badges/badge_ch2_space_hydrology.png',
  badge_ch2_life_support: '/mission-water/chapter-2/badges/badge_ch2_life_support.png',
  badge_ch2_orbital_mechanics: '/mission-water/chapter-2/badges/badge_ch2_orbital_mechanics.png',
  badge_ch2_lunar_water_theory: '/mission-water/chapter-2/badges/badge_ch2_lunar_water_theory.png',
};

export const DISCOVERY_LABELS = {
  // Chapter 1
  groundwater_hydrology: 'GROUNDWATER HYDROLOGY',
  environmental_chemistry: 'ENVIRONMENTAL CHEMISTRY',
  climate_science: 'CLIMATE SCIENCE',
  water_security: 'WATER SECURITY',
  mission_imperative: 'MISSION IMPERATIVE',
  pete_conrad_legacy: 'PETE CONRAD LEGACY',
  social_impact: 'SOCIAL IMPACT',
  public_health: 'PUBLIC HEALTH',
  food_water_nexus: 'FOOD–WATER NEXUS',
  lunar_water_connection: 'LUNAR WATER CONNECTION',
  // Chapter 2
  badge_ch2_space_hydrology: 'SPACE HYDROLOGY',
  badge_ch2_life_support: 'LIFE SUPPORT SYSTEMS',
  badge_ch2_orbital_mechanics: 'ORBITAL MECHANICS',
  badge_ch2_lunar_water_theory: 'LUNAR WATER THEORY',
};

export const BADGE_FRAME = '/mission-water/chapter-1/hud/hud_badge_frame.png' + ASSET_V;
