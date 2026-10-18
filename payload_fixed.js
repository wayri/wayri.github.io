// Rocket Pong source. Encrypt this file into pong.html after editing.
const canvas = document.getElementById('pong-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('game-status');
const timedMatch = window.rocketPongMode === 'timed';
const timerEl = document.getElementById('match-timer');
const matchDuration = 180;
document.getElementById('match-timer-wrapper').classList.toggle('hidden', !timedMatch);
document.getElementById('score-limit-controls').classList.toggle('hidden', timedMatch);
document.getElementById('timed-match-label').classList.toggle('hidden', !timedMatch);
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const W = canvas.width, H = canvas.height;
const paddle = { w: 10, h: 64, speed: 360, left: 48, right: W - 58 };
const capacity = 6, reloadTime = 10, fireInterval = 0.65;
const ball = { x: W / 2, y: H / 2, r: 6, vx: 0, vy: 0 };
function makePlayer() {
    return { y: (H - paddle.h) / 2, score: 0, stock: [], reload: 0, cooldown: 0, effect: 'none', effectTime: 0 };
}
const p1 = makePlayer(), p2 = makePlayer(), keys = Object.create(null);
let rockets = [], paused = false, muted = false, gameOver = false, winScore = 10, serveDelay = 0, lastFrame = null;
let timeRemaining = matchDuration, matchDeadline = 0;

function tone(frequency, type, duration) {
    if (muted) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch (_) { /* Audio is optional. */ }
}
function rocketType() { return Math.random() < 0.5 ? 'tracking' : 'normal'; }
function resetBall(direction) {
    const angle = Math.random() * 0.8 - 0.4;
    ball.x = W / 2; ball.y = H / 2;
    ball.vx = direction * 310 * Math.cos(angle);
    ball.vy = 310 * Math.sin(angle);
    serveDelay = 0.55;
}
function matchResult() {
    return p1.score === p2.score ? 'Draw' : p1.score > p2.score ? 'Player 1 wins' : 'Player 2 wins';
}
function updateTimerDisplay() {
    const seconds = Math.ceil(timeRemaining);
    const label = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    if (timerEl.textContent !== label) timerEl.textContent = label;
    timerEl.style.color = timeRemaining <= 15 ? '#f36b73' : '#f4d68e';
}
function updateMatchClock(now) {
    if (!timedMatch || paused || gameOver) return;
    timeRemaining = Math.min(matchDuration, Math.max(0, (matchDeadline - now) / 1000));
    updateTimerDisplay();
    if (timeRemaining === 0) {
        gameOver = true;
        updateStatus();
        tone(230, 'sine', 0.35);
    }
}
function updateStatus() {
    statusEl.textContent = gameOver ? (timedMatch ? 'Time up · ' : '') + matchResult() + ' · Space to restart'
        : paused ? 'Paused · P to resume' : timedMatch ? 'Three-minute match · One rocket reloads every 10 seconds' : 'One rocket reloads every 10 seconds';
    document.getElementById('pause-btn').textContent = paused ? 'RESUME (P)' : 'PAUSE (P)';
}
function resetGame() {
    const selected = Number(document.getElementById('win-score').value);
    winScore = Number.isFinite(selected) && selected > 0 ? selected : 10;
    for (const player of [p1, p2]) {
        player.y = (H - paddle.h) / 2; player.score = 0;
        player.stock = Array.from({ length: capacity }, rocketType);
        player.reload = 0; player.cooldown = 0;
        player.effect = 'none'; player.effectTime = 0;
    }
    rockets = []; paused = false; gameOver = false;
    timeRemaining = matchDuration;
    matchDeadline = performance.now() + matchDuration * 1000;
    if (timedMatch) updateTimerDisplay();
    scoreEl.textContent = '0 : 0';
    resetBall(Math.random() < 0.5 ? -1 : 1);
    updateStatus();
}
function togglePause() {
    if (gameOver) return;
    if (!paused) updateMatchClock(performance.now());
    if (gameOver) return;
    paused = !paused;
    if (!paused && timedMatch) matchDeadline = performance.now() + timeRemaining * 1000;
    updateStatus();
}
function toggleMute() {
    muted = !muted;
    document.getElementById('mute-btn').textContent = muted ? 'UNMUTE' : 'MUTE';
}
function fireRocket(player, side) {
    if (player.cooldown > 0 || player.stock.length === 0) return;
    const type = player.stock.shift(), direction = side === 'left' ? 1 : -1;
    rockets.push({ x: side === 'left' ? paddle.left + paddle.w + 8 : paddle.right - 8,
        y: player.y + paddle.h / 2, vx: direction * 445, vy: 0, type, side });
    player.cooldown = fireInterval;
    tone(165, 'sawtooth', 0.12);
}
function applyEffect(player, type) {
    player.effect = type === 'tracking' ? 'freeze' : 'slow';
    player.effectTime = type === 'tracking' ? 1.2 : 2.5;
    tone(type === 'tracking' ? 95 : 130, 'square', 0.18);
}
function scorePoint(player, direction) {
    player.score++;
    scoreEl.textContent = p1.score + ' : ' + p2.score;
    rockets = [];
    tone(230, 'sine', 0.25);
    if (!timedMatch && player.score >= winScore) { gameOver = true; updateStatus(); }
    else resetBall(direction);
}
function bounce(player, side) {
    const offset = Math.max(-1, Math.min(1, (ball.y - player.y - paddle.h / 2) / (paddle.h / 2)));
    const speed = Math.min(620, Math.hypot(ball.vx, ball.vy) + 22);
    ball.vx = (side === 'left' ? 1 : -1) * speed * Math.cos(offset * 0.9);
    ball.vy = speed * Math.sin(offset * 0.9);
    ball.x = side === 'left' ? paddle.left + paddle.w + ball.r : paddle.right - ball.r;
    tone(530, 'triangle', 0.08);
}
function updatePlayer(player, up, down, dt) {
    player.cooldown = Math.max(0, player.cooldown - dt);
    if (player.effectTime > 0) {
        player.effectTime = Math.max(0, player.effectTime - dt);
        if (player.effectTime === 0) player.effect = 'none';
    }
    if (player.stock.length < capacity) {
        player.reload += dt;
        while (player.reload >= reloadTime && player.stock.length < capacity) {
            player.stock.push(rocketType()); player.reload -= reloadTime;
        }
    } else player.reload = 0;
    const speed = player.effect === 'freeze' ? 0 : paddle.speed * (player.effect === 'slow' ? 0.5 : 1);
    const movement = ((keys[down] ? 1 : 0) - (keys[up] ? 1 : 0)) * speed * dt;
    player.y = Math.max(0, Math.min(H - paddle.h, player.y + movement));
}
function update(dt) {
    if (paused || gameOver) return;
    updatePlayer(p1, 'w', 's', dt);
    updatePlayer(p2, 'arrowup', 'arrowdown', dt);
    if (keys.d) { fireRocket(p1, 'left'); keys.d = false; }
    if (keys.arrowleft) { fireRocket(p2, 'right'); keys.arrowleft = false; }
    if (serveDelay > 0) { serveDelay = Math.max(0, serveDelay - dt); return; }
    const previousX = ball.x;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); tone(390, 'triangle', 0.06); }
    else if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); tone(390, 'triangle', 0.06); }
    if (ball.vx < 0 && previousX - ball.r >= paddle.left + paddle.w &&
        ball.x - ball.r <= paddle.left + paddle.w &&
        ball.y + ball.r >= p1.y && ball.y - ball.r <= p1.y + paddle.h) bounce(p1, 'left');
    else if (ball.vx > 0 && previousX + ball.r <= paddle.right &&
        ball.x + ball.r >= paddle.right &&
        ball.y + ball.r >= p2.y && ball.y - ball.r <= p2.y + paddle.h) bounce(p2, 'right');
    if (ball.x + ball.r < 0) { scorePoint(p2, -1); return; }
    if (ball.x - ball.r > W) { scorePoint(p1, 1); return; }
    rockets = rockets.filter(rocket => {
        const target = rocket.side === 'left' ? p2 : p1;
        const targetX = rocket.side === 'left' ? paddle.right : paddle.left + paddle.w;
        if (rocket.type === 'tracking') {
            const delta = target.y + paddle.h / 2 - rocket.y;
            rocket.vy = Math.max(-155, Math.min(155, rocket.vy + Math.sign(delta) * 460 * dt));
        }
        rocket.x += rocket.vx * dt;
        rocket.y = Math.max(5, Math.min(H - 5, rocket.y + rocket.vy * dt));
        if (Math.hypot(rocket.x - ball.x, rocket.y - ball.y) < ball.r + 6) {
            ball.vx = rocket.vx * 0.9;
            ball.vy = Math.max(-220, Math.min(220, (ball.y - rocket.y) * 20 + rocket.vy));
            tone(760, 'triangle', 0.12);
            return false;
        }
        if ((rocket.side === 'left' ? rocket.x >= targetX : rocket.x <= targetX) &&
            rocket.y >= target.y && rocket.y <= target.y + paddle.h) {
            applyEffect(target, rocket.type);
            return false;
        }
        return rocket.x >= 0 && rocket.x <= W;
    });
}
function drawRocket(x, y, direction, type, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(direction * scale, scale);
    ctx.fillStyle = type === 'tracking' ? '#f36b73' : '#f6bd60';
    ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(-2, -4); ctx.lineTo(-5, -4);
    ctx.lineTo(-5, 4); ctx.lineTo(-2, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#85c9d3'; ctx.fillRect(-9, -2, 4, 4); ctx.restore();
}
function drawPlayer(player, side) {
    const x = side === 'left' ? paddle.left : paddle.right;
    const direction = side === 'left' ? 1 : -1;
    const stockX = side === 'left' ? 25 : W - 25;
    const center = player.y + paddle.h / 2;
    player.stock.forEach((type, index) => {
        const slot = index === 0 ? 0 : (index % 2 ? -1 : 1) * Math.ceil(index / 2) * 10;
        drawRocket(stockX, center + slot, direction, type, index === 0 ? 0.9 : 0.72);
    });
    ctx.fillStyle = player.effect === 'freeze' ? '#8bd7e7' : player.effect === 'slow' ? '#f2a65a' : '#e8c878';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14;
    ctx.fillRect(x, player.y, paddle.w, paddle.h); ctx.shadowBlur = 0;
}
function draw() {
    ctx.fillStyle = '#0a1320'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(157,190,208,.08)'; ctx.lineWidth = 1;
    for (let x = 40; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 40; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(232,200,120,.35)'; ctx.setLineDash([8, 12]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(232,200,120,.22)';
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 48, 0, Math.PI * 2); ctx.stroke();
    drawPlayer(p1, 'left'); drawPlayer(p2, 'right');
    for (const rocket of rockets) {
        ctx.strokeStyle = rocket.type === 'tracking' ? 'rgba(243,107,115,.35)' : 'rgba(246,189,96,.35)';
        ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(rocket.x - Math.sign(rocket.vx) * 16, rocket.y);
        ctx.lineTo(rocket.x, rocket.y); ctx.stroke();
        drawRocket(rocket.x, rocket.y, Math.sign(rocket.vx), rocket.type, 1);
    }
    ctx.fillStyle = '#fff3cd'; ctx.shadowColor = '#fff3cd'; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    if (paused || gameOver) {
        ctx.fillStyle = 'rgba(6,12,22,.8)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f4d68e'; ctx.font = 'bold 26px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(gameOver ? matchResult().toUpperCase() : 'PAUSED', W / 2, H / 2 - 8);
        ctx.fillStyle = '#a9b9c7'; ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillText(gameOver ? (timedMatch ? 'TIME UP · ' : '') + 'SPACE TO PLAY AGAIN' : 'P TO RESUME', W / 2, H / 2 + 24);
    }
}
window.addEventListener('keydown', event => {
    if (event.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', ' '].includes(key)) event.preventDefault();
    if (event.repeat && (key === 'p' || key === ' ')) return;
    keys[key] = true;
    if (key === 'p') togglePause();
    if (key === ' ') resetGame();
});
window.addEventListener('keyup', event => { keys[event.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { Object.keys(keys).forEach(key => { keys[key] = false; }); });
function loop(timestamp) {
    updateMatchClock(timestamp);
    if (lastFrame === null) lastFrame = timestamp;
    const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
    lastFrame = timestamp;
    update(dt); draw(); requestAnimationFrame(loop);
}
window.resetGame = resetGame;
window.togglePause = togglePause;
window.toggleMute = toggleMute;
resetGame();
requestAnimationFrame(loop);
