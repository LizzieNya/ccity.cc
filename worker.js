export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return Response.redirect('https://ccity.cc', 302);
    }

    if (url.pathname !== '/game') {
      return new Response('Not found', { status: 404 });
    }

    // ✅ String.raw + no inner backticks → build-safe
    const html = String.raw`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>1cc - Touhou Legacy</title>
  <meta name="description" content="Bullet-hell shooter inspired by Touhou Project. One-credit clear challenge!">
  <meta property="og:title" content="1cc - Touhou Legacy">
  <meta property="og:description" content="Can you survive with just one credit?">
  <meta property="og:url" content="https://ccity.cc">
  <meta property="og:type" content="game">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.6.0/p5.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;background:#0a0520;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0.5rem;font-family:'Segoe UI',sans-serif;color:#e0e0ff;overflow:hidden;position:relative}
    .header{position:fixed;top:0;width:100%;padding:0.8rem;display:flex;justify-content:space-between;align-items:center;background:rgba(10,5,32,0.95);border-bottom:1px solid #7a3fff;z-index:10}
    .logo{font-size:1.8rem;font-weight:800;background:linear-gradient(45deg,#ff33cc,#66ccff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .game-container{position:relative;border:2px solid #8b5cf6;border-radius:1rem;box-shadow:0 0 25px rgba(139,92,246,0.5);overflow:hidden;margin:1rem 0;background:rgba(5,2,15,0.7);max-width:95vw}
    .info-panel{max-width:600px;text-align:center;padding:1.2rem;background:rgba(20,10,40,0.8);border-radius:1rem;margin:1rem;border:1px solid #6a3fff}
    .info-panel h1{font-size:2rem;margin:0.5rem 0;background:linear-gradient(45deg,#ff33aa,#9966ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .controls{margin-top:1rem;text-align:left;padding:1rem;background:rgba(25,15,50,0.6);border-radius:0.8rem}
    .controls span{color:#ff55dd;font-weight:700}
    .footer{position:fixed;bottom:0;width:100%;padding:0.6rem;text-align:center;font-size:0.85rem;color:#bbb;background:rgba(10,5,32,0.95);border-top:1px solid #7a3fff}
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">ccity.cc</div>
    <div class="score-display" id="live-score">SCORE: 000000</div>
  </div>
  <div class="game-container" id="sketch-container"></div>
  <div class="info-panel">
    <h1>T O U H O U &nbsp; L E G A C Y</h1>
    <p>One Credit Clear Challenge • Survive the danmaku storm</p>
    <div class="controls">
      <p><span>Move:</span> WASD / Arrows</p>
      <p><span>Shoot:</span> Z / Click</p>
      <p><span>Bomb:</span> X (3 uses)</p>
      <p><span>Restart:</span> R</p>
    </div>
  </div>
  <div class="footer">
    <p>ccity.cc • Fan-made sprites (CC0) • 1CC Challenge</p>
  </div>

  <script>
    // ✅ Preload fan-made sprites (CC0, from thpatch)
    let playerImg, enemyImg, explosionImg;
    function preload() {
      playerImg = loadImage('https://raw.githubusercontent.com/thpatch/thcrap-tutorials/master/sprites/reimu.png');
      enemyImg = loadImage('https://raw.githubusercontent.com/thpatch/thcrap-tutorials/master/sprites/fairy.png');
      explosionImg = loadImage('https://raw.githubusercontent.com/thpatch/thcrap-tutorials/master/sprites/explosion.png');
    }

    const PLAYER_SIZE = 32;
    const ENEMY_SIZE = 24;
    const BULLET_SIZE = 6;
    const PARTICLE_COUNT = 20;
    const SPAWN_INTERVAL = 60;
    const BOMB_DURATION = 60;

    let player;
    let enemies = [];
    let playerBullets = [];
    let enemyBullets = [];
    let particles = [];
    let score = 0;
    let lives = 1;
    let bombs = 3;
    let gameState = 'start';
    let lastSpawn = 0;
    let backgroundStars = [];
    let canvas;
    let activeBomb = 0;
    let perfectRun = true;

    // Particle for explosions
    class Particle {
      constructor(x, y, col) {
        this.x = x;
        this.y = y;
        this.vx = random(-3, 3);
        this.vy = random(-3, 3);
        this.size = random(1, 4);
        this.life = 255;
        this.color = col;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 5;
        this.size *= 0.97;
      }
      show() {
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), this.life);
        ellipse(this.x, this.y, this.size);
      }
      dead() { return this.life <= 0 || this.size < 0.5; }
    }

    class Star {
      constructor() {
        this.x = random(width);
        this.y = random(height);
        this.size = random(0.5, 2);
        this.speed = random(0.5, 2);
      }
      update() {
        this.y += this.speed;
        if (this.y > height) { this.y = 0; this.x = random(width); }
      }
      show() { noStroke(); fill(255, 255, 255, 150); ellipse(this.x, this.y, this.size); }
    }

    class Player {
      constructor() {
        this.x = width / 2;
        this.y = height - 80;
        this.vx = 0;
        this.vy = 0;
        this.speed = 6;
        this.cooldown = 0;
        this.invuln = 0;
        this.graze = 0;
      }
      show() {
        if (this.invuln > 0 && frameCount % 6 < 3) return; // blink
        push();
        translate(this.x, this.y);
        imageMode(CENTER);
        if (playerImg) image(playerImg, 0, 0, PLAYER_SIZE, PLAYER_SIZE);
        pop();
      }
      move() {
        this.vx = (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) - (keyIsDown(65) || keyIsDown(LEFT_ARROW));
        this.vy = (keyIsDown(83) || keyIsDown(DOWN_ARROW)) - (keyIsDown(87) || keyIsDown(UP_ARROW));
        if (this.vx && this.vy) { this.vx *= 0.707; this.vy *= 0.707; }
        this.x += this.vx * this.speed;
        this.y += this.vy * this.speed;
        this.x = constrain(this.x, PLAYER_SIZE/2, width - PLAYER_SIZE/2);
        this.y = constrain(this.y, PLAYER_SIZE/2, height - PLAYER_SIZE/2);
      }
      shoot() {
        if (this.cooldown <= 0) {
          playerBullets.push({x: this.x, y: this.y - 12, vy: -10, size: BULLET_SIZE, col: color(100, 200, 255)});
          this.cooldown = 5;
        } else { this.cooldown--; }
      }
      useBomb() {
        if (bombs > 0 && activeBomb === 0) {
          bombs--;
          activeBomb = BOMB_DURATION;
          perfectRun = true;
          enemyBullets = [];
          enemies.forEach(e => { e.health = 0; });
        }
      }
      hit() {
        if (this.invuln <= 0) {
          perfectRun = false;
          lives--;
          this.invuln = 120;
          for (let i = 0; i < 30; i++) particles.push(new Particle(this.x, this.y, color(255, 150, 200)));
          return true;
        }
        return false;
      }
      grazed(b) {
        if (dist(this.x, this.y, b.x, b.y) < PLAYER_SIZE/2 + b.size/2) {
          this.graze++;
          score += 2;
          return true;
        }
        return false;
      }
    }

    class Enemy {
      constructor() {
        this.x = random(40, width - 40);
        this.y = -30;
        this.vy = random(1.2, 2.5);
        this.health = 1;
        this.cooldown = 0;
        this.score = 100;
      }
      show() {
        push();
        translate(this.x, this.y);
        imageMode(CENTER);
        if (enemyImg) image(enemyImg, 0, 0, ENEMY_SIZE, ENEMY_SIZE);
        pop();
      }
      move() { this.y += this.vy; }
      shoot() {
        if (this.cooldown <= 0) {
          const angle = atan2(player.y - this.y, player.x - this.x);
          enemyBullets.push({
            x: this.x,
            y: this.y + 10,
            vx: cos(angle) * 3,
            vy: sin(angle) * 3,
            size: BULLET_SIZE,
            col: color(255, 100, 100)
          });
          this.cooldown = 60;
        } else { this.cooldown--; }
      }
      hit() { return --this.health <= 0; }
    }

    function setup() {
      const container = document.getElementById('sketch-container');
      const ar = 800 / 600;
      let w = Math.min(container.clientWidth, 800);
      let h = w / ar;
      if (h > window.innerHeight * 0.8) { h = window.innerHeight * 0.8; w = h * ar; }
      canvas = createCanvas(w, h);
      canvas.parent('sketch-container');

      for (let i = 0; i < 120; i++) backgroundStars.push(new Star());
      resetGame();
      window.addEventListener('resize', handleResize);
    }

    function resetGame() {
      player = new Player();
      enemies = [];
      playerBullets = [];
      enemyBullets = [];
      particles = [];
      score = 0;
      lives = 1;
      bombs = 3;
      activeBomb = 0;
      gameState = 'playing';
      perfectRun = true;
      document.getElementById('live-score').textContent = 'SCORE: ' + score.toString().padStart(6, '0');
    }

    function handleResize() {
      const container = document.getElementById('sketch-container');
      if (!container) return;
      const ar = 800 / 600;
      let w = Math.min(container.clientWidth, 800);
      let h = w / ar;
      if (h > window.innerHeight * 0.8) { h = window.innerHeight * 0.8; w = h * ar; }
      resizeCanvas(w, h);
    }

    function draw() {
      background(10, 5, 30);
      backgroundStars.forEach(s => { s.update(); s.show(); });

      // Nebula
      noStroke();
      fill(80, 40, 180, 8);
      ellipse(width/2 + sin(frameCount*0.01)*80, height/2, width*1.1, height*0.7);
      fill(150, 60, 220, 6);
      ellipse(width/2, height/2 + cos(frameCount*0.012)*70, width*0.8, height*1.2);

      if (gameState === 'start') return drawStart();
      if (gameState === 'gameOver') return drawGameOver();

      if (activeBomb > 0) {
        activeBomb--;
        frameRate(45);
        noFill(); stroke(150, 255, 255, 200 - activeBomb*2);
        strokeWeight(2); ellipse(player.x, player.y, activeBomb * 1.2);
      } else { frameRate(60); }

      player.move();
      if (mouseIsPressed || keyIsDown(90)) player.shoot();
      if (keyIsDown(88) && activeBomb === 0) player.useBomb();

      // Spawn enemies
      if (frameCount - lastSpawn > SPAWN_INTERVAL - min(30, score/200)) {
        enemies.push(new Enemy());
        lastSpawn = frameCount;
      }

      // Update player
      if (player.invuln > 0) player.invuln--;
      player.show();

      // Enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.move();
        e.show();
        e.shoot();
        for (let j = playerBullets.length - 1; j >= 0; j--) {
          const b = playerBullets[j];
          if (dist(e.x, e.y, b.x, b.y) < ENEMY_SIZE/2 + b.size/2) {
            if (e.hit()) {
              score += e.score;
              document.getElementById('live-score').textContent = 'SCORE: ' + score.toString().padStart(6, '0');
              enemies.splice(i, 1);
              // Explosion effect
              for (let f = 0; f < 8; f++) {
                if (explosionImg) {
                  particles.push({
                    img: explosionImg,
                    x: e.x,
                    y: e.y,
                    frame: f,
                    life: 8
                  });
                }
              }
            }
            playerBullets.splice(j, 1);
            break;
          }
        }
        if (e.y > height + 30) enemies.splice(i, 1);
      }

      // Player bullets
      for (let i = playerBullets.length - 1; i >= 0; i--) {
        const b = playerBullets[i];
        b.y += b.vy;
        noStroke(); fill(b.col); ellipse(b.x, b.y, b.size);
        if (b.y < -10) playerBullets.splice(i, 1);
      }

      // Enemy bullets
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx; b.y += b.vy;
        if (activeBomb > 0 && dist(player.x, player.y, b.x, b.y) < activeBomb) {
          enemyBullets.splice(i, 1);
          continue;
        }
        if (player.grazed(b)) continue;
        noStroke(); fill(b.col); ellipse(b.x, b.y, b.size);
        if (dist(player.x, player.y, b.x, b.y) < PLAYER_SIZE/2 + b.size/2 && !activeBomb) {
          if (player.hit()) if (lives <= 0) gameState = 'gameOver';
          enemyBullets.splice(i, 1);
        }
        if (b.y > height + 10 || b.x < -10 || b.x > width + 10) enemyBullets.splice(i, 1);
      }

      // Particles (including explosion frames)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.img) {
          // Animated explosion sprite
          p.life--;
          if (p.life <= 0) { particles.splice(i, 1); continue; }
          push();
          translate(p.x, p.y);
          imageMode(CENTER);
          // explosion.png: 8 frames horizontally, 32x32 each
          const fw = 32, fh = 32;
          image(p.img, 0, 0, fw, fh, p.frame * fw, 0, fw, fh);
          pop();
        } else {
          p.update();
          p.show();
          if (p.dead()) particles.splice(i, 1);
        }
      }

      drawHUD();

      if (lives <= 0) gameState = 'gameOver';
    }

    function drawHUD() {
      fill(255, 220, 100); textSize(20); textFont('monospace');
      text('SCORE: ' + score.toString().padStart(6, '0'), 20, 28);
      fill(255, 180, 255); text('BOMB: ' + bombs + (activeBomb > 0 ? '!' : ''), width - 140, 28);
      if (perfectRun && frameCount % 60 < 30) { fill(255, 255, 150); textSize(16); text('PERFECT', width/2, 28); }
      fill(180, 255, 255); textSize(14); text('GRAZE: ' + player.graze, width - 100, height - 16);
    }

    function drawStart() {
      textAlign(CENTER, CENTER);
      fill(255, 150, 255); textSize(48); text('TOUHOU LEGACY', width/2, height/2 - 80);
      fill(180, 220, 255); textSize(24); text('1 CREDIT CLEAR CHALLENGE', width/2, height/2 - 30);
      fill(255, 220, 150); textSize(20); text('Survive the bullet curtain', width/2, height/2);
      fill(200, 240, 255); textSize(18); text('Z/X — Shoot/Bomb • R — Restart', width/2, height/2 + 40);
      const pulse = sin(frameCount * 0.1) * 30 + 150;
      fill(120, 240, 255, pulse); textSize(26); text('CLICK TO START', width/2, height/2 + 90);
      player = new Player(); player.x = width/2; player.y = height/2 + 60; player.show();
    }

    function drawGameOver() {
      textAlign(CENTER, CENTER);
      fill(255, 100, 150); textSize(56); text('GAME OVER', width/2, height/2 - 60);
      fill(255, 220, 120); textSize(32); text('FINAL SCORE: ' + score, width/2, height/2);
      if (perfectRun) { fill(255, 255, 150); textSize(24); text('PERFECT CLEAR!', width/2, height/2 + 40); }
      fill(180, 230, 255); textSize(22); text('CLICK OR PRESS R TO RESTART', width/2, height/2 + 80);
    }

    function mouseClicked() { if (gameState === 'start') gameState = 'playing'; else if (gameState === 'gameOver') resetGame(); }
    function keyPressed() { if (gameState === 'gameOver' && (key === 'r' || key === 'R')) resetGame(); }
    function touchStarted() { if (gameState === 'playing') player.shoot(); return false; }
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://raw.githubusercontent.com 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://raw.githubusercontent.com data:; frame-ancestors 'none'",
      }
    });
  }
};
