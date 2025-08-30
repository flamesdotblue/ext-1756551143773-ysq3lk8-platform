import { useEffect, useRef } from 'react';

// Simple retro palette
const COLORS = {
  bgSky: '#6bc2ff',
  bgHills: '#8fd17a',
  groundTop: '#c87137',
  groundSide: '#995428',
  brickLight: '#b55a3b',
  brickDark: '#7a3622',
  questionBase: '#d6b11b',
  questionDot: '#ffec88',
  coin: '#ffd84a',
  pipeLight: '#2fa75b',
  pipeDark: '#1b6f3a',
  flagPole: '#eeeeee',
  flag: '#2ce06b',
  castle: '#61311b',
  cloud: '#ffffff',
  enemy: '#6b3b2a',
  playerHat: '#e64646',
  playerOver: '#2a7bff',
};

function useKeys() {
  const state = useRef({});
  useEffect(() => {
    const onDown = (e) => {
      state.current[e.code] = true;
    };
    const onUp = (e) => {
      state.current[e.code] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);
  return state;
}

// Level 1-1 inspired but original: 16px tiles, around 220 tiles long
const TILE = 16;
const SCALE = 3; // Canvas zoom for crisp pixels
const GRAVITY = 0.36;
const FRICTION_GROUND = 0.82;
const FRICTION_AIR = 0.98;
const JUMP_VEL = -6.6;
const RUN_SPEED = 2.4;
const WALK_SPEED = 1.8;

// Legend:
// '=' ground, '#' brick, '?' question box, 'o' coin, 'P' pipe, 'g' goomba, 'F' flag, 'C' castle, '-' empty, '^' hill, 'c' cloud, 'B' big block
const LEVEL = [
  '----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------',
  '----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------',
  '----------------------c----------------------------------------------------c---------------------------------------------------------------------------------------------c--------------------------------------',
  '-----------------------------------------c--------------------------c---------------------------------------------------------------------------------------------------------c----------------------------------',
  '---------------------   -----------------------------------------------     ------------------------------------------------------------------------------------------------------    ----------------------------',
  '--------------------     --------------------------------------------       ------------------------------#--------------------------#------------      --------------------',
  '-------------------       ------------------------------#---#--------------  ----------------------------###------------------------###-----------        -------------------',
  '------------------   c    -----------------------------###-###-------------   --------------------------#####----------------------#####----------   c    ------------------',
  '----------------------------o-------------------------#####-#####-----------------o--------------------#######--------------------#######----------------------o-------------',
  '----------------------?-------------------------------#####-#####----------------?---------------------#######--------------------#######-------------------?---------------',
  '---------------------###-----------------------------B#####-#####B------------------------------------#######--------------------#######-----------------------------------',
  '--------------------#####----------------------------B#####-#####B--------------------------------------------------------------------------P-------------------------------',
  '-------------------#####-----------------------------B#####-#####B--------------------------------------------------------------------------P-------------------------------',
  '------------------#####----------------------------------------------g--------------------g------------------------------g-------------PP-----------------------------------',
  '-----------------#####----------------------g-------------------------------------g-----------------------------g---------------------PP-----------------------------------',
  '----------------#####-----------P------------------------------?-----------------------------?------------------------------?----------PP-----------------------------------',
  '---------------#####-----------PP-----------------------------###---------------------------###----------------------------###---------PP---------------------F-------------',
  '==============#####===========PPP============================#####=========================#####==========================#####========PP===========CCCCCCCCCCCCCCCCCC=====',
];

const HEIGHT = LEVEL.length;
const WIDTH = LEVEL[0].length;

// Build solid map and entities
function buildLevel() {
  const solids = new Set();
  const coins = new Set();
  const qBlocks = new Map(); // key -> {hit:false}
  const enemies = []; // {x,y,vx,vy,alive}
  const pipes = new Set();
  let flag = null;
  let castle = null;

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const ch = LEVEL[y][x];
      const key = `${x},${y}`;
      if (ch === '=' || ch === '#' || ch === 'B') solids.add(key);
      if (ch === 'P') pipes.add(key);
      if (ch === 'o') coins.add(key);
      if (ch === '?') qBlocks.set(key, { hit: false });
      if (ch === 'g') enemies.push({ x: x * TILE + 2, y: y * TILE - 8, vx: -0.5, vy: 0, alive: true });
      if (ch === 'F') flag = { x: x * TILE + TILE / 2, y: y * TILE };
      if (ch === 'C') castle = { x: x * TILE, y: y * TILE };
    }
  }
  return { solids, coins, qBlocks, enemies, pipes, flag, castle };
}

