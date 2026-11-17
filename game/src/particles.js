// Pooled effects: placement pops, cascade petals, sparkles, floating scores,
// drifting clouds and petal motes. Render-state only.

export function createParticles() {
  const pops = [];
  const petals = [];
  const texts = [];
  const sparkles = [];
  const clouds = [];

  for (let i = 0; i < 5; i += 1) {
    clouds.push({
      x: Math.random(), y: 0.08 + Math.random() * 0.5,
      s: 60 + Math.random() * 120, sp: 6 + Math.random() * 10,
    });
  }
  for (let i = 0; i < 40; i += 1) {
    petals.push({
      x: Math.random(), y: Math.random(),
      s: 2 + Math.random() * 3.5,
      vy: 6 + Math.random() * 14,
      sway: Math.random() * Math.PI * 2,
      tint: Math.random(),
    });
  }

  return {
    pop(x, y, color) {
      if (pops.length > 40) pops.shift();
      pops.push({ x, y, color, age: 0, life: 0.45 });
    },
    bloom(x, y, colors, count) {
      for (let i = 0; i < count; i += 1) {
        if (petals.length > 400) petals.shift();
        const a = Math.random() * Math.PI * 2;
        petals.push({
          x: x / 960, y: y / 600,
          vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 - 60,
          s: 2.5 + Math.random() * 3.5,
          sway: Math.random() * Math.PI * 2,
          tint: Math.random(),
          age: 0, life: 1 + Math.random(),
          burst: true,
          color: colors[(Math.random() * colors.length) | 0],
        });
      }
    },
    sparkle(x, y) {
      if (sparkles.length > 80) sparkles.shift();
      sparkles.push({ x, y, age: 0, life: 0.7 });
    },
    text(x, y, str, color, size) {
      if (texts.length > 30) texts.shift();
      texts.push({ x, y, str, color, size: size || 14, age: 0, life: 1.4 });
    },
    clear() {
      pops.length = 0;
      texts.length = 0;
      sparkles.length = 0;
    },
    update(dt) {
      for (let i = pops.length - 1; i >= 0; i -= 1) {
        pops[i].age += dt;
        if (pops[i].age >= pops[i].life) pops.splice(i, 1);
      }
      for (let i = sparkles.length - 1; i >= 0; i -= 1) {
        sparkles[i].age += dt;
        if (sparkles[i].age >= sparkles[i].life) sparkles.splice(i, 1);
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.age += dt;
        t.y -= 34 * dt;
        if (t.age >= t.life) texts.splice(i, 1);
      }
      for (const c of clouds) {
        c.x += (c.sp / 960) * dt;
        if (c.x > 1.25) {
          c.x = -0.25;
          c.y = 0.08 + Math.random() * 0.5;
        }
      }
      for (let i = petals.length - 1; i >= 0; i -= 1) {
        const p = petals[i];
        if (p.burst) {
          p.age += dt;
          if (p.age >= p.life) {
            petals.splice(i, 1);
            continue;
          }
          p.vy += 160 * dt;
          p.x += (p.vx / 960) * dt;
          p.y += (p.vy / 600) * dt;
          p.sway += dt * 4;
        } else {
          p.y += (p.vy / 600) * dt;
          p.sway += dt * 1.2;
          p.x += Math.sin(p.sway) * 0.0004;
          if (p.y > 1.05) {
            p.y = -0.05;
            p.x = Math.random();
          }
        }
      }
    },
    drawBack(g, w, h, time) {
      // Cloud shadows drifting over the scene.
      for (const c of clouds) {
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.beginPath();
        g.ellipse(c.x * w, c.y * h, c.s, c.s * 0.42, 0, 0, Math.PI * 2);
        g.ellipse(c.x * w - c.s * 0.5, c.y * h + 8, c.s * 0.6, c.s * 0.3, 0, 0, Math.PI * 2);
        g.fill();
      }
      for (const p of petals) {
        if (p.burst) continue;
        g.globalAlpha = 0.55;
        g.fillStyle = p.tint < 0.5 ? '#fff3d6' : '#ffd9a0';
        g.beginPath();
        g.ellipse(p.x * w, p.y * h, p.s, p.s * 0.55, p.sway, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    },
    drawFront(g) {
      for (const p of petals) {
        if (!p.burst) continue;
        const k = 1 - p.age / p.life;
        g.globalAlpha = k;
        g.fillStyle = p.color || '#ffd9a0';
        g.beginPath();
        g.arc(p.x * 960, p.y * 600, p.s * k + 0.5, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      for (const p of pops) {
        const k = p.age / p.life;
        g.globalAlpha = 1 - k;
        g.strokeStyle = p.color;
        g.lineWidth = 3 * (1 - k) + 1;
        g.strokeRect(p.x - 30 * k - 8, p.y - 16 * k - 8, 60 * k + 16, 32 * k + 16);
      }
      g.globalAlpha = 1;
      for (const sp of sparkles) {
        const k = sp.age / sp.life;
        g.globalAlpha = 1 - k;
        g.strokeStyle = '#fff8e2';
        g.lineWidth = 2;
        const r = 4 + k * 10;
        g.beginPath();
        g.moveTo(sp.x - r, sp.y);
        g.lineTo(sp.x + r, sp.y);
        g.moveTo(sp.x, sp.y - r);
        g.lineTo(sp.x, sp.y + r);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.textAlign = 'center';
      for (const t of texts) {
        g.globalAlpha = Math.min(1, (1 - t.age / t.life) * 2);
        g.font = `bold ${t.size}px Georgia, serif`;
        g.fillStyle = 'rgba(60,30,10,0.7)';
        g.fillText(t.str, t.x + 1.5, t.y + 1.5);
        g.fillStyle = t.color;
        g.fillText(t.str, t.x, t.y);
      }
      g.globalAlpha = 1;
    },
  };
}
