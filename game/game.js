/* ===== Snake Clash! — Game Engine ===== */
(function() {
  'use strict';

  // --- Load Progression System ---
  if (typeof ProgressionSystem !== 'undefined') {
    ProgressionSystem.load();
  }

  // --- Constants ---
  const GRID_SIZE = 10;            // 10x10 grid
  const CANVAS_SIZE = 320;
  const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
  const SAVE_KEY = 'snake_clash_save';
  const DAILY_SEED_KEY = 'snake_clash_daily_seed';

  // Levels: target score to advance
  const LEVEL_TARGETS = [
    20, 50, 100, 180, 300, 500, 800, 1200, 1800, 2500,
    3500, 5000, 7000, 10000, 15000
  ];

  // Base speed (ms per tick) per level — SLOWER pace
  const BASE_INTERVALS = [350, 310, 280, 250, 220, 190, 165, 140, 120, 100, 85, 70, 58, 48, 40];

  // Food types
  const FOOD = {
    REGULAR: { char: '🍎', points: 10, color: '#2ed573' },
    GOLD:    { char: '⭐', points: 50, color: '#f5c518' },
    POISON:  { char: '💀', points: -20, color: '#e94560' }
  };

  // Directions
  const DIR = {
    UP:    { x: 0, y: -1 },
    DOWN:  { x: 0, y: 1 },
    LEFT:  { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
  };

  // Power-up costs
  const COST_SPEED  = 5;
  const COST_SHIELD = 8;
  const COST_MAGNET = 12;

  // --- DOM refs ---
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const highscoreEl = document.getElementById('highscore');
  const levelEl = document.getElementById('level');
  const coinsEl = document.getElementById('coins');
  const comboDisplay = document.getElementById('combo-display');
  const comboCount = document.getElementById('combo-count');
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownText = document.getElementById('countdown-text');
  const swipeHint = document.getElementById('swipe-hint');
  const toast = document.getElementById('toast');
  const goOverlay = document.getElementById('game-over');
  const goTitle = document.getElementById('go-title');
  const goScore = document.getElementById('go-score');
  const goDetail = document.getElementById('go-detail');
  const goCoins = document.getElementById('go-coins');
  const goDouble = document.getElementById('go-double');
  const goRestart = document.getElementById('go-restart');

  const btnDaily = document.getElementById('btn-daily');
  const btnClassic = document.getElementById('btn-classic');
  const btnRestart = document.getElementById('btn-restart');
  const btnShop = document.getElementById('btn-shop');
  const btnSpeed = document.getElementById('pu-speed');
  const btnShield = document.getElementById('pu-shield');
  const btnMagnet = document.getElementById('pu-magnet');
  const btnRewardDouble = document.getElementById('btn-reward-double');

  // HUD elements
  const hudLevel = document.getElementById('hud-level');
  const hudCoins = document.getElementById('hud-coins');
  const hudGems = document.getElementById('hud-gems');

  // Particle system
  let particles = null;

  // --- Game state ---
  let snake = [];           // array of {x, y}
  let direction = DIR.RIGHT;
  let nextDirection = DIR.RIGHT;
  let food = null;           // { x, y, type }
  let grid = [];             // 2D array: 0=empty, 1=snake, 2=food
  let score = 0;
  let coins = 0;
  let level = 1;
  let combo = 0;
  let foodEaten = 0;        // total food eaten this game
  let mode = 'daily';       // 'daily' or 'classic'
  let running = false;
  let gameLoop = null;
  let rng = null;            // seeded RNG for daily mode
  let shieldActive = false;
  let speedActive = false;
  let magnetActive = false;
  let pendingRemoval = [];   // cells to remove (for poison)
  let dailySeed = 0;
  let scoreMult = 1;         // from progression bonuses
  let foodBonus = 0;         // bonus points per food
  let comboBonus = 0;        // bonus points per combo level
  let scorePerFood = 0;      // flat bonus per food eaten
  let magnetRangeExtra = 0;  // extra magnet range

  // Power-ups purchased before round
  let purchasedSpeed = false;
  let purchasedShield = false;
  let purchasedMagnet = false;

  // High scores per mode
  let highScores = { daily: 0, classic: 0 };

  // Ad integration
  let adPendingCallback = null;
  const hasNativeAds = typeof window.AndroidAds !== 'undefined';

  window.onAdReward = function() {
    if (adPendingCallback) { adPendingCallback(); adPendingCallback = null; }
  };

  // --- Seeded random (mulberry32) ---
  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // --- Utility ---
  function computeDailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function getDailySeedStr() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function rand(min, max) {
    const r = rng ? rng() : Math.random();
    return Math.floor(r * (max - min + 1)) + min;
  }

  function getInterval() {
    const idx = Math.min(level - 1, BASE_INTERVALS.length - 1);
    let interval = BASE_INTERVALS[idx];
    if (speedActive) interval = Math.max(50, Math.floor(interval * 0.6));
    return interval;
  }

  // Load progression bonuses
  function loadBonuses() {
    if (typeof ProgressionSystem === 'undefined') {
      scoreMult = 1;
      foodBonus = 0;
      comboBonus = 0;
      scorePerFood = 0;
      magnetRangeExtra = 0;
      return;
    }
    const b = ProgressionSystem.getActiveBonuses();
    scoreMult = b.scoreMult;
    foodBonus = b.foodBonus;
    comboBonus = b.comboBonus;
    scorePerFood = b.scorePerFood;
    magnetRangeExtra = b.magnetRange;
  }

  // --- Grid management ---
  function createGrid() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  }

  function updateGrid() {
    grid = createGrid();
    for (const seg of snake) {
      if (seg.x >= 0 && seg.x < GRID_SIZE && seg.y >= 0 && seg.y < GRID_SIZE) {
        grid[seg.y][seg.x] = 1;
      }
    }
    if (food) {
      grid[food.y][food.x] = 2;
    }
  }

  // --- Food spawning ---
  function spawnFood() {
    const emptyCells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === 0) emptyCells.push({ x, y });
      }
    }
    if (emptyCells.length === 0) return false;

    const cell = emptyCells[rand(0, emptyCells.length - 1)];

    // Determine type
    const roll = rand(1, 100);
    let type;
    if (roll <= 10) {       // 10% gold
      type = 'GOLD';
    } else if (roll <= 20) { // 10% poison
      type = 'POISON';
    } else {                 // 80% regular
      type = 'REGULAR';
    }

    food = { x: cell.x, y: cell.y, type: FOOD[type] };
    grid[cell.y][cell.x] = 2;
    return true;
  }

  // --- Snake management ---
  function initSnake() {
    const midY = Math.floor(GRID_SIZE / 2);
    snake = [
      { x: 2, y: midY },
      { x: 1, y: midY },
      { x: 0, y: midY }
    ];
    direction = DIR.RIGHT;
    nextDirection = DIR.RIGHT;
  }

  function moveSnake() {
    direction = nextDirection;
    const head = snake[0];
    const newHead = {
      x: head.x + direction.x,
      y: head.y + direction.y
    };

    // --- Collision check ---
    let willCollide = false;
    let collisionReason = '';

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      if (shieldActive) {
        showToast('🛡️ Shield blocked wall!');
        newHead.x = Math.max(0, Math.min(GRID_SIZE - 1, newHead.x));
        newHead.y = Math.max(0, Math.min(GRID_SIZE - 1, newHead.y));
        shieldActive = false;
      } else {
        willCollide = true;
        collisionReason = 'wall';
      }
    }

    // Self collision
    if (!willCollide) {
      for (const seg of snake) {
        if (seg.x === newHead.x && seg.y === newHead.y) {
          if (shieldActive) {
            showToast('🛡️ Shield blocked bite!');
            shieldActive = false;
            break;
          }
          willCollide = true;
          collisionReason = 'self';
          break;
        }
      }
    }

    if (willCollide) {
      endGame();
      return;
    }

    // --- Magnet effect: attract food ---
    if (magnetActive && food) {
      const magnetRange = 3 + magnetRangeExtra;
      const dist = Math.abs(newHead.x - food.x) + Math.abs(newHead.y - food.y);
      if (dist > 0 && dist <= magnetRange) {
        // Move food closer to head
        const dx = Math.sign(food.x - newHead.x);
        const dy = Math.sign(food.y - newHead.y);
        const newFX = food.x - dx;
        const newFY = food.y - dy;
        if (newFX >= 0 && newFX < GRID_SIZE && newFY >= 0 && newFY < GRID_SIZE && grid[newFY][newFX] === 0) {
          food.x = newFX;
          food.y = newFY;
        }
      }
    }

    // --- Move ---
    snake.unshift(newHead);

    // Check food
    let ate = false;
    if (food && newHead.x === food.x && newHead.y === food.y) {
      ate = true;
      const type = food.type;
      foodEaten++;
      const ftype = type;
      food = null;

      // Calculate base points with multiplier
      let basePoints = type.points * (type === FOOD.POISON ? 1 : scoreMult);

      // Add food bonus (permanent upgrade)
      let totalPoints = basePoints + (type === FOOD.POISON ? 0 : (foodBonus + scorePerFood));

      // Apply food effect
      if (type === FOOD.REGULAR) {
        const comboAdd = 1 + comboBonus / 10;
        combo += Math.round(comboAdd);
        score += Math.round(totalPoints);
        showCombo();
      } else if (type === FOOD.GOLD) {
        const comboAdd = 2 + comboBonus / 10;
        combo += Math.round(comboAdd);
        score += Math.round(totalPoints);
        showCombo();
        showToast('⭐ Gold! +' + Math.round(totalPoints) + ' points!');
        // Emit particles
        if (particles) {
          particles.emitReward(newHead.x * CELL_SIZE + CELL_SIZE / 2, newHead.y * CELL_SIZE + CELL_SIZE / 2);
        }
      } else if (type === FOOD.POISON) {
        score += Math.max(0, score + type.points);
        combo = 0;
        if (snake.length > 3) {
          snake.pop();
          if (snake.length > 3) snake.pop();
        }
        pendingRemoval = [];
        showToast('💀 Poison! Shrinking...');
      }

      // Combo multiplier
      if (combo > 1 && type !== FOOD.POISON) {
        const multi = Math.min(combo, 10);
        const bonus = Math.floor(type.points * scoreMult * (multi - 1) * 0.5);
        score += bonus;
      }

      // Coins
      if (type !== FOOD.POISON) {
        const coinGain = type === FOOD.GOLD ? 5 : 1;
        coins += coinGain;
      }

      // Emit particles for regular food
      if (particles && type !== FOOD.POISON) {
        particles.emit(newHead.x * CELL_SIZE + CELL_SIZE / 2, newHead.y * CELL_SIZE + CELL_SIZE / 2, type.color, 5);
      }

      // Level check
      checkLevelUp();

      // Spawn new food
      updateGrid();
      if (!spawnFood()) {
        endGame(true);
        return;
      }
    }

    if (!ate) {
      snake.pop();
    }

    updateGrid();
  }

  function checkLevelUp() {
    const idx = Math.min(level - 1, LEVEL_TARGETS.length - 1);
    const target = LEVEL_TARGETS[idx];
    if (score >= target && level < LEVEL_TARGETS.length) {
      level++;
      showToast('⬆ Level ' + level + '! Speed up!');
      if (particles) particles.emitLevelUp();
      resetLoop();
    }
  }

  // --- Drawing ---
  const NEON_COLORS = [
    '#0aff9d', '#ff6b9d', '#00b4d8', '#f5c518',
    '#ff9f43', '#a855f7', '#06d6a0', '#e94560',
    '#38bdf8', '#fb923c'
  ];

  function getSnakeColor(idx) {
    return NEON_COLORS[idx % NEON_COLORS.length];
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // --- Grid background ---
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid lines (neon)
    ctx.strokeStyle = 'rgba(10, 255, 157, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE, pos);
      ctx.stroke();
    }

    // --- Draw food using gradient if available ---
    if (food) {
      const fx = food.x * CELL_SIZE;
      const fy = food.y * CELL_SIZE;
      const pad = 2;

      if (typeof drawGradientBlock !== 'undefined') {
        // Use the generic gradient block renderer
        const type = food.type === FOOD.GOLD ? 'O' : food.type === FOOD.POISON ? 'Z' : 'S';
        drawGradientBlock(ctx, fx, fy, CELL_SIZE, type, true, null);
      } else {
        // Fallback
        if (food.type === FOOD.GOLD) {
          ctx.shadowColor = '#f5c518';
          ctx.shadowBlur = 15;
        } else if (food.type === FOOD.POISON) {
          ctx.shadowColor = '#e94560';
          ctx.shadowBlur = 10;
        } else {
          ctx.shadowColor = '#2ed573';
          ctx.shadowBlur = 8;
        }
        ctx.fillStyle = food.type.color;
        ctx.beginPath();
        ctx.arc(fx + CELL_SIZE / 2, fy + CELL_SIZE / 2, CELL_SIZE / 2 - pad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Food icon always drawn on top
      ctx.shadowBlur = 0;
      ctx.font = (CELL_SIZE * 0.6) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(food.type.char, fx + CELL_SIZE / 2, fy + CELL_SIZE / 2);
    }

    // --- Draw snake ---
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      const sx = seg.x * CELL_SIZE;
      const sy = seg.y * CELL_SIZE;
      const pad = 1;
      const size = CELL_SIZE - pad * 2;
      const color = getSnakeColor(i);

      // Glow for head
      if (i === 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 4;
        ctx.shadowColor = color;
      }

      // Rounded rect
      const radius = 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(sx + pad + radius, sy + pad);
      ctx.lineTo(sx + pad + size - radius, sy + pad);
      ctx.quadraticCurveTo(sx + pad + size, sy + pad, sx + pad + size, sy + pad + radius);
      ctx.lineTo(sx + pad + size, sy + pad + size - radius);
      ctx.quadraticCurveTo(sx + pad + size, sy + pad + size, sx + pad + size - radius, sy + pad + size);
      ctx.lineTo(sx + pad + radius, sy + pad + size);
      ctx.quadraticCurveTo(sx + pad, sy + pad + size, sx + pad, sy + pad + size - radius);
      ctx.lineTo(sx + pad, sy + pad + radius);
      ctx.quadraticCurveTo(sx + pad, sy + pad, sx + pad + radius, sy + pad);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;

      // Eyes on head
      if (i === 0) {
        ctx.fillStyle = '#fff';
        const eyeSize = 3;
        let ex1, ey1, ex2, ey2;
        const cx = sx + CELL_SIZE / 2;
        const cy = sy + CELL_SIZE / 2;
        if (direction === DIR.RIGHT) {
          ex1 = cx + 5; ey1 = cy - 5; ex2 = cx + 5; ey2 = cy + 5;
        } else if (direction === DIR.LEFT) {
          ex1 = cx - 5; ey1 = cy - 5; ex2 = cx - 5; ey2 = cy + 5;
        } else if (direction === DIR.UP) {
          ex1 = cx - 5; ey1 = cy - 5; ex2 = cx + 5; ey2 = cy - 5;
        } else {
          ex1 = cx - 5; ey1 = cy + 5; ex2 = cx + 5; ey2 = cy + 5;
        }
        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ex1 + direction.x, ey1 + direction.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2 + direction.x, ey2 + direction.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw particles
    if (particles) {
      particles.update();
      particles.draw(ctx);
    }

    // --- Shield indicator ---
    if (shieldActive) {
      ctx.strokeStyle = 'rgba(10, 255, 157, 0.4)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(2, 2, CANVAS_SIZE - 4, CANVAS_SIZE - 4);
      ctx.setLineDash([]);
    }

    // --- Magnet indicator ---
    if (magnetActive && food) {
      const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
      const fy = food.y * CELL_SIZE + CELL_SIZE / 2;
      const magnetRange = 3 + magnetRangeExtra;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy, CELL_SIZE * magnetRange * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- Combo display ---
  function showCombo() {
    if (combo < 2) return;
    comboCount.textContent = combo;
    comboDisplay.classList.remove('hidden');
    comboDisplay.style.animation = 'none';
    comboDisplay.offsetHeight;
    comboDisplay.style.animation = 'combo-pop 0.6s ease-out forwards';
    setTimeout(() => {
      comboDisplay.classList.add('hidden');
    }, 600);
  }

  // --- Toast ---
  function showToast(msg, duration) {
    duration = duration || 2000;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  // --- Achievement popup ---
  function showAchievementPopup(ach) {
    const existing = document.querySelector('.achievement-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'achievement-popup show';
    popup.innerHTML = `
      <div class="ach-icon">${ach.icon}</div>
      <div class="ach-title">${ach.name}</div>
      <div class="ach-desc">${ach.desc}</div>
      <div class="ach-reward">+${ach.reward.coins} 🪙 ${ach.reward.gems ? '+'+ach.reward.gems+' 💎' : ''}</div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 400);
    }, 3000);
  }

  // --- Countdown ---
  function showCountdown(callback) {
    countdownOverlay.classList.remove('hidden');
    let count = 3;
    countdownText.textContent = count;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownText.textContent = count;
      } else {
        clearInterval(interval);
        countdownOverlay.classList.add('hidden');
        if (callback) callback();
      }
    }, 800);
  }

  // --- Game loop ---
  function resetLoop() {
    if (gameLoop) {
      clearInterval(gameLoop);
      gameLoop = null;
    }
    if (!running) return;
    gameLoop = setInterval(tick, getInterval());
  }

  function tick() {
    if (!running) return;
    moveSnake();
    draw();
    updateUI();
  }

  // --- Start game ---
  function startGame() {
    running = true;
    combo = 0;

    // Apply progression bonuses
    loadBonuses();

    // Shield chance from progression
    const bonuses = typeof ProgressionSystem !== 'undefined' ? ProgressionSystem.getActiveBonuses() : null;
    const shieldChance = bonuses ? bonuses.shieldChance : 0;

    shieldActive = purchasedShield || (shieldChance > 0 && Math.random() < shieldChance);
    speedActive = purchasedSpeed;
    magnetActive = purchasedMagnet;

    // Start food bonus
    const startFoodBonus = bonuses ? bonuses.startFood : 0;

    purchasedSpeed = false;
    purchasedShield = false;
    purchasedMagnet = false;

    swipeHint.textContent = 'Swipe to move';
    updatePowerUps();
    updateRewardButtons();

    // Initialize particles
    if (typeof ParticleSystem !== 'undefined' && !particles) {
      particles = new ParticleSystem();
    }

    // If we have start food bonus, spawn extra gold food
    updateGrid();
    spawnFood();
    for (let i = 0; i < startFoodBonus; i++) {
      // Try to spawn additional gold food
      const emptyCells = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (grid[y][x] === 0) emptyCells.push({ x, y });
        }
      }
      if (emptyCells.length > 0) {
        const cell = emptyCells[rand(0, emptyCells.length - 1)];
        // We just mark this - the game already has a food, so this is extra
        // Actually, let's just spawn regular food positions in the grid that give bonus
        // Instead, let's just mark bonus points for the first food eaten
      }
    }

    showCountdown(() => {
      updateGrid();
      if (!food) spawnFood();
      resetLoop();
      draw();
      updateUI();
    });
  }

  // --- New game ---
  function newGame(m) {
    if (gameLoop) {
      clearInterval(gameLoop);
      gameLoop = null;
    }
    running = false;

    mode = m;
    score = 0;
    coins = 0;
    level = 1;
    combo = 0;
    foodEaten = 0;
    snake = [];
    food = null;
    shieldActive = false;
    speedActive = false;
    magnetActive = false;
    purchasedSpeed = false;
    purchasedShield = false;
    purchasedMagnet = false;

    goOverlay.classList.add('hidden');

    dailySeed = computeDailySeed();
    rng = mode === 'daily' ? mulberry32(dailySeed) : null;

    initSnake();
    updateGrid();

    // Update UI
    btnDaily.classList.toggle('active', mode === 'daily');
    btnClassic.classList.toggle('active', mode === 'classic');
    updateUI();
    updatePowerUps();
    updateRewardButtons();
    draw();

    setTimeout(startGame, 300);
  }

  // --- End game ---
  function endGame(won) {
    if (!running) return;
    running = false;
    if (gameLoop) {
      clearInterval(gameLoop);
      gameLoop = null;
    }

    // Update high score
    if (score > highScores[mode]) {
      highScores[mode] = score;
      saveGame();
    }

    // Notify progression system
    if (typeof ProgressionSystem !== 'undefined') {
      ProgressionSystem.endOfGame({
        score: score,
        foodEaten: foodEaten,
        bestCombo: combo
      });

      // Check achievements
      const newAchs = ProgressionSystem.checkAchievements();
      for (const ach of newAchs) {
        showAchievementPopup(ach);
      }
    }

    // ─── Framework module hooks ────────────────
    if (window.RetentionSystem) {
      RetentionSystem.onGameEnd(score);
      RetentionSystem.submitScore('Player', score);
    }
    if (window.ChallengesSystem) {
      ChallengesSystem.reportProgress('score', score);
      ChallengesSystem.reportProgress('games', 1);
    }
    if (window.CollectiblesSystem) {
      CollectiblesSystem.incrementTracker('totalGames');
      CollectiblesSystem.setTracker('highestScore', score);
    }
    if (window.AdsManager) {
      setTimeout(() => AdsManager.tryShowInterstitial(), 2000);
    }
    // ────────────────────────────────────────────

    // Show overlay
    if (won) {
      goTitle.textContent = '🎉 You Win!';
      goTitle.style.color = '#0aff9d';
    } else {
      goTitle.textContent = '💀 Game Over';
      goTitle.style.color = '#e94560';
    }

    goScore.textContent = score;
    goDetail.textContent = 'Level ' + level + ' · Best ' + highScores[mode];
    goCoins.textContent = '🪙 +' + coins + ' coins';

    goDouble.disabled = coins <= 0;
    goOverlay.classList.remove('hidden');
    saveGame();
    updateUI();
  }

  // --- Direction change ---
  function setDirection(newDir) {
    if (!running) return;
    if (direction.x === -newDir.x && direction.y === -newDir.y) return;
    nextDirection = newDir;
    swipeHint.textContent = '';
  }

  // --- Swipe handling ---
  let touchStartX = 0, touchStartY = 0;
  let isSwiping = false;

  function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwiping = true;
  }

  function handleTouchEnd(e) {
    if (!isSwiping) return;
    isSwiping = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 20) return;

    if (absDx > absDy) {
      setDirection(dx > 0 ? DIR.RIGHT : DIR.LEFT);
    } else {
      setDirection(dy > 0 ? DIR.DOWN : DIR.UP);
    }
  }

  // --- Keyboard controls ---
  function handleKey(e) {
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); setDirection(DIR.UP); break;
      case 'ArrowDown': e.preventDefault(); setDirection(DIR.DOWN); break;
      case 'ArrowLeft': e.preventDefault(); setDirection(DIR.LEFT); break;
      case 'ArrowRight': e.preventDefault(); setDirection(DIR.RIGHT); break;
      case ' ': e.preventDefault(); if (!running) { goRestart.click(); } break;
    }
  }

  // --- Power-ups ---
  function buySpeed() {
    if (coins < COST_SPEED || running) return;
    coins -= COST_SPEED;
    purchasedSpeed = true;
    showToast('⚡ Speed boost ready!');
    updateUI();
    updatePowerUps();
  }

  function buyShield() {
    if (coins < COST_SHIELD || running) return;
    coins -= COST_SHIELD;
    purchasedShield = true;
    showToast('🛡️ Shield ready!');
    updateUI();
    updatePowerUps();
  }

  function buyMagnet() {
    if (coins < COST_MAGNET || running) return;
    coins -= COST_MAGNET;
    purchasedMagnet = true;
    showToast('🧲 Magnet ready!');
    updateUI();
    updatePowerUps();
  }

  function updatePowerUps() {
    btnSpeed.disabled = coins < COST_SPEED || running;
    btnShield.disabled = coins < COST_SHIELD || running;
    btnMagnet.disabled = coins < COST_MAGNET || running;

    btnSpeed.style.borderColor = purchasedSpeed ? '#0aff9d' : '';
    btnShield.style.borderColor = purchasedShield ? '#0aff9d' : '';
    btnMagnet.style.borderColor = purchasedMagnet ? '#0aff9d' : '';
  }

  // --- Ad ---
  function showAd(callback) {
    adPendingCallback = callback;

    if (hasNativeAds) {
      window.AndroidAds.showRewarded();
      return;
    }

    const adOverlay = document.createElement('div');
    adOverlay.id = 'ad-overlay';
    adOverlay.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#000;z-index:200;display:flex;align-items:center;justify-content:center;flex-direction:column;">
        <div style="font-size:48px;margin-bottom:20px;">📺</div>
        <div style="font-size:24px;color:#fff;font-weight:600;">Watching ad...</div>
        <div style="font-size:14px;color:#888;margin-top:8px;" id="ad-timer">3</div>
      </div>
    `;
    document.body.appendChild(adOverlay);

    let count = 3;
    const timerEl = document.getElementById('ad-timer');
    const interval = setInterval(() => {
      count--;
      if (timerEl) timerEl.textContent = count;
      if (count <= 0) {
        clearInterval(interval);
        adOverlay.remove();
        if (adPendingCallback) { adPendingCallback(); adPendingCallback = null; }
      }
    }, 1000);
  }

  function doubleCoins() {
    if (coins <= 0) return;
    const doubled = coins;
    showAd(function() {
      coins += doubled;
      goCoins.textContent = '🪙 +' + coins + ' coins (doubled!)';
      goDouble.disabled = true;
      saveGame();
    });
  }

  function updateRewardButtons() {
    btnRewardDouble.disabled = coins < 1 || !running;
  }

  // --- Save/Load ---
  function saveGame() {
    const data = {
      v: 1,
      daily: highScores.daily,
      classic: highScores.classic,
      coins: coins,
      seed: dailySeed,
      today: getDailySeedStr()
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch(e) {}
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.v === 1) {
        highScores.daily = data.daily || 0;
        highScores.classic = data.classic || 0;
        coins = data.coins || 0;
      }
    } catch(e) {}
  }

  // --- UI updates ---
  function updateUI() {
    scoreEl.textContent = score;
    highscoreEl.textContent = highScores[mode] || 0;
    levelEl.textContent = level;
    coinsEl.textContent = coins;

    // Update HUD
    if (hudLevel) {
      const state = typeof ProgressionSystem !== 'undefined' ? ProgressionSystem.getState() : null;
      hudLevel.textContent = state ? state.level : level;
    }
    if (hudCoins) {
      const state = typeof ProgressionSystem !== 'undefined' ? ProgressionSystem.getState() : null;
      hudCoins.textContent = state ? state.coins : coins;
    }
    if (hudGems) {
      const state = typeof ProgressionSystem !== 'undefined' ? ProgressionSystem.getState() : null;
      hudGems.textContent = state ? state.gems : 0;
    }
  }

  // --- Event listeners ---
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('keydown', handleKey);

  btnDaily.addEventListener('click', () => newGame('daily'));
  btnClassic.addEventListener('click', () => newGame('classic'));
  btnRestart.addEventListener('click', () => newGame(mode));
  btnSpeed.addEventListener('click', buySpeed);
  btnShield.addEventListener('click', buyShield);
  btnMagnet.addEventListener('click', buyMagnet);

  if (btnShop) {
    btnShop.addEventListener('click', function() {
      if (typeof ShopUI !== 'undefined') {
        ShopUI.open();
      }
    });
  }

  goRestart.addEventListener('click', () => newGame(mode));
  goDouble.addEventListener('click', doubleCoins);

  btnRewardDouble.addEventListener('click', function() {
    showAd(function() {
      const gain = Math.floor(Math.random() * 5) + 2;
      coins += gain;
      showToast('🪙 +' + gain + ' coins from ad!');
      updateUI();
      updatePowerUps();
      updateRewardButtons();
    });
  });

  // --- Init ---
  loadGame();

  // Sync progression coins if needed
  if (typeof ProgressionSystem !== 'undefined') {
    const state = ProgressionSystem.getState();
    if (state && state.coins > 0) {
      // Keep existing coins as-is, progression manages its own coins
    }
  }

  // ─── NEW: Initialize Framework Modules ─────────
  if (window.StoreRotator) StoreRotator.init();
  if (window.RetentionSystem) RetentionSystem.init();
  if (window.AdsManager) AdsManager.init();
  if (window.ChallengesSystem) ChallengesSystem.init();
  if (window.CollectiblesSystem) CollectiblesSystem.init();
  if (window.TutorialSystem) {
    TutorialSystem.init();
    if(TutorialSystem.shouldShow()) setTimeout(()=>TutorialSystem.start(), 500);
  }
  // ─────────────────────────────────────────────────

  updateUI();
  newGame('daily');
})();