function rectVsSolid(solids, nx, ny, w, h) {
  // Check AABB vs tile solids.
  const left = Math.floor(nx / TILE);
  const right = Math.floor((nx + w - 1) / TILE);
  const top = Math.floor(ny / TILE);
  const bottom = Math.floor((ny + h - 1) / TILE);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      const key = `${tx},${ty}`;
      if (solids.has(key)) return true;
    }
  }
  return false;
}

function drawPixelBlock(ctx, x, y, size, palette) {
  // size in screen pixels (already scaled). Draw with 3x3 pixel shading grid
  const u = Math.max(2, Math.floor(size / 6));
  ctx.fillStyle = palette.dark;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = palette.mid;
  ctx.fillRect(x + u, y + u, size - 2 * u, size - 2 * u);
  ctx.fillStyle = palette.light;
  ctx.fillRect(x + 2 * u, y + 2 * u, size - 4 * u, size - 4 * u);
}

function drawBrick(ctx, sx, sy) {
  const s = TILE * SCALE;
  drawPixelBlock(ctx, sx, sy, s, { light: COLORS.brickLight, mid: '#9a4a31', dark: COLORS.brickDark });
  ctx.fillStyle = COLORS.brickDark;
  ctx.fillRect(sx, sy + s - 3, s, 3);
}

function drawQuestion(ctx, sx, sy, bumped) {
  const s = TILE * SCALE;
  drawPixelBlock(ctx, sx, sy, s, { light: '#e6c339', mid: COLORS.questionBase, dark: '#a08215' });
  ctx.fillStyle = bumped ? '#777777' : COLORS.questionDot;
  const d = Math.floor(s / 4);
  ctx.fillRect(sx + d, sy + d, d, d);
  ctx.fillRect(sx + 2 * d, sy + 2 * d, d, d);
  ctx.fillRect(sx + s - 2 * d, sy + d, d, d);
}

function drawGround(ctx, sx, sy) {
  const s = TILE * SCALE;
  ctx.fillStyle = COLORS.groundSide;
  ctx.fillRect(sx, sy, s, s);
  ctx.fillStyle = COLORS.groundTop;
  ctx.fillRect(sx, sy, s, Math.floor(s / 4));
}

function drawPipe(ctx, sx, sy) {
  const s = TILE * SCALE;
  ctx.fillStyle = COLORS.pipeDark;
  ctx.fillRect(sx, sy, s, s);
  ctx.fillStyle = COLORS.pipeLight;
  ctx.fillRect(sx, sy, s, Math.floor(s / 4));
  ctx.fillStyle = '#114e2c';
  ctx.fillRect(sx + 2, sy + Math.floor(s / 4), s - 4, 2);
}

function drawCoin(ctx, sx, sy, t) {
  const s = TILE * SCALE;
  const wobble = Math.sin(t / 10 + (sx + sy) * 0.01) * 2;
  ctx.fillStyle = '#7a5b00';
  ctx.fillRect(sx + s / 2 - 2, sy + 4 + wobble, 4, s - 8);
  ctx.fillStyle = COLORS.coin;
  ctx.fillRect(sx + s / 2 - 1, sy + 4 + wobble, 2, s - 8);
}

function drawEnemy(ctx, sx, sy, alive) {
  const s = TILE * SCALE;
  const h = s - 6;
  ctx.fillStyle = alive ? COLORS.enemy : '#4a2620';
  ctx.fillRect(sx + 3, sy + s - h - 2, s - 6, h);
  ctx.fillStyle = '#000000';
  ctx.fillRect(sx + 5, sy + s - h + 2, 3, 3);
  ctx.fillRect(sx + s - 8, sy + s - h + 2, 3, 3);
}

