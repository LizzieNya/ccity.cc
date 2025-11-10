export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Redirect root domain to game page
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return Response.redirect('https://1cc.ccity.cc/game', 302);
    }

    // Serve game only at /game path
    if (url.pathname !== '/game') {
      return new Response('Not found', { status: 404 });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>1cc - Touhou Legacy</title>
  <meta name="description" content="Bullet-hell shooter inspired by Touhou Project. One-credit clear challenge!">
  <meta property="og:title" content="1cc - Touhou Legacy">
  <meta property="og:description" content="Can you survive with just one credit?">
  <meta property="og:url" content="https://1cc.ccity.cc">
  <meta property="og:type" content="game">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.6.0/p5.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;background:radial-gradient(circle at 10% 20%, #0f0c29, #302b63, #24243e);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0.5rem;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#e0e0ff;overflow:hidden;position:relative}
    body::before{content:'';position:absolute;top:0;left:0;width:100%;height:100%;background:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="none" stroke="%234a00ff" stroke-width="0.5" opacity="0.1"/></svg>');background-size:40px 40px;z-index:-1;opacity:0.7}
    .header{position:fixed;top:0;left:0;width:100%;padding:0.8rem;display:flex;justify-content:space-between;align-items:center;background:rgba(15,12,41,0.9);border-bottom:1px solid #6a00ff80;z-index:100}
    .logo{font-size:1.8rem;font-weight:800;background:linear-gradient(45deg,#ff00ff,#00ccff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 10px rgba(106,0,255,0.5)}
    .game-container{position:relative;border:2px solid #8b5cf6cc;border-radius:1.5rem;box-shadow:0 0 30px rgba(139,92,246,0.6), inset 0 0 15px rgba(0,200,255,0.3);overflow:hidden;margin:1rem 0;background:rgba(10,5,30,0.7);backdrop-filter:blur(5px);max-width:95vw}
    .info-panel{max-width:600px;text-align:center;padding:1.2rem;background:rgba(25,15,60,0.8);border-radius:1.2rem;margin:1rem;border:1px solid #5e2fff80}
    .info-panel h1{font-size:2.2rem;font-weight:800;margin:0.5rem 0;background:linear-gradient(45deg,#ff1c8d,#9f00ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 15px rgba(159,0,255,0.4)}
    .info-panel p{font-size:1.15rem;line-height:1.7;margin:0.8rem 0;color:#c5c5ff}
    .controls{margin-top:1rem;text-align:left;padding:1rem;background:rgba(30,10,70,0.6);border-radius:1rem;border:1px solid #7a3fff70}
    .controls span{color:#ff3cff;font-weight:700;text-shadow:0 0 5px #ff3cff}
    .footer{position:fixed;bottom:0;left:0;width:100%;padding:0.7rem;text-align:center;font-size:0.9rem;color:#aaa;background:rgba(15,12,41,0.9);border-top:1px solid #6a00ff80}
    @media (max-width:640px){.info-panel h1{font-size:1.8rem}.info-panel p{font-size:1rem}.logo{font-size:1.5rem}}
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">1cc.ccity.cc</div>
    <div class="score-display" id="live-score">SCORE: 000000</div>
  </div>
  
  <div class="game-container" id="sketch-container"></div>
  
  <div class="info-panel">
    <h1>T O U H O U &nbsp; L E G A C Y</h1>
    <p>One Credit Clear Challenge • Survive the danmaku storm</p>
    <div class="controls">
      <p><span>Move:</span> WASD or Arrow Keys</p>
      <p><span>Shoot:</span> Mouse Click or Z Key</p>
      <p><span>Bomb:</span> X Key (limited uses)</p>
      <p><span>Restart:</span> R Key after game over</p>
    </div>
  </div>
  
  <div class="footer">
    <p>ccity.cc • Inspired by Team Shanghai Alice • 1 Credit Clear Challenge</p>
  </div>

  <script>
    // Game constants
    const PLAYER_SIZE = 28;
    const BULLET_SIZE = 7;
    const ENEMY_SIZE = 38;
    const PARTICLE_COUNT = 25;
    const SPAWN_INTERVAL = 55;
    const BOMB_DURATION = 60; // frames
    
    // Game state
    let player;
    let enemies = [];
    let playerBullets = [];
    let enemyBullets = [];
    let particles = [];
    let score = 0;
    let lives = 1; // 1CC challenge!
    let bombs = 3;
    let gameState = 'start'; // 'start', 'playing', 'gameOver'
    let lastSpawn = 0;
    let backgroundStars = [];
    let canvas;
    let activeBomb = 0;
    let perfectRun = true;
    
    // Particle class for explosions
    class Particle {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = random(1.5, 5);
        this.speedX = random(-4, 4);
        this.speedY = random(-4, 4);
        this.color = color;
        this.life = 255;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 2.5;
        this.size *= 0.96;
      }
      
      show() {
        noStroke();
        fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], this.life);
        ellipse(this.x, this.y, this.size);
      }
      
      isDead() {
        return this.life <= 0 || this.size <= 0.4;
      }
    }
    
    // Star class for background
    class Star {
      constructor() {
        this.x = random(width);
        this.y = random(height);
        this.size = random(0.8, 2.5);
        this.speed = random(0.8, 2.5);
        this.brightness = random(150, 255);
      }
      
      update() {
        this.y += this.speed;
        if (this.y > height) {
          this.y = 0;
          this.x = random(width);
        }
      }
      
      show() {
        noStroke();
        fill(255, 255, 255, this.brightness);
        ellipse(this.x, this.y, this.size);
      }
    }
    
    // Player class
    class Player {
      constructor() {
        this.x = width / 2;
        this.y = height - 80;
        this.size = PLAYER_SIZE;
        this.speed = 7;
        this.cooldown = 0;
        this.invulnerable = 0;
        this.graze = 0;
      }
      
      show() {
        if (this.invulnerable > 0 && frameCount % 4 < 2 && perfectRun) return;
        
        push();
        translate(this.x, this.y);
        
        // Player hitbox indicator
        if (this.invulnerable > 0) {
          noFill();
          stroke(100, 255, 255, 150);
          strokeWeight(1.5);
          ellipse(0, 0, this.size * 0.7);
        }
        
        // Player ship body - Touhou style
        noStroke();
        
        // Main body gradient
        for (let i = 0; i < this.size; i += 2) {
          const alpha = map(i, 0, this.size, 200, 50);
          fill(180, 200, 255, alpha);
          ellipse(0, 0, this.size - i, this.size - i * 0.7);
        }
        
        // Character orb
        fill(255, 220, 100);
        ellipse(0, -this.size/3, this.size/2.5, this.size/2.5);
        
        // Glow effect
        if (this.invulnerable > 0) {
          fill(100, 255, 255, 50);
          ellipse(0, 0, this.size + 10, this.size + 10);
        }
        
        pop();
      }
      
      move() {
        let moveX = 0;
        let moveY = 0;
        
        if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) moveX = -1;
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) moveX = 1;
        if (keyIsDown(UP_ARROW) || keyIsDown(87)) moveY = -1;
        if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) moveY = 1;
        
        // Diagonal movement normalization
        if (moveX !== 0 && moveY !== 0) {
          moveX *= 0.7071;
          moveY *= 0.7071;
        }
        
        this.x += moveX * this.speed;
        this.y += moveY * this.speed;
        
        // Screen boundaries with padding
        this.x = constrain(this.x, this.size * 0.8, width - this.size * 0.8);
        this.y = constrain(this.y, this.size * 0.8, height - this.size * 0.8);
      }
      
      shoot() {
        if (this.cooldown <= 0) {
          // Main shot
          playerBullets.push({
            x: this.x,
            y: this.y - this.size/1.5,
            speed: -18,
            size: BULLET_SIZE * 0.9,
            color: color(150, 220, 255),
            piercing: false
          });
          
          // Side shots when holding shift
          if (keyIsDown(SHIFT)) {
            playerBullets.push({
              x: this.x - this.size/2,
              y: this.y - this.size/3,
              speed: -16,
              size: BULLET_SIZE * 0.7,
              color: color(150, 255, 200),
              piercing: false
            });
            playerBullets.push({
              x: this.x + this.size/2,
              y: this.y - this.size/3,
              speed: -16,
              size: BULLET_SIZE * 0.7,
              color: color(150, 255, 200),
              piercing: false
            });
          }
          
          this.cooldown = 6;
        } else {
          this.cooldown--;
        }
      }
      
      useBomb() {
        if (bombs > 0 && activeBomb === 0) {
          bombs--;
          activeBomb = BOMB_DURATION;
          perfectRun = true; // Bomb usage doesn't break perfect run
          
          // Clear all bullets
          enemyBullets = [];
          
          // Damage all enemies
          enemies.forEach(enemy => {
            enemy.health = Math.max(0, enemy.health - 3);
            if (enemy.health <= 0) {
              createExplosion(enemy.x, enemy.y, enemy.color);
              score += enemy.scoreValue * 0.5; // Reduced score for bomb kills
            }
          });
        }
      }
      
      hit() {
        if (this.invulnerable <= 0) {
          perfectRun = false;
          lives--;
          this.invulnerable = 150; // 2.5 seconds invulnerability
          createExplosion(this.x, this.y, color(255, 150, 200));
          return true;
        }
        return false;
      }
      
      grazed(bullet) {
        if (dist(this.x, this.y, bullet.x, bullet.y) < this.size * 0.8 + bullet.size * 0.7) {
          this.graze++;
          score += 5;
          return true;
        }
        return false;
      }
    }
    
    // Create explosion particles
    function createExplosion(x, y, color) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(x, y, color));
      }
    }
    
    // Enemy class
    class Enemy {
      constructor(type = 'standard') {
        this.x = random(60, width - 60);
        this.y = -60;
        this.size = ENEMY_SIZE;
        this.speed = random(1.8, 3.5);
        this.health = type === 'boss' ? 15 : 1;
        this.type = type;
        this.cooldown = 0;
        this.maxCooldown = type === 'boss' ? 25 : 55;
        this.color = type === 'boss' ? color(255, 50, 180) : color(255, 120, 120);
        this.scoreValue = type === 'boss' ? 1500 : 120;
        this.direction = random() > 0.5 ? 1 : -1;
        this.phase = 0;
      }
      
      show() {
        push();
        translate(this.x, this.y);
        
        // Enemy glow effect
        noStroke();
        fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], 80);
        ellipse(0, 0, this.size * 1.8, this.size * 1.8);
        
        // Enemy body
        fill(this.color);
        
        if (this.type === 'boss') {
          // Boss design - Touhou inspired
          beginShape();
          vertex(0, -this.size/1.2);
          vertex(-this.size/1.3, this.size/3);
          vertex(-this.size/2, this.size/1.3);
          vertex(this.size/2, this.size/1.3);
          vertex(this.size/1.3, this.size/3);
          endShape(CLOSE);
          
          // Boss core
          fill(255, 255, 150);
          ellipse(0, this.size/5, this.size/2.8, this.size/2.8);
          
          // Core glow
          fill(255, 255, 100, 100);
          ellipse(0, this.size/5, this.size/2, this.size/2);
        } else {
          // Standard enemy - fairy design
          ellipse(0, 0, this.size, this.size);
          
          // Fairy wings
          fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], 150);
          beginShape();
          vertex(0, -this.size/1.5);
          vertex(-this.size/1.2, -this.size/3);
          vertex(-this.size/2.5, this.size/1.5);
          vertex(this.size/2.5, this.size/1.5);
          vertex(this.size/1.2, -this.size/3);
          endShape(CLOSE);
        }
        
        pop();
      }
      
      move() {
        if (this.type === 'boss') {
          // Boss movement pattern
          this.phase += 0.02;
          this.x = width/2 + sin(this.phase) * (width/3 - 100);
          
          // Move down slowly
          if (this.y < height/3) {
            this.y += this.speed * 0.5;
          }
        } else {
          // Standard enemy movement
          this.y += this.speed;
          
          // Slight horizontal drift
          this.x += sin(frameCount * 0.03) * 1.5;
        }
      }
      
      shoot() {
        if (this.cooldown <= 0) {
          if (this.type === 'boss') {
            // Boss spell card pattern
            const bulletCount = 18;
            const spread = PI * 1.8;
            
            for (let i = 0; i < bulletCount; i++) {
              const angle = map(i, 0, bulletCount, -spread/2, spread/2);
              const speed = 4;
              
              enemyBullets.push({
                x: this.x + cos(angle) * 20,
                y: this.y + sin(angle) * 20 + this.size/2,
                speedX: cos(angle) * speed,
                speedY: sin(angle) * speed,
                size: BULLET_SIZE * 1.6,
                color: color(255, 80, 150),
                homing: frameCount % 120 < 60 // Alternate between normal and homing bullets
              });
            }
          } else {
            // Standard enemy shoots aimed bullets
            const angle = atan2(player.y - this.y, player.x - this.x);
            const speed = 3.5;
            
            enemyBullets.push({
              x: this.x,
              y: this.y + this.size/2,
              speedX: cos(angle) * speed,
              speedY: sin(angle) * speed,
              size: BULLET_SIZE * 1.1,
              color: color(255, 130, 130),
              homing: false
            });
          }
          this.cooldown = this.maxCooldown;
        } else {
          this.cooldown--;
        }
      }
      
      takeDamage() {
        this.health--;
        if (this.health <= 0) {
          createExplosion(this.x, this.y, this.color);
          return true;
        }
        return false;
      }
    }
    
    // Initialize game
    function setup() {
      const container = document.getElementById('sketch-container');
      const aspectRatio = 800 / 600;
      let canvasWidth = Math.min(container.clientWidth, 850);
      let canvasHeight = canvasWidth / aspectRatio;
      
      if (canvasHeight > window.innerHeight * 0.85) {
        canvasHeight = window.innerHeight * 0.85;
        canvasWidth = canvasHeight * aspectRatio;
      }
      
      canvas = createCanvas(canvasWidth, canvasHeight);
      canvas.parent('sketch-container');
      
      // Create background stars
      backgroundStars = [];
      for (let i = 0; i < 150; i++) {
        backgroundStars.push(new Star());
      }
      
      resetGame();
      
      // Initial resize
      window.addEventListener('resize', handleResize);
    }
    
    // Reset game state
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
      lastSpawn = 0;
      gameState = 'playing';
      perfectRun = true;
      
      // Update live score display
      document.getElementById('live-score').textContent = `;SCORE: ${score.toString().padStart(6, '0')}`;
    }
    
    // Handle window resize
    function handleResize() {
      const container = document.getElementById('sketch-container');
      if (!container) return;
      
      const aspectRatio = 800 / 600;
      let canvasWidth = Math.min(container.clientWidth, 850);
      let canvasHeight = canvasWidth / aspectRatio;
      
      if (canvasHeight > window.innerHeight * 0.85) {
        canvasHeight = window.innerHeight * 0.85;
        canvasWidth = canvasHeight * aspectRatio;
      }
      
      resizeCanvas(canvasWidth, canvasHeight);
      
      // Reposition background stars
      backgroundStars = [];
      for (let i = 0; i < 150; i++) {
        backgroundStars.push(new Star());
      }
    }
    
    // Main draw loop
    function draw() {
      // Draw animated background
      background(15, 10, 35);
      
      // Draw starfield
      backgroundStars.forEach(star => {
        star.update();
        star.show();
      });
      
      // Pulsing nebula effect
      noStroke();
      fill(100, 50, 200, 5);
      ellipse(width/2 + sin(frameCount * 0.01) * 100, height/2 + cos(frameCount * 0.015) * 80, width * 1.2, height * 1.2);
      
      fill(150, 80, 255, 4);
      ellipse(width/2 - cos(frameCount * 0.012) * 120, height/2 - sin(frameCount * 0.018) * 90, width, height);
      
      if (gameState === 'start') {
        drawStartScreen();
        return;
      }
      
      if (gameState === 'gameOver') {
        drawGameOverScreen();
        return;
      }
      
      // Active bomb effect
      if (activeBomb > 0) {
        activeBomb--;
        
        // Bomb shockwave
        noFill();
        stroke(100, 255, 255, 200 - activeBomb * 2);
        strokeWeight(3 - activeBomb/20);
        ellipse(player.x, player.y, activeBomb * 1.5);
        
        // Slow motion effect
        frameRate(45 - activeBomb * 0.2);
      } else {
        frameRate(60);
      }
      
      // Game logic
      player.move();
      
      // Shooting with mouse or Z key
      if (mouseIsPressed || keyIsDown(90)) {
        player.shoot();
      }
      
      // Bomb with X key
      if (keyIsDown(88) && activeBomb === 0) {
        player.useBomb();
      }
      
      // Spawn enemies with increasing difficulty
      const spawnDifficulty = min(1, frameCount / 3600); // Max difficulty after 1 minute
      const currentSpawnInterval = SPAWN_INTERVAL * (1 - spawnDifficulty * 0.7);
      
      if (frameCount - lastSpawn > currentSpawnInterval) {
        // Spawn bosses at specific score intervals
        if (score > 0 && score % 3500 < 120 * spawnDifficulty) {
          enemies.push(new Enemy('boss'));
        } else {
          // Spawn groups of enemies at higher difficulties
          const groupSize = spawnDifficulty > 0.7 ? 3 : (spawnDifficulty > 0.4 ? 2 : 1);
          
          for (let i = 0; i < groupSize; i++) {
            enemies.push(new Enemy());
          }
        }
        lastSpawn = frameCount;
      }
      
      // Update and draw player
      if (player.invulnerable > 0) player.invulnerable--;
      player.show();
      
      // Update and draw enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.move();
        enemy.show();
        enemy.shoot();
        
        // Check collision with player bullets
        for (let j = playerBullets.length - 1; j >= 0; j--) {
          const bullet = playerBullets[j];
          const d = dist(enemy.x, enemy.y, bullet.x, bullet.y);
          if (d < enemy.size/2 + bullet.size/2) {
            if (enemy.takeDamage()) {
              score += enemy.scoreValue;
              document.getElementById('live-score').textContent = `SCORE: ${score.toString().padStart(6, '0')}`;
              enemies.splice(i, 1);
            }
            if (!bullet.piercing) {
              playerBullets.splice(j, 1);
            }
            break;
          }
        }
        
        // Remove enemies that go off screen
        if (enemy.y > height + enemy.size) {
          enemies.splice(i, 1);
        }
      }
      
      // Update and draw player bullets
      for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        bullet.y += bullet.speed;
        
        // Trail effect
        noStroke();
        fill(bullet.color.levels[0], bullet.color.levels[1], bullet.color.levels[2], 150);
        ellipse(bullet.x, bullet.y + 5, bullet.size * 1.5, bullet.size * 2);
        
        fill(bullet.color);
        ellipse(bullet.x, bullet.y, bullet.size);
        
        // Screen boundaries
        if (bullet.y < -bullet.size || bullet.x < 0 || bullet.x > width) {
          playerBullets.splice(i, 1);
        }
      }
      
      // Update and draw enemy bullets
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        
        // Homing bullets adjust direction toward player
        if (bullet.homing && frameCount % 5 === 0) {
          const targetAngle = atan2(player.y - bullet.y, player.x - bullet.x);
          const currentAngle = atan2(bullet.speedY, bullet.speedX);
          let angleDiff = targetAngle - currentAngle;
          
          // Normalize angle difference
          while (angleDiff > PI) angleDiff -= TWO_PI;
          while (angleDiff < -PI) angleDiff += TWO_PI;
          
          // Adjust direction gradually
          const turnRate = 0.08;
          if (abs(angleDiff) > 0.01) {
            if (angleDiff > 0) {
              bullet.speedX = cos(currentAngle + turnRate) * 3.5;
              bullet.speedY = sin(currentAngle + turnRate) * 3.5;
            } else {
              bullet.speedX = cos(currentAngle - turnRate) * 3.5;
              bullet.speedY = sin(currentAngle - turnRate) * 3.5;
            }
          }
        } else {
          bullet.x += bullet.speedX;
          bullet.y += bullet.speedY;
        }
        
        // Bomb clears bullets
        if (activeBomb > 0) {
          const d = dist(player.x, player.y, bullet.x, bullet.y);
          if (d < activeBomb * 1.2) {
            enemyBullets.splice(i, 1);
            continue;
          }
        }
        
        // Graze detection
        if (player.grazed(bullet)) {
          continue;
        }
        
        // Draw bullet with glow
        noStroke();
        fill(bullet.color.levels[0], bullet.color.levels[1], bullet.color.levels[2], 100);
        ellipse(bullet.x, bullet.y, bullet.size * 1.8, bullet.size * 1.8);
        fill(bullet.color);
        ellipse(bullet.x, bullet.y, bullet.size);
        
        // Check collision with player
        const d = dist(player.x, player.y, bullet.x, bullet.y);
        if (d < PLAYER_SIZE/2.2 + bullet.size/2 && !activeBomb) {
          if (player.hit()) {
            if (lives <= 0) {
              gameState = 'gameOver';
            }
          }
          enemyBullets.splice(i, 1);
          continue;
        }
        
        // Screen boundaries
        if (bullet.y > height + bullet.size || bullet.x < -bullet.size || bullet.x > width + bullet.size) {
          enemyBullets.splice(i, 1);
        }
      }
      
      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].show();
        if (particles[i].isDead()) {
          particles.splice(i, 1);
        }
      }
      
      // Draw HUD
      drawHUD();
      
      // Game over at 0 lives
      if (lives <= 0) {
        gameState = 'gameOver';
      }
    }
    
    // Draw HUD elements
    function drawHUD() {
      push();
      noStroke();
      
      // Score
      fill(255, 220, 100);
      textSize(22);
      textFont('monospace');
      text(`SCORE: ${score.toString().padStart(6, '0')}`, 20, 30);
      
      // Bomb count with visual indicator
      fill(255, 150, 255);
      textSize(20);
      text(`BOMB: ${bombs} ${activeBomb > 0 ? '!' : ''}`, width - 180, 30);
      
      // Perfect run indicator
      if (perfectRun && frameCount % 60 < 30) {
        fill(255, 255, 100);
        textSize(18);
        text('PERFECT', width/2, 30);
      }
      
      // Graze counter
      fill(150, 255, 255);
      textSize(16);
      text(`GRAZE: ${player.graze}`, width - 120, height - 20);
      
      // Lives indicator (1CC challenge)
      fill(255, 120, 180);
      ellipse(30, height - 30, 25, 25);
      
      if (lives <= 0 || !perfectRun) {
        fill(150, 50, 100);
        ellipse(30, height - 30, 15, 15);
      } else {
        fill(255, 220, 100);
        ellipse(30, height - 30, 12, 12);
      }
      
      pop();
    }
    
    // Draw start screen
    function drawStartScreen() {
      push();
      textAlign(CENTER, CENTER);
      
      // Title with glow
      noStroke();
      fill(255, 150, 255, 100);
      textSize(56);
      textFont('monospace');
      text('TOUHOU LEGACY', width/2, height/2 - 110);
      
      fill(200, 100, 255);
      textSize(52);
      text('TOUHOU LEGACY', width/2, height/2 - 110);
      
      // Subtitle
      fill(120, 200, 255);
      textSize(26);
      text('1 CREDIT CLEAR CHALLENGE', width/2, height/2 - 50);
      
      // Tagline
      fill(255, 215, 100);
      textSize(22);
      text('Survive the bullet curtain', width/2, height/2 - 20);
      
      // Instructions
      fill(200, 220, 255);
      textSize(19);
      text('WASD/ARROWS - Move\nZ or CLICK - Shoot\nX - Bomb (limited)\nR - Restart', width/2, height/2 + 30);
      
      // Start prompt with pulse
      const pulse = sin(frameCount * 0.1) * 20 + 180;
      fill(100, 255, 200, pulse);
      textSize(28);
      text('CLICK TO START', width/2, height/2 + 100);
      
      // Draw player preview
      player = new Player();
      player.x = width/2;
      player.y = height/2 + 60;
      player.show();
      
      pop();
    }
    
    // Draw game over screen
    function drawGameOverScreen() {
      push();
      textAlign(CENTER, CENTER);
      
      // Game over text with glow
      noStroke();
      fill(255, 100, 150, 100);
      textSize(60);
      textFont('monospace');
      text('GAME OVER', width/2, height/2 - 60);
      
      fill(255, 80, 120);
      textSize(56);
      text('GAME OVER', width/2, height/2 - 60);
      
      // Score display
      fill(255, 220, 100);
      textSize(36);
      text(`FINAL SCORE: ${score}`, width/2, height/2 + 10);
      
      // Perfect run badge
      if (perfectRun) {
        fill(255, 255, 100);
        textSize(28);
        text('PERFECT CLEAR!', width/2, height/2 + 50);
      }
      
      // Restart prompt with pulse
      const pulse = sin(frameCount * 0.1) * 30 + 150;
      fill(150, 220, 255, pulse);
      textSize(24);
      text('CLICK OR PRESS R TO RESTART', width/2, height/2 + 95);
      
      pop();
    }
    
    // Mouse events
    function mouseClicked() {
      if (gameState === 'start') {
        gameState = 'playing';
      } else if (gameState === 'gameOver') {
        resetGame();
      }
    }
    
    // Keyboard events
    function keyPressed() {
      if (gameState === 'gameOver' && (key === 'r' || key === 'R')) {
        resetGame();
      }
      if (gameState === 'start' && keyCode === ENTER) {
        gameState = 'playing';
      }
      // Prevent scrolling with space/arrows
      if ([32, 37, 38, 39, 40].includes(keyCode)) {
        return false;
      }
    }
    
    // Prevent context menu on canvas
    function touchStarted() {
      if (gameState === 'playing') {
        player.shoot();
      }
      return false;
    }
    
    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
      window.removeEventListener('resize', handleResize);
    });
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
        'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'",
      }
    });
  }
};
