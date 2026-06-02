/* ===== Snake Clash! — Game Engine (v2 Full-Screen) ===== */
(function() {
  'use strict';

  // --- Screen Navigation System ---
  window.showScreen = function(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');

    // Update shop/upgrade coins when navigating
    if (id === 'screen-shop') {
      const sc = document.getElementById('shop-coins');
      if (sc) {
        const state = typeof ProgressionSystem !== 'undefined' ? ProgressionSystem.getState() : null;
        sc.textContent = state ? state.coins : coins;
      }
    }
    if (id === 'screen-upgrades') {
      const uc = document.getElementById('upgrade-coins');
      if (uc) {
        const state = typeof ProgressionSystem !== 'undefined' ? ProgressionSystem.getState() : null;
        uc.textContent = state ? state.coins : coins;
      }
    }
  };

  window.hideGameOver = function() {
    goOverlay.classList.remove('visible');
  };

  // --- Screen shake ---
  window.screenShake = function() {
    const app = document.getElementById('app');
    app.classList.remove('screen-shake');
    void app.offsetWidth;
    app.classList.add('screen-shake');
    setTimeout(() => app.classList.remove('screen-shake'), 300);
  };

  // --- Load Progression System ---
  if (typeof ProgressionSystem !== 'undefined') {
    ProgressionSystem.load();
  }

  // --- Constants ---
  const GRID_SIZE = 10;            // 10x10 grid
  const CANVAS_SIZE = 320;         // logical size
  const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
  const SAVE_KEY = 'snake_clash_save';
  const DAILY_SEED_KEY = 'snake_clash_daily_seed';

  // Levels: target score to advance
  const LEVEL_TARGETS = [
    20, 50, 100, 180, 300, 500, 800, 1200, 1800, 2500,
    3500, 5000, 7000, 10000, 15000
  ];

  // Base speed (ms per tick) per level
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

  // --- DOM refs (new game screen) ---
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('game-score');
  const highscoreEl = document.getElementById('game-best');
  const levelEl = document.getElementById('game-level');
  const coinsEl = document.getElementById('game-coins');
  const comboDisplay = document.getElementById('combo-display');
  const comboCount = document.getElementById('combo-count');
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownText = document.getElementById('countdown-text');
  const swipeHint = document.getElementById('swipe-hint');
  const toast = document.getElementById('toast');
  const goOverlay = document.getElementById('game-over');
  const goTitle = document.getElementById('go-title');
  const goScore = document.getElementById('go-score');
  const goCoins = document.getElementById('go-coins');
  const goDouble = document.getElementById('go-double');
  const goRestart = document.getElementById('go-restart');

  const btnDaily = document.getElementById('btn-daily');
  const btnClassic = document.getElementById('btn-classic');
  const btnRestart = document.getElementById('btn-restart');
  const btnSpeed = document.getElementById('pu-speed');
  const btnShield = document.getElementById('pu-shield');
  const btnMagnet = document.getElementById('pu-magnet');

  // --- Canvas auto-sizing ---
  function sizeCanvas() {
    const container = document.getElementById('board-container');
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const size = Math.min(w, h);
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
  }

  // --- Particle system ---
  let particles = null;

  // --- Game state ---
  let snake = [];
  let direction = DIR.RIGHT;
  let nextDirection = DIR.RIGHT;
  let food = null;
  let grid = [];
  let score = 0;
  let coins = 0;
  let level = 1;
  let combo = 0;
  let foodEaten = 0;
  let mode = 'daily';
  let running = false;
  let gameLoop = null;
  let rng = null;
  let shieldActive = false;
  let speedActive = false;
  let magnetActive = false;
  let pendingRemoval = [];
  let dailySeed = 0;
  let scoreMult = 1;
  let foodBonus = 0;
  let comboBonus = 0;
  let scorePerFood = 0;
  let magnetRangeExtra = 0;

  let purchasedSpeed = false;
  let purchasedShield = false;
  let purchasedMagnet = false;

  let highScores = { daily: 0, classic: 0 };
  let adPendingCallback = null;
  const hasNativeAds = typeof window.AndroidAds !== 'undefined';

  window.onAdReward = function() {
    if (adPendingCallback) { adPendingCallback(); adPendingCallback = null; }
  };

  // --- Seeded random ---
  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

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
    const roll = rand(1, 100);
    let type;
    if (roll <= 10) {
      type = 'GOLD';
    } else if (roll <= 20) {
      type = 'POISON';
    } else {
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

    let willCollide = false;

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      if (shieldActive) {
        showToast('🛡️ Shield blocked wall!');
        newHead.x = Math.max(0, Math.min(GRID_SIZE - 1, newHead.x));
        newHead.y = Math.max(0, Math.min(GRID_SIZE - 1, newHead.y));
        shieldActive = false;
      } else {
        willCollide = true;
        screenShake();
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
          screenShake();
          break;
        }
      }
    }

    if (willCollide) {
      endGame();
      return;
    }

    // Magnet effect
    if (magnetActive && food) {
      const magnetRange = 3 + magnetRangeExtra;
      const dist = Math.abs(newHead.x - food.x) + Math.abs(newHead.y - food.y);
      if (dist > 0 && dist <= magnetRange) {
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

    snake.unshift(newHead);

    let ate = false;
    if (food && newHead.x === food.x && newHead.y === food.y) {
      ate = true;
      const type = food.type;
      foodEaten++;
      food = null;

      let basePoints = type.points * (type === FOOD.POISON ? 1 : scoreMult);
      let totalPoints = basePoints + (type === FOOD.POISON ? 0 : (foodBonus + scorePerFood));

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

      if (particles && type !== FOOD.POISON) {
        particles.emit(newHead.x * CELL_SIZE + CELL_SIZE / 2, newHead.y * CELL_SIZE + CELL_SIZE / 2, type.color, 5);
      }

      checkLevelUp();
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
      showToast('⬆ Level ' + level + '!');
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

    // Grid background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid lines
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

    // Draw food
    if (food) {
      const fx = food.x * CELL_SIZE;
      const fy = food.y * CELL_SIZE;
      const pad = 2;

      if (typeof drawGradientBlock !== 'undefined') {
        const type = food.type === FOOD.GOLD ? 'O' : food.type === FOOD.POISON ? 'Z' : 'S';
        drawGradientBlock(ctx, fx, fy, CELL_SIZE, type, true, null);
      } else {
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

      ctx.shadowBlur = 0;
      ctx.font = (CELL_SIZE * 0.6) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(food.type.char, fx + CELL_SIZE / 2, fy + CELL_SIZE / 2);
    }

    // Draw snake
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      const sx = seg.x * CELL_SIZE;
      const sy = seg.y * CELL_SIZE;
      const pad = 1;
      const size = CELL_SIZE - pad * 2;
      const color = getSnakeColor(i);

      if (i === 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 4;
        ctx.shadowColor = color;
      }

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

    // Particles
    if (particles) {
      particles.update();
      particles.draw(ctx);
    }

    // Shield indicator
    if (shieldActive) {
      ctx.strokeStyle = 'rgba(10, 255, 157, 0.4)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(2, 2, CANVAS_SIZE - 4, CANVAS_SIZE - 4);
      ctx.setLineDash([]);
    }

    // Magnet indicator
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

  // --- Combo ---
  function showCombo() {
    if (combo < 2) return;
    comboCount.textContent = combo;
    comboDisplay.classList.remove('hidden');
    comboDisplay.style.animation = 'none';
    comboDisplay.offsetHeight;
    comboDisplay.style.animation = 'comboPop 0.6s ease-out forwards';
    setTimeout(() => comboDisplay.classList.add('hidden'), 600);
  }

  // --- Toast ---
  function showToast(msg, duration) {
    duration = duration || 2000;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.add('hidden'), duration);
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
    countdownOverlay.classList.add('visible');
    let count = 3;
    countdownText.textContent = count;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownText.textContent = count;
      } else {
        clearInterval(interval);
        countdownOverlay.classList.remove('visible');
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

  // --- Start game (called from PLAY button or auto) ---
  window.startGame = function() {
    if (!running) {
      // Initialize fresh game
      newGame(mode || 'daily');
    }
    // If already initialized, just ensure game is running
    running = true;
    combo = 0;
    loadBonuses();

    const bonuses = typeof ProgressionSystem !== 'undefined' ? ProgressionSystem.getActiveBonuses() : null;
    const shieldChance = bonuses ? bonuses.shieldChance : 0;

    shieldActive = purchasedShield || (shieldChance > 0 && Math.random() < shieldChance);
    speedActive = purchasedSpeed;
    magnetActive = purchasedMagnet;

    purchasedSpeed = false;
    purchasedShield = false;
    purchasedMagnet = false;

    swipeHint.textContent = 'Swipe to move';
    updatePowerUps();
    updateRewardButtons();

    if (typeof ParticleSystem !== 'undefined' && !particles) {
      particles = new ParticleSystem();
    }

    sizeCanvas();
    updateGrid();
    if (!food) spawnFood();

    showCountdown(() => {
      updateGrid();
      if (!food) spawnFood();
      resetLoop();
      draw();
      updateUI();
    });
  };

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

    goOverlay.classList.remove('visible');

    dailySeed = computeDailySeed();
    rng = mode === 'daily' ? mulberry32(dailySeed) : null;

    initSnake();
    updateGrid();

    btnDaily.classList.toggle('active', mode === 'daily');
    btnClassic.classList.toggle('active', mode === 'classic');
    updateUI();
    updatePowerUps();
    updateRewardButtons();
    sizeCanvas();
    draw();
  }

  // --- End game ---
  function endGame(won) {
    if (!running) return;
    running = false;
    if (gameLoop) {
      clearInterval(gameLoop);
      gameLoop = null;
    }

    if (score > highScores[mode]) {
      highScores[mode] = score;
      saveGame();
    }

    if (typeof ProgressionSystem !== 'undefined') {
      ProgressionSystem.endOfGame({
        score: score,
        foodEaten: foodEaten,
        bestCombo: combo
      });
      const newAchs = ProgressionSystem.checkAchievements();
      for (const ach of newAchs) {
        showAchievementPopup(ach);
      }
    }

    // Framework hooks
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

    goTitle.textContent = won ? '🎉 You Win!' : '💀 Game Over';
    goTitle.className = won ? 'go-win' : 'go-lose';
    goScore.textContent = score;
    goCoins.textContent = '🪙 +' + coins + ' coins';

    goDouble.disabled = coins <= 0;
    goOverlay.classList.add('visible');
    saveGame();
    updateUI();
  }

  // --- Direction ---
  function setDirection(newDir) {
    if (!running) return;
    if (direction.x === -newDir.x && direction.y === -newDir.y) return;
    nextDirection = newDir;
    swipeHint.textContent = '';
  }

  // --- Swipe ---
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

  // --- Keyboard ---
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
      </div>`;
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
    if (typeof goDouble !== 'undefined' && goDouble) {
      goDouble.disabled = coins < 1;
    }
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
  }

  // --- Event setup ---
  function setupEvents() {
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('keydown', handleKey);

    // Mode buttons
    if (btnDaily) btnDaily.addEventListener('click', () => {
      if (!running) { newGame('daily'); startGame(); }
    });
    if (btnClassic) btnClassic.addEventListener('click', () => {
      if (!running) { newGame('classic'); startGame(); }
    });
    if (btnRestart) btnRestart.addEventListener('click', () => {
      newGame(mode);
      startGame();
    });

    // Power-ups
    if (btnSpeed) btnSpeed.addEventListener('click', buySpeed);
    if (btnShield) btnShield.addEventListener('click', buyShield);
    if (btnMagnet) btnMagnet.addEventListener('click', buyMagnet);

    // Game over
    if (goRestart) goRestart.addEventListener('click', () => {
      newGame(mode);
      startGame();
    });
    if (goDouble) goDouble.addEventListener('click', doubleCoins);

    // Settings toggles
    setupToggles();

    // Resize canvas
    window.addEventListener('resize', sizeCanvas);
    window.addEventListener('orientationchange', () => setTimeout(sizeCanvas, 300));
  }

  function setupToggles() {
    const soundToggle = document.getElementById('toggle-sound');
    const musicToggle = document.getElementById('toggle-music');
    const vibrateToggle = document.getElementById('toggle-vibrate');

    [soundToggle, musicToggle, vibrateToggle].forEach(t => {
      if (!t) return;
      t.addEventListener('click', () => {
        t.classList.toggle('active');
      });
    });
  }

  // --- Init ---
  loadGame();

  if (typeof ProgressionSystem !== 'undefined') {
    const state = ProgressionSystem.getState();
  }

  // Initialize framework modules
  if (window.StoreRotator) StoreRotator.init();
  if (window.RetentionSystem) RetentionSystem.init();
  if (window.AdsManager) AdsManager.init();
  if (window.ChallengesSystem) ChallengesSystem.init();
  if (window.CollectiblesSystem) CollectiblesSystem.init();
  if (window.TutorialSystem) {
    TutorialSystem.init();
    if (TutorialSystem.shouldShow()) setTimeout(() => TutorialSystem.start(), 500);
  }

  // Initialize game state
  newGame('daily');

  // Setup events
  setupEvents();

  // Size canvas
  setTimeout(sizeCanvas, 100);

  // Show main menu by default (PLAY button will start the game)
  showScreen('screen-menu');

  updateUI();
})();