function drawPlayer(ctx, sx, sy, facing, t) {
  const s = TILE * SCALE;
  const bodyH = s;
  const bob = Math.sin(t / 6) * 1.5;
  // legs
  ctx.fillStyle = COLORS.playerOver;
  ctx.fillRect(sx + 4, sy + s - 8, 6, 8);
  ctx.fillRect(sx + s - 10, sy + s - 8, 6, 8);
  // torso
  ctx.fillStyle = '#f5b07a';
  ctx.fillRect(sx + 5, sy + s - 14, s - 10, 6);
  ctx.fillStyle = COLORS.playerOver;
  ctx.fillRect(sx + 4, sy + s - 22, s - 8, 10);
  // head + hat
  ctx.fillStyle = '#f5b07a';
  ctx.fillRect(sx + 6, sy + s - bodyH - 2 + bob, s - 12, 10);
  ctx.fillStyle = COLORS.playerHat;
  if (facing < 0) ctx.fillRect(sx + 2, sy + s - bodyH - 4 + bob, s - 6, 4);
  else ctx.fillRect(sx + 4, sy + s - bodyH - 4 + bob, s - 6, 4);
}

function drawBackdrop(ctx, cameraX, canvasH, canvasW, t) {
  // Sky
  ctx.fillStyle = COLORS.bgSky;
  ctx.fillRect(0, 0, canvasW, canvasH);
  // Clouds
  ctx.fillStyle = COLORS.cloud;
  const cloudBaseY = 40;
  for (let i = 0; i < 10; i++) {
    const cx = (i * 180 - (cameraX * 0.5) + (t % 400)) % (canvasW + 200) - 100;
    const cy = cloudBaseY + (i % 2) * 20;
    ctx.fillRect(cx, cy, 60, 14);
    ctx.fillRect(cx + 10, cy - 8, 30, 14);
    ctx.fillRect(cx + 30, cy - 6, 24, 12);
  }
  // Hills
  ctx.fillStyle = COLORS.bgHills;
  for (let i = 0; i < 8; i++) {
    const hx = (i * 300 - (cameraX * 0.7)) % (canvasW + 320) - 80;
    const hy = canvasH - 60;
    ctx.fillRect(hx, hy, 120, 60);
    ctx.fillRect(hx + 30, hy - 20, 60, 20);
  }
}

