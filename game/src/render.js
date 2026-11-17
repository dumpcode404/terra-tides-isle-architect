// 2.5D isometric diorama: water, cliffs, tiled buildings, rivers, boats,
// ghost previews, synergy arcs, HUD and every screen.

import { DIRS, FIELD, GRID, ISO, PALETTES, RIVER_MASK, TILE_INFO } from './config.js';
import {
  SCREEN_CAMPAIGNWIN, SCREEN_CHAPTERWIN, SCREEN_FAIL,
  SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE,
} from './world.js';

function paletteOf(state) {
  const p = state.mode === 'campaign' && state.chapter >= 0
    ? [0, 1, 2][state.chapter % 3]
    : (Math.floor(state.time / 20) % 3);
  return PALETTES[p];
}

export function isoCell(cx, cy, h) {
  return {
    x: ISO.ox + ((cx - cy) * ISO.tw) / 2,
    y: ISO.oy + ((cx + cy) * ISO.th) / 2 - (h || 0) * ISO.hstep,
  };
}

function diamond(g, x, y, w, h) {
  g.beginPath();
  g.moveTo(x, y - h / 2);
  g.lineTo(x + w / 2, y);
  g.lineTo(x, y + h / 2);
  g.lineTo(x - w / 2, y);
  g.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${gg},${b})`;
}

function drawWaterCell(g, x, y, time, pal, seed) {
  diamond(g, x, y, ISO.tw, ISO.th);
  g.fillStyle = pal.water;
  g.fill();
  // Ripple highlights.
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 1.5;
  const off = Math.sin(time * 1.6 + seed + x * 0.05) * 4;
  g.beginPath();
  g.moveTo(x - 18, y + off * 0.4);
  g.quadraticCurveTo(x - 6, y - 5 + off, x + 6, y + off * 0.4);
  g.quadraticCurveTo(x + 14, y + 4 + off, x + 22, y - 2 + off);
  g.stroke();
}

function drawLandCell(g, x, y, h, pal) {
  if (h > 0) {
    // Cliff faces.
    g.fillStyle = '#a86a42';
    g.strokeStyle = '#5a3420';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x - ISO.tw / 2, y);
    g.lineTo(x, y + ISO.th / 2);
    g.lineTo(x, y + ISO.th / 2 + ISO.hstep);
    g.lineTo(x - ISO.tw / 2, y + ISO.hstep);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#8a4f30';
    g.beginPath();
    g.moveTo(x + ISO.tw / 2, y);
    g.lineTo(x, y + ISO.th / 2);
    g.lineTo(x, y + ISO.th / 2 + ISO.hstep);
    g.lineTo(x + ISO.tw / 2, y + ISO.hstep);
    g.closePath();
    g.fill();
    g.stroke();
  }
  // Sand rim + grass top.
  diamond(g, x, y, ISO.tw, ISO.th);
  g.fillStyle = pal.sand;
  g.fill();
  diamond(g, x, y - 3, ISO.tw - 10, ISO.th - 5);
  g.fillStyle = pal.grass;
  g.fill();
  g.strokeStyle = 'rgba(60,40,20,0.35)';
  g.lineWidth = 1;
  g.stroke();
}

function drawRiverBits(g, x, y, type, rot) {
  const base = RIVER_MASK[type];
  g.strokeStyle = '#7ad4e8';
  g.lineWidth = 5;
  g.lineCap = 'round';
  for (let e = 0; e < 4; e += 1) {
    if (!base[e]) continue;
    const re = (e + rot) % 4;
    g.beginPath();
    g.moveTo(x, y);
    if (re === 0) g.lineTo(x + 10, y - 9);
    else if (re === 1) g.lineTo(x + 19, y);
    else if (re === 2) g.lineTo(x + 10, y + 9);
    else g.lineTo(x - 19, y);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 1.5;
  for (let e = 0; e < 4; e += 1) {
    if (!base[e]) continue;
    const re = (e + rot) % 4;
    g.beginPath();
    g.moveTo(x, y);
    if (re === 0) g.lineTo(x + 10, y - 9);
    else if (re === 1) g.lineTo(x + 19, y);
    else if (re === 2) g.lineTo(x + 10, y + 9);
    else g.lineTo(x - 19, y);
    g.stroke();
  }
}

function drawTree(g, x, y, s, sway, bloom) {
  g.strokeStyle = '#3a5a26';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + sway, y - 8 * s);
  g.stroke();
  const layers = bloom > 0 ? ['#ff9dc0', '#7fd67f', '#3a8a4a'] : ['#5aa85e', '#3a8a4a', '#2a6a3a'];
  for (let i = 0; i < 3; i += 1) {
    g.fillStyle = layers[i];
    g.beginPath();
    g.arc(x + sway * (i + 1) * 0.4, y - (10 + i * 6) * s, (9 - i * 2) * s, 0, Math.PI * 2);
    g.fill();
  }
}

function drawForest(g, x, y, time, seed, bloom) {
  drawTree(g, x - 12, y + 2, 0.9, Math.sin(time * 1.4 + seed) * 2, bloom);
  drawTree(g, x + 10, y + 4, 1.1, Math.sin(time * 1.4 + seed + 2) * 2, bloom);
  drawTree(g, x - 1, y - 6, 0.7, Math.sin(time * 1.4 + seed + 4) * 2, bloom);
}

function drawHouse(g, x, y, w, h, wall, roof) {
  g.fillStyle = wall;
  g.strokeStyle = '#5a3a20';
  g.lineWidth = 1.5;
  g.fillRect(x - w / 2, y - h, w, h);
  g.strokeRect(x - w / 2, y - h, w, h);
  g.fillStyle = roof;
  g.beginPath();
  g.moveTo(x - w / 2 - 3, y - h);
  g.lineTo(x, y - h - 9);
  g.lineTo(x + w / 2 + 3, y - h);
  g.closePath();
  g.fill();
  g.stroke();
}

function drawVillage(g, x, y, time) {
  drawHouse(g, x - 11, y + 3, 15, 13, '#f0d8a8', '#b0503a');
  drawHouse(g, x + 11, y + 5, 13, 11, '#e8c898', '#a04838');
  // Lantern dots.
  const glow = 0.6 + 0.4 * Math.sin(time * 3);
  g.fillStyle = `rgba(255,220,130,${glow})`;
  g.beginPath();
  g.arc(x - 11, y - 6, 2.5, 0, Math.PI * 2);
  g.arc(x + 11, y - 3, 2.5, 0, Math.PI * 2);
  g.fill();
}

function drawFarm(g, x, y) {
  g.strokeStyle = '#6a7a2a';
  g.lineWidth = 2;
  for (let i = -1; i <= 1; i += 1) {
    g.beginPath();
    g.moveTo(x - 20, y + i * 6);
    g.lineTo(x + 20, y + i * 6);
    g.stroke();
  }
  g.fillStyle = '#7fd67f';
  for (let i = 0; i < 6; i += 1) {
    const px = x - 15 + (i % 3) * 15;
    const py = y - 6 + Math.floor(i / 3) * 12;
    g.fillRect(px - 1.5, py - 5, 3, 5);
  }
}

function drawWindmill(g, x, y, time) {
  g.fillStyle = '#f0e8d8';
  g.strokeStyle = '#6a5a40';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 6, y + 6);
  g.lineTo(x - 3, y - 16);
  g.lineTo(x + 3, y - 16);
  g.lineTo(x + 6, y + 6);
  g.closePath();
  g.fill();
  g.stroke();
  const a = time * 1.8;
  g.strokeStyle = '#8a7a5a';
  g.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const aa = a + (i * Math.PI) / 2;
    g.beginPath();
    g.moveTo(x, y - 16);
    g.lineTo(x + Math.cos(aa) * 17, y - 16 + Math.sin(aa) * 17);
    g.stroke();
  }
  g.fillStyle = '#b0503a';
  g.beginPath();
  g.arc(x, y - 16, 3, 0, Math.PI * 2);
  g.fill();
}

function drawHarbor(g, x, y, time) {
  // Pier planks toward the bottom edge.
  g.fillStyle = '#8a6a4a';
  g.strokeStyle = '#4a3420';
  g.lineWidth = 1.5;
  for (let i = -1; i <= 1; i += 1) {
    g.fillRect(x + i * 9 - 3, y - 2, 6, 16);
    g.strokeRect(x + i * 9 - 3, y - 2, 6, 16);
  }
  g.fillStyle = '#6a4a2a';
  g.fillRect(x - 14, y + 8, 28, 5);
  // Moored boat bobbing.
  const bob = Math.sin(time * 2) * 2;
  g.fillStyle = '#b0503a';
  g.beginPath();
  g.ellipse(x + 24, y + 10 + bob, 9, 4, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#4a2018';
  g.stroke();
  g.strokeStyle = '#4a3420';
  g.beginPath();
  g.moveTo(x + 24, y + 10 + bob);
  g.lineTo(x + 24, y - 4 + bob);
  g.stroke();
  g.fillStyle = '#fff3d6';
  g.beginPath();
  g.moveTo(x + 24, y - 4 + bob);
  g.lineTo(x + 31, y + 6 + bob);
  g.lineTo(x + 24, y + 6 + bob);
  g.closePath();
  g.fill();
}

function drawShrine(g, x, y, time) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
  g.save();
  g.shadowColor = '#ff9dc0';
  g.shadowBlur = 12 * pulse + 4;
  g.strokeStyle = '#c86a9a';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x - 13, y + 6);
  g.lineTo(x - 13, y - 12);
  g.moveTo(x + 13, y + 6);
  g.lineTo(x + 13, y - 12);
  g.stroke();
  g.beginPath();
  g.moveTo(x - 18, y - 12);
  g.quadraticCurveTo(x, y - 18, x + 18, y - 12);
  g.stroke();
  g.restore();
  g.fillStyle = '#ffe9f2';
  g.beginPath();
  g.arc(x, y - 2, 4 + pulse * 1.5, 0, Math.PI * 2);
  g.fill();
}

function drawTileTop(g, type, x, y, rot, time, seed, bloom) {
  drawRiverBits(g, x, y, type, rot);
  if (type === 'forest') drawForest(g, x, y, time, seed, bloom);
  else if (type === 'village') drawVillage(g, x, y, time);
  else if (type === 'farm') drawFarm(g, x, y);
  else if (type === 'windmill') drawWindmill(g, x, y, time);
  else if (type === 'harbor') drawHarbor(g, x, y, time);
  else if (type === 'shrine') drawShrine(g, x, y, time);
}

function drawBoat(g, x, y, time, flip) {
  const bob = Math.sin(time * 1.7 + x) * 2;
  g.save();
  g.translate(x, y + bob);
  if (flip) g.scale(-1, 1);
  g.fillStyle = '#8a4a3a';
  g.strokeStyle = '#3a2018';
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.strokeStyle = '#3a2418';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, -14);
  g.stroke();
  g.fillStyle = '#fff3d6';
  g.beginPath();
  g.moveTo(0, -14);
  g.lineTo(9, 1);
  g.lineTo(0, 1);
  g.closePath();
  g.fill();
  g.restore();
}

function drawHud(g, s) {
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.font = 'bold 24px Georgia, serif';
  g.fillStyle = '#4a2a10';
  g.fillText(String(s.score).padStart(6, '0'), 18, 12);
  g.font = '13px Georgia, serif';
  g.fillStyle = 'rgba(74,42,16,0.75)';
  g.fillText(`BEST ${Math.max(s.best, s.score)}`, 18, 42);
  // Objective tracker.
  g.textAlign = 'center';
  if (s.mode === 'campaign' && s.chapter >= 0) {
    const names = ['SPRING DELTA', 'AMBER HIGHLANDS', 'CRIMSON ESTUARY'];
    const targets = [800, 1600, 2400];
    g.font = 'bold 17px Georgia, serif';
    g.fillStyle = '#4a2a10';
    g.fillText(`CHAPTER ${s.chapter + 1} — ${names[s.chapter]}`, FIELD.width / 2, 12);
    const t = targets[s.chapter];
    g.fillStyle = 'rgba(74,42,16,0.3)';
    const bw = 300;
    g.fillRect(FIELD.width / 2 - bw / 2, 34, bw, 9);
    g.fillStyle = '#3a8a3a';
    g.fillRect(FIELD.width / 2 - bw / 2, 34, bw * Math.min(1, s.score / t), 9);
    g.font = '12px Georgia, serif';
    g.fillStyle = 'rgba(74,42,16,0.8)';
    g.fillText(`${s.score} / ${t} · ${s.tilesLeft === Infinity ? '∞' : s.tilesLeft} TILES`, FIELD.width / 2, 45);
  } else {
    g.font = 'bold 17px Georgia, serif';
    g.fillStyle = '#4a2a10';
    g.fillText('ENDLESS ARCHIPELAGO', FIELD.width / 2, 12);
    g.font = '12px Georgia, serif';
    g.fillStyle = 'rgba(74,42,16,0.8)';
    g.fillText(`${s.placements} TILES PLACED`, FIELD.width / 2, 36);
  }
  // Combo.
  if (s.combo >= 2) {
    g.textAlign = 'right';
    g.font = 'bold 22px Georgia, serif';
    g.fillStyle = '#a02a1a';
    g.fillText(`COMBO x${s.combo}`, FIELD.width - 16, 12);
  }
  // Hint marker text.
  if (s.harvest) {
    g.textAlign = 'center';
    g.font = '13px Georgia, serif';
    g.fillStyle = '#a02828';
    g.fillText(s.harvest, FIELD.width / 2, FIELD.height - 58);
  }
  // Hand dock.
  s.handRects.length = 0;
  const hw = 86;
  const hh = 64;
  const hx0 = 18;
  const hy = FIELD.height - hh - 10;
  g.textAlign = 'left';
  g.font = 'bold 11px Georgia, serif';
  g.fillStyle = '#4a2a10';
  g.fillText('TILES  (1/2/3 · click)', hx0, hy - 16);
  s.hand.forEach((t, i) => {
    const x = hx0 + i * (hw + 8);
    s.handRects.push({ x, y: hy, w: hw, h: hh });
    g.fillStyle = i === s.sel ? 'rgba(255,243,214,0.95)' : 'rgba(48,28,14,0.82)';
    g.fillRect(x, hy, hw, hh);
    g.strokeStyle = i === s.sel ? '#ffe95e' : 'rgba(255,233,150,0.4)';
    g.lineWidth = i === s.sel ? 3 : 1.5;
    g.strokeRect(x, hy, hw, hh);
    const info = TILE_INFO[t];
    g.fillStyle = i === s.sel ? '#4a2a10' : '#f7e8c8';
    g.font = 'bold 11px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(info.name.toUpperCase(), x + hw / 2, hy + 8);
    // Mini iso diamond swatch.
    diamond(g, x + hw / 2, hy + 42, 44, 22);
    g.fillStyle = info.color;
    g.fill();
    g.strokeStyle = info.dark;
    g.lineWidth = 1.5;
    g.stroke();
  });
  // Tool buttons: rotate / undo / hint.
  s.toolRects.length = 0;
  const tools = [['ROTATE', 'Q/E · click'], ['UNDO', 'Z'], ['HINT', 'H']];
  tools.forEach((tl, i) => {
    const x = FIELD.width - 3 * 92 + i * 92;
    const y = FIELD.height - 74;
    s.toolRects.push({ x, y, w: 84, h: 64 });
    g.fillStyle = 'rgba(48,28,14,0.82)';
    g.fillRect(x, y, 84, 64);
    g.strokeStyle = 'rgba(255,233,150,0.4)';
    g.lineWidth = 1.5;
    g.strokeRect(x, y, 84, 64);
    g.fillStyle = '#ffe95e';
    g.font = 'bold 12px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(tl[0], x + 42, y + 12);
    g.fillStyle = '#c8a06a';
    g.font = '11px Georgia, serif';
    g.fillText(tl[1], x + 42, y + 34);
  });
  // Mute.
  g.textAlign = 'right';
  g.font = '12px Georgia, serif';
  g.fillStyle = 'rgba(74,42,16,0.7)';
  g.fillText(s.muted ? 'M: UNMUTE' : 'M: MUTE', FIELD.width - 12, FIELD.height - 14);
}

function drawStars(g, cx, y, n) {
  for (let i = 0; i < 3; i += 1) {
    const x = cx + (i - 1) * 52;
    const lit = i < n;
    g.save();
    g.shadowColor = lit ? '#ffe95e' : 'transparent';
    g.shadowBlur = lit ? 12 : 0;
    g.fillStyle = lit ? '#ffe95e' : 'rgba(255,233,150,0.3)';
    g.strokeStyle = lit ? '#a86a1a' : 'rgba(255,233,150,0.4)';
    g.lineWidth = 2;
    g.beginPath();
    for (let k = 0; k < 10; k += 1) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 === 0 ? 20 : 8.5;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }
}

function panel(g, x, y, w, h) {
  g.fillStyle = 'rgba(40,24,12,0.9)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#ffe95e';
  g.lineWidth = 2.5;
  g.strokeRect(x, y, w, h);
}

function drawTitle(g, s, input) {
  const cx = FIELD.width / 2;
  panel(g, cx - 350, 64, 700, 200);
  g.textAlign = 'center';
  g.font = 'bold 56px Georgia, serif';
  g.fillStyle = '#ffe95e';
  g.fillText('TERRACOTTA TIDES', cx, 124);
  g.font = 'bold 24px Georgia, serif';
  g.fillStyle = '#ffcf7a';
  g.fillText('· ISLE ARCHITECT ·', cx, 162);
  g.font = '15px Georgia, serif';
  g.fillStyle = '#f7e8c8';
  g.fillText('Draft tiles, weave rivers, bloom forests — build the archipelago.', cx, 196);
  g.fillText('Match biomes · link harbors · wake the shrines · chase the cascade.', cx, 218);
  // Mode cards.
  s.modeRects.length = 0;
  const cards = [
    ['CAMPAIGN', '3 hand-crafted chapters', '3-star objectives'],
    ['ENDLESS', 'Infinite tiles', 'chase your best'],
  ];
  cards.forEach((c, i) => {
    const w = 250;
    const h = 130;
    const x = cx - 265 + i * 280;
    const y = 300;
    s.modeRects.push({ x, y, w, h });
    panel(g, x, y, w, h);
    g.fillStyle = '#ffe95e';
    g.font = 'bold 22px Georgia, serif';
    g.fillText(`[${i + 1}] ${c[0]}`, cx - 140 + i * 280, y + 38);
    g.fillStyle = '#c8a06a';
    g.font = '14px Georgia, serif';
    g.fillText(c[1], cx - 140 + i * 280, y + 66);
    g.fillText(c[2], cx - 140 + i * 280, y + 88);
  });
  g.font = '14px Georgia, serif';
  g.fillStyle = '#f7e8c8';
  g.fillText('Arrows/WASD cursor · Q/E rotate · Space place · Z undo · H hint', cx, 462);
  if (s.best > 0) {
    g.fillStyle = '#c8a06a';
    g.fillText(`BEST VOYAGE ${s.best}`, cx, 484);
  }
  if (Math.floor(s.titleTime * 2) % 2 === 0) {
    g.font = 'bold 19px Georgia, serif';
    g.fillStyle = '#ffffff';
    g.fillText('— CLICK A MODE OR PRESS ENTER —', cx, 520);
  }
}

function drawChapterWin(g, s, endless) {
  g.fillStyle = 'rgba(20,12,20,0.38)';
  g.fillRect(0, 0, FIELD.width, FIELD.height);
  const cx = FIELD.width / 2;
  panel(g, cx - 300, 110, 600, 380);
  g.textAlign = 'center';
  g.font = 'bold 36px Georgia, serif';
  g.fillStyle = '#ffe95e';
  g.fillText(endless ? 'VOYAGE MILESTONE' : 'CHAPTER COMPLETE', cx, 168);
  drawStars(g, cx, 210, s.stars);
  g.font = 'bold 30px Georgia, serif';
  g.fillStyle = '#ffffff';
  g.fillText(`SCORE ${s.score}`, cx, 268);
  g.font = '14px Georgia, serif';
  g.fillStyle = '#c8a06a';
  const b = s.breakdown;
  g.fillText(`Synergy ${b.synergy} · Rivers ${b.rivers} · Blooms ${b.regions} · Cascades ${b.cascade}`, cx, 300);
  g.fillText(`Best combo x${s.comboBest} · ${s.placements} tiles placed`, cx, 322);
  if (s.newBest) {
    g.fillStyle = '#ff9d5e';
    g.fillText('★ NEW BEST ★', cx, 344);
  }
  if (Math.floor(s.time * 2) % 2 === 0) {
    g.font = 'bold 18px Georgia, serif';
    g.fillStyle = '#ffe95e';
    g.fillText(endless ? 'CLICK / R TO KEEP SAILING' : 'CLICK / R FOR THE NEXT CHAPTER', cx, 420);
  }
}

function drawCampaignWin(g, s) {
  g.fillStyle = 'rgba(30,40,15,0.55)';
  g.fillRect(0, 0, FIELD.width, FIELD.height);
  const cx = FIELD.width / 2;
  panel(g, cx - 310, 90, 620, 420);
  g.textAlign = 'center';
  g.font = 'bold 40px Georgia, serif';
  g.fillStyle = '#ffe95e';
  g.fillText('MASTER ARCHITECT', cx, 152);
  g.font = '15px Georgia, serif';
  g.fillStyle = '#f7e8c8';
  g.fillText('All three chapters complete. The tides sing your name.', cx, 184);
  drawStars(g, cx, 226, 3);
  g.font = 'bold 28px Georgia, serif';
  g.fillStyle = '#ffffff';
  g.fillText(`FINAL SCORE ${s.score}`, cx, 276);
  g.font = '14px Georgia, serif';
  g.fillStyle = '#c8a06a';
  const b = s.breakdown;
  g.fillText(`Synergy ${b.synergy} · Rivers ${b.rivers} · Blooms ${b.regions} · Cascades ${b.cascade}`, cx, 306);
  g.fillText(`Best combo x${s.comboBest} · ${s.placements} tiles · ${s.best} best`, cx, 328);
  g.font = '15px Georgia, serif';
  g.fillStyle = '#f7e8c8';
  g.fillText('Endless Archipelago awaits on the title screen.', cx, 366);
  if (Math.floor(s.time * 2) % 2 === 0) {
    g.font = 'bold 18px Georgia, serif';
    g.fillStyle = '#ffe95e';
    g.fillText('PRESS R TO SAIL AGAIN', cx, 420);
  }
}

function drawFail(g, s) {
  g.fillStyle = 'rgba(50,20,20,0.55)';
  g.fillRect(0, 0, FIELD.width, FIELD.height);
  const cx = FIELD.width / 2;
  panel(g, cx - 280, 140, 560, 300);
  g.textAlign = 'center';
  g.font = 'bold 38px Georgia, serif';
  g.fillStyle = '#ff9d7a';
  g.fillText('THE TIDE FELL SHORT', cx, 200);
  g.font = '15px Georgia, serif';
  g.fillStyle = '#f7e8c8';
  g.fillText(s.mode === 'campaign' ? `Chapter target ${[800, 1600, 2400][s.chapter]} — you reached ${s.score}.` : `You reached ${s.score}.`, cx, 240);
  g.fillText('Try a hint (H) — rivers and harbors score big.', cx, 264);
  if (Math.floor(s.time * 2) % 2 === 0) {
    g.font = 'bold 18px Georgia, serif';
    g.fillStyle = '#ffe95e';
    g.fillText('CLICK / R TO TRY AGAIN', cx, 330);
  }
}

function drawPause(g) {
  g.fillStyle = 'rgba(20,12,8,0.6)';
  g.fillRect(0, 0, FIELD.width, FIELD.height);
  const cx = FIELD.width / 2;
  panel(g, cx - 220, FIELD.height / 2 - 90, 440, 180);
  g.textAlign = 'center';
  g.font = 'bold 38px Georgia, serif';
  g.fillStyle = '#ffe95e';
  g.fillText('BECALMED', cx, FIELD.height / 2 - 24);
  g.font = '15px Georgia, serif';
  g.fillStyle = '#f7e8c8';
  g.fillText('P / ENTER to resume · R to restart', cx, FIELD.height / 2 + 24);
}

export function fitView(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || window.innerWidth;
  const cssH = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const scale = Math.min(cssW / FIELD.width, cssH / FIELD.height);
  const ox = (cssW - FIELD.width * scale) / 2;
  const oy = (cssH - FIELD.height * scale) / 2;
  return { dpr, cssW, cssH, scale, ox, oy };
}

export function renderFrame(g, world, input, particles, view, time) {
  const s = world.state;
  const pal = paletteOf(s);
  s.view = { scale: view.scale, ox: view.ox, oy: view.oy };
  g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  g.translate(view.ox, view.oy);
  g.scale(view.scale, view.scale);
  // Sky.
  const sky = g.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, pal.sky[0]);
  sky.addColorStop(1, pal.sky[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, FIELD.width, FIELD.height);
  // Sun.
  const sun = g.createRadialGradient(790, 110, 8, 790, 110, 150);
  sun.addColorStop(0, pal.sun);
  sun.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = sun;
  g.fillRect(640, -40, 320, 300);
  particles.drawBack(g, FIELD.width, FIELD.height, time);

  const inWorld = s.screen === SCREEN_PLAY || s.screen === SCREEN_PAUSE;
  const boardVisible = inWorld || s.screen === SCREEN_TITLE || s.screen === SCREEN_CHAPTERWIN || s.screen === SCREEN_FAIL || s.screen === SCREEN_CAMPAIGNWIN;
  if (boardVisible) {
    // Sea backdrop diamond under the board.
    g.save();
    g.translate(ISO.ox, ISO.oy + 40);
    g.rotate(0);
    diamond(g, 0, 0, GRID * ISO.tw + 60, GRID * ISO.th + 60);
    g.fillStyle = pal.waterDeep;
    g.fill();
    diamond(g, 0, -6, GRID * ISO.tw + 30, GRID * ISO.th + 30);
    g.fillStyle = pal.water;
    g.fill();
    g.restore();
    // Cells back-to-front.
    const order = [];
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) order.push([x, y]);
    }
    order.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    const seedBase = s.chapter * 7 + 3;
    for (const [x, y] of order) {
      const c = s.cells[y] && s.cells[y][x];
      if (!c) continue;
      const p = isoCell(x, y, c.h);
      if (!c.land) {
        drawWaterCell(g, p.x, p.y, time, pal, seedBase + x * 2 + y);
      } else {
        drawLandCell(g, p.x, p.y, c.h, pal);
        if (c.tile) drawTileTop(g, c.tile.type, p.x, p.y, c.tile.rot, time, x * 3 + y + seedBase, c.bloom);
      }
    }
    // Hint glow.
    if (s.hintCell && inWorld) {
      const p = isoCell(s.hintCell.x, s.hintCell.y, 0);
      g.save();
      g.globalAlpha = 0.6 + 0.4 * Math.sin(time * 5);
      g.strokeStyle = '#ffe95e';
      g.lineWidth = 3;
      diamond(g, p.x, p.y, ISO.tw, ISO.th);
      g.stroke();
      g.restore();
    }
    // Ghost preview + arcs.
    if (s.screen === SCREEN_PLAY) {
      const hov = s.hover || s.cursor;
      if (hov && hov.x >= 0 && hov.y >= 0 && hov.x < GRID && hov.y < GRID && s.hand.length > 0) {
        const probe = world.computePlacement(hov.x, hov.y, s.hand[s.sel], s.rot);
        const p = isoCell(hov.x, hov.y, 0);
        const arcs = [];
        if (probe.legal) {
          for (let e = 0; e < 4; e += 1) {
            const nx = hov.x + [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }][e].dx;
            const ny = hov.y + [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }][e].dy;
            const n = nx >= 0 && ny >= 0 && nx < GRID && ny < GRID ? s.cells[ny][nx] : null;
            if (n && n.tile) {
              const gain = pairGain(s.hand[s.sel], n.tile.type);
              if (gain > 0) arcs.push({ x: nx, y: ny, gain });
            }
          }
        }
        s._probe = { ...probe, arcs };
        drawGhostAt(g, p, s, probe, arcs, time);
      }
    }
    // Boats on the outer water.
    const t = time * 0.05;
    drawBoat(g, ((t * 60) % (FIELD.width + 200)) - 100, 520 + Math.sin(time) * 6, time, false);
    drawBoat(g, FIELD.width - (((t * 80) % (FIELD.width + 200)) - 100), 110 + Math.sin(time + 2) * 6, time, true);
    particles.drawFront(g);
  } else if (s.screen === SCREEN_TITLE || s.screen === SCREEN_CAMPAIGNWIN) {
    particles.drawFront(g);
  }

  if (s.screen === SCREEN_PLAY || s.screen === SCREEN_PAUSE) drawHud(g, s);
  if (s.screen === SCREEN_TITLE) drawTitle(g, s, input);
  if (s.screen === SCREEN_CHAPTERWIN) drawChapterWin(g, s, s.mode === 'endless');
  if (s.screen === SCREEN_CAMPAIGNWIN) drawCampaignWin(g, s);
  if (s.screen === SCREEN_FAIL) drawFail(g, s);
  if (s.screen === SCREEN_PAUSE) drawPause(g, s);
}

function pairGain(a, b) {
  if (a === 'forest' && b === 'forest') return 25;
  if ((a === 'forest' && b === 'farm') || (a === 'farm' && b === 'forest')) return 15;
  if (a === 'farm' && b === 'farm') return 10;
  if ((a === 'village' && b === 'farm') || (a === 'farm' && b === 'village')) return 30;
  if (a === 'village' && b === 'village') return 20;
  if ((a === 'village' && b === 'harbor') || (a === 'harbor' && b === 'village')) return 40;
  if ((a === 'windmill' && b === 'farm') || (a === 'farm' && b === 'windmill')) return 45;
  if ((a === 'windmill' && b === 'village') || (a === 'village' && b === 'windmill')) return 10;
  return 5;
}

function drawGhostAt(g, p, s, probe, arcs, time) {
  const hov = s.hover || s.cursor;
  const type = s.hand[s.sel];
  g.save();
  g.globalAlpha = 0.6;
  diamond(g, p.x, p.y, ISO.tw, ISO.th);
  g.fillStyle = probe.legal ? '#fff3d6' : '#c0392b';
  g.fill();
  g.globalAlpha = 1;
  if (probe.legal && hov) {
    drawTileTop(g, type, p.x, p.y, s.rot, time, hov.x * 3 + hov.y, 0);
    for (const e of arcs) {
      const q = isoCell(e.x, e.y, 0);
      g.strokeStyle = 'rgba(255,233,150,0.95)';
      g.lineWidth = 2.5;
      g.setLineDash([6, 4]);
      g.beginPath();
      g.moveTo(p.x, p.y - 14);
      g.quadraticCurveTo((p.x + q.x) / 2, Math.min(p.y, q.y) - 40, q.x, q.y - 14);
      g.stroke();
      g.setLineDash([]);
      g.font = 'bold 12px Georgia, serif';
      g.textAlign = 'center';
      g.fillStyle = '#7a4a1a';
      g.fillText(`+${e.gain}`, (p.x + q.x) / 2, Math.min(p.y, q.y) - 44);
    }
    // Total delta preview.
    const total = probe.events.reduce((a, e) => a + e.base, 0);
    if (total > 0) {
      g.font = 'bold 15px Georgia, serif';
      g.textAlign = 'center';
      g.fillStyle = '#2a6a2a';
      g.fillText(`+${total} SYNERGY`, p.x, p.y - 52);
    }
  } else if (!probe.legal) {
    g.font = '13px Georgia, serif';
    g.textAlign = 'center';
    g.fillStyle = '#a02828';
    g.fillText(probe.reason, p.x, p.y - 34);
  }
  g.restore();
}
