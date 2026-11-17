// TERRACOTTA TIDES: ISLE ARCHITECT — make.fun best-game-01 entrypoint (Node 22, stdlib only).
// The game is plain static files under game/; screenshots/ holds 4 real renders.
// This program hands both to /output and writes /output/dossier.json with the
// vendored make.fun library, so the scorer gates the entry deterministically.
// Run locally: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Same caps the gate scores with: only text_max_bytes shapes the bytes, the rest
// refuse an entry the scorer would refuse (screenshots over 256 KiB, game/ over
// 993 entries or 48 MiB, a game path over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
