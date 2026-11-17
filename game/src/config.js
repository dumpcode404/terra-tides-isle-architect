// TERRACOTTA TIDES: ISLE ARCHITECT — tuning, tiles, chapters.
// 2.5D isometric cozy tactical puzzle. Logical playfield 960x600.

export const FIELD = { width: 960, height: 600 };

export const ISO = { tw: 76, th: 38, hstep: 13, ox: 480, oy: 150 };
export const GRID = 7;

export const TILE = {
  FOREST: 'forest',
  VILLAGE: 'village',
  FARM: 'farm',
  WINDMILL: 'windmill',
  HARBOR: 'harbor',
  SHRINE: 'shrine',
};

export const TILE_INFO = {
  forest: { name: 'Forest', color: '#3a8a4a', dark: '#1d5a2a' },
  village: { name: 'Village', color: '#e8a05a', dark: '#8a5a2a' },
  farm: { name: 'Terrace', color: '#b8c04a', dark: '#6a7a2a' },
  windmill: { name: 'Windmill', color: '#f0e8d8', dark: '#8a7a5a' },
  harbor: { name: 'Harbor', color: '#4aa4c8', dark: '#1d5a7a' },
  shrine: { name: 'Shrine', color: '#c86a9a', dark: '#6a2a4a' },
};

// River edges on [N,E,S,W] at rotation 0; rotation shifts them clockwise.
export const RIVER_MASK = {
  forest: [0, 0, 0, 0],
  village: [0, 0, 0, 0],
  farm: [1, 0, 0, 0],
  windmill: [0, 0, 0, 0],
  harbor: [1, 0, 0, 0],
  shrine: [1, 0, 1, 0],
};

export const CHAPTERS = [
  { name: 'SPRING DELTA', target: 800, star3: 1200, tiles: 12, seed: 11, palette: 0, bag: ['forest', 'forest', 'village', 'farm', 'farm', 'windmill', 'harbor', 'shrine', 'forest', 'village', 'farm', 'harbor'] },
  { name: 'AMBER HIGHLANDS', target: 1600, star3: 2400, tiles: 14, seed: 23, palette: 1, bag: ['forest', 'village', 'farm', 'windmill', 'windmill', 'harbor', 'shrine', 'shrine', 'farm', 'village', 'forest', 'harbor', 'windmill', 'farm'] },
  { name: 'CRIMSON ESTUARY', target: 2400, star3: 3400, tiles: 16, seed: 37, palette: 2, bag: ['forest', 'village', 'village', 'farm', 'windmill', 'harbor', 'harbor', 'shrine', 'shrine', 'farm', 'forest', 'windmill', 'village', 'harbor', 'farm', 'shrine'] },
];

export const PALETTES = [
  { water: '#3aa4c8', waterDeep: '#1d6a9a', sand: '#e8cf9a', grass: '#6aba5e', sun: '#fff3d0', sky: ['#a8d8f0', '#f7e8c8'] },
  { water: '#4a9ac0', waterDeep: '#2a5a8a', sand: '#dfb070', grass: '#a8a04a', sun: '#ffe9b0', sky: ['#f7c98a', '#e89a6a'] },
  { water: '#7a4a9a', waterDeep: '#3a2a5a', sand: '#c88a6a', grass: '#7a8a4a', sun: '#ffb08a', sky: ['#b0506a', '#5a3a6a'] },
];

export const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];