export default function GameCanvas({ onScore, onCoins, onLives, onTime, onWorld, onStatus }) {
  const canvasRef = useRef(null);
  const audioRef = useRef({});
  const keys = useKeys();

  useEffect(() => {
    onWorld('1-1');
    onStatus('Ready');
  }, [onWorld, onStatus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });

    const targetHeight = 16 * TILE * SCALE; // 16 tiles tall
    const targetWidth = 20 * TILE * SCALE; // 20 tiles wide
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const level = buildLevel();

    // Player
    const player = {
      x: 3 * TILE,
      y: (HEIGHT - 5) * TILE,
      w: 10,
      h: 14,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      checkpointX: 3 * TILE,
    };

    let cameraX = 0;
    let t = 0;
    let running = true;
    let timeLeft = 400;

    const sfx = {
      coin: new Audio(),
      bump: new Audio(),
      stomp: new Audio(),
      flag: new Audio(),
      die: new Audio(),
      jump: new Audio(),
    };
    // Very small inline beeps (WebAudio tone alternative via data URI)
    sfx.coin.src = 'data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAZGF0YQA...';
    sfx.bump.src = sfx.coin.src; // reuse to avoid network
    sfx.stomp.src = sfx.coin.src;
    sfx.flag.src = sfx.coin.src;
    sfx.die.src = sfx.coin.src;
    sfx.jump.src = sfx.coin.src;
    const muted = { value: true }; // start muted to avoid autoplay issues

    function play(name) {
      if (muted.value) return;
      const a = sfx[name];
      if (!a) return;
      a.currentTime = 0;
      a.play().catch(() => {});
    }

    const handleKeyMute = (e) => {
      if (e.code === 'KeyM') {
        muted.value = !muted.value;
        onStatus(muted.value ? 'Muted' : 'Unmuted');
      }
      if (e.code === 'KeyR') {
        respawn();
      }
    };
    window.addEventListener('keydown', handleKeyMute);

    function respawn() {
      player.x = player.checkpointX;
      player.y = (HEIGHT - 5) * TILE;
      player.vx = 0;
      player.vy = 0;
      cameraX = Math.max(0, player.x * SCALE - 80);
      onStatus('Respawned');
    }

    function gameOver() {
      onLives((v) => Math.max(0, v - 1));
      onStatus('Ouch!');
      play('die');
      if (typeof onLives === 'function') {
        // Delay respawn a bit
        setTimeout(respawn, 600);
      }
    }

    function win() {
      running = false;
      onStatus('Course Clear!');
      onScore((v) => v + Math.max(0, Math.floor(timeLeft)) * 10);
      play('flag');
    }

    const timerId = setInterval(() => {
      if (!running) return;
      timeLeft -= 1;
      onTime(timeLeft);
      if (timeLeft <= 0) {
        gameOver();
      }
    }, 1000);

    function physicsStep() {
      // Input
      const left = keys.current['ArrowLeft'] || keys.current['KeyA'];
      const right = keys.current['ArrowRight'] || keys.current['KeyD'];
      const jump = keys.current['Space'] || keys.current['KeyK'];
      const boost = keys.current['ShiftLeft'] || keys.current['ShiftRight'];

      const maxSpeed = boost ? RUN_SPEED : WALK_SPEED;
      if (left && !right) {
        player.vx -= 0.3;
        player.facing = -1;
      } else if (right && !left) {
        player.vx += 0.3;
        player.facing = 1;
      } else {
        player.vx *= player.onGround ? FRICTION_GROUND : FRICTION_AIR;
      }
      player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));

      if (jump && player.onGround) {
        player.vy = JUMP_VEL * (boost ? 1.1 : 1);
        player.onGround = false;
        play('jump');
      }

      // Gravity
      player.vy += GRAVITY;
      if (player.vy > 10) player.vy = 10;

      // Horizontal move + collide
      let nx = player.x + player.vx;
      if (!rectVsSolid(level.solids, nx, player.y, player.w, player.h)) {
        player.x = nx;
      } else {
        // bump into wall
        while (!rectVsSolid(level.solids, player.x + Math.sign(player.vx), player.y, player.w, player.h)) {
          player.x += Math.sign(player.vx);
        }
        player.vx = 0;
      }

      // Vertical move + collide
      let ny = player.y + player.vy;
      if (!rectVsSolid(level.solids, player.x, ny, player.w, player.h)) {
        player.y = ny;
        player.onGround = false;
      } else {
        if (player.vy > 0) {
          // falling onto ground
          while (!rectVsSolid(level.solids, player.x, player.y + 1, player.w, player.h)) player.y += 1;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          // hitting a block from below
          while (!rectVsSolid(level.solids, player.x, player.y - 1, player.w, player.h)) player.y -= 1;
          player.vy = 0.2;
          // detect which tile was hit above head
          const tx = Math.floor((player.x + player.w / 2) / TILE);
          const ty = Math.floor((player.y - 1) / TILE);
          const key = `${tx},${ty}`;
          if (level.qBlocks.has(key)) {
            const qb = level.qBlocks.get(key);
            if (!qb.hit) {
              qb.hit = true;
              onScore((v) => v + 100);
              onCoins((v) => v + 1);
              play('coin');
            } else {
              play('bump');
            }
          } else if (level.solids.has(key)) {
            play('bump');
          }
        }
      }

      // Collect coins
      const cx = Math.floor((player.x + player.w / 2) / TILE);
      const cy = Math.floor((player.y + player.h / 2) / TILE);
      const ckey = `${cx},${cy}`;
      if (level.coins.has(ckey)) {
        level.coins.delete(ckey);
        onScore((v) => v + 200);
        onCoins((v) => v + 1);
        play('coin');
      }

      // Enemies update and collisions
      for (const en of level.enemies) {
        if (!en.alive) continue;
        en.vy += GRAVITY * 0.9;
        // try move x
        let enx = en.x + en.vx;
        if (!rectVsSolid(level.solids, enx, en.y, 12, 12)) {
          en.x = enx;
        } else {
          en.vx *= -1;
        }
        // try move y
        let eny = en.y + en.vy;
        if (!rectVsSolid(level.solids, en.x, eny, 12, 12)) {
          en.y = eny;
        } else {
          if (en.vy > 0) en.vy = 0;
        }
        // edge detect: if no ground ahead, turn
        const ahead = en.x + (en.vx > 0 ? 8 : -2);
        const ax = Math.floor(ahead / TILE);
        const ay = Math.floor((en.y + 14) / TILE);
        if (!level.solids.has(`${ax},${ay}`)) en.vx *= -1;

        // Player vs enemy
        const overlap = !(player.x + player.w < en.x || player.x > en.x + 12 || player.y + player.h < en.y || player.y > en.y + 12);
        if (overlap) {
          if (player.vy > 0.5) {
            // stomp
            en.alive = false;
            player.vy = -4.5;
            onScore((v) => v + 100);
            play('stomp');
          } else {
            gameOver();
          }
        }
      }

      // Check flag / win
      if (level.flag) {
        const fx = level.flag.x;
        const fy = level.flag.y;
        if (player.x + player.w > fx - 4 && player.x < fx + 4 && player.y + player.h > fy - 60) {
          win();
        }
      }

      // Death fall
      if (player.y > HEIGHT * TILE + 200) {
        gameOver();
      }

      // Update camera (lock forward only)
      const targetCam = Math.max(0, player.x * SCALE - canvas.width / 3);
      cameraX += (targetCam - cameraX) * 0.08;
    }

    function draw() {
      // Backdrop
      drawBackdrop(ctx, cameraX, canvas.height, canvas.width, t);

      // Foreground level
      const startTileX = Math.max(0, Math.floor(cameraX / (TILE * SCALE)) - 2);
      const endTileX = Math.min(WIDTH - 1, startTileX + Math.ceil(canvas.width / (TILE * SCALE)) + 4);

      for (let y = 0; y < HEIGHT; y++) {
        for (let x = startTileX; x <= endTileX; x++) {
          const ch = LEVEL[y][x];
          const sx = Math.floor(x * TILE * SCALE - cameraX);
          const sy = y * TILE * SCALE;
          if (ch === '=') drawGround(ctx, sx, sy);
          else if (ch === '#') drawBrick(ctx, sx, sy);
          else if (ch === 'B') drawBrick(ctx, sx, sy);
          else if (ch === 'P') drawPipe(ctx, sx, sy);
          else if (ch === '?') {
            const bumped = level.qBlocks.get(`${x},${y}`)?.hit;
            drawQuestion(ctx, sx, sy, bumped);
          } else if (ch === 'o') {
            if (level.coins.has(`${x},${y}`)) drawCoin(ctx, sx, sy, t);
          } else if (ch === 'F') {
            // flag pole
            ctx.fillStyle = COLORS.flagPole;
            ctx.fillRect(sx + TILE * SCALE / 2 - 1, sy - 6 * SCALE, 2, TILE * SCALE + 6 * SCALE);
            ctx.fillStyle = COLORS.flag;
            ctx.fillRect(sx + TILE * SCALE / 2 + 1, sy + 4, 16, 10);
          } else if (ch === 'C') {
            // simple castle blocks
            ctx.fillStyle = COLORS.castle;
            ctx.fillRect(sx, sy + TILE * SCALE / 2, TILE * SCALE, TILE * SCALE / 2);
          }
        }
      }

      // Enemies
      for (const en of level.enemies) {
        if (en.x * SCALE + 40 < cameraX || en.x * SCALE - 40 > cameraX + canvas.width) continue;
        const sx = Math.floor(en.x * SCALE - cameraX);
        const sy = Math.floor(en.y * SCALE);
        drawEnemy(ctx, sx, sy, en.alive);
      }

      // Player
      const psx = Math.floor(player.x * SCALE - cameraX);
      const psy = Math.floor(player.y * SCALE);
      drawPlayer(ctx, psx, psy, player.facing, t);

      // HUD overlay inside canvas (subtle shadow)
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, canvas.width, 18);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`WORLD 1-1`, 8, 12);
    }

    function loop() {
      if (running) physicsStep();
      draw();
      t++;
      requestAnimationFrame(loop);
    }

    loop();

    return () => {
      running = false;
      clearInterval(timerId);
      window.removeEventListener('keydown', handleKeyMute);
    };
  }, [onCoins, onLives, onScore, onStatus, onTime]);

  return (
    <div id="play" className="mt-2">
      <div className="relative rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
        <canvas ref={canvasRef} className="block w-full h-auto" style={{ imageRendering: 'pixelated' }} />
      </div>
      <p className="mt-3 text-center text-slate-400 text-xs">
        Tip: Hold Shift to run and jump farther. Reach the flag to clear the course.
      </p>
    </div>
  );
}
