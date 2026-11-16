/* ==========================================================================
   game.js — pure logic for the `snake` terminal game (no React, no DOM).
   A W×H grid; walls and your own tail end the game. Deterministic when you
   pass a seeded `rand`, which keeps it unit-testable.
   ========================================================================== */
export const W = 22;
export const H = 11;
export const TICK_MS = 140;

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

function placeFood(snake, rand) {
  const free = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!snake.some(([sx, sy]) => sx === x && sy === y)) free.push([x, y]);
  return free.length ? free[Math.floor(rand() * free.length)] : null;
}

export function newGame(rand = Math.random) {
  const snake = [[5, 5], [4, 5], [3, 5]];
  return { snake, dir: 'right', queued: 'right', food: placeFood(snake, rand), score: 0, over: false, won: false };
}

/** queue a direction change (reversing into yourself is ignored) */
export function turn(state, dir) {
  if (!DIRS[dir] || state.over || dir === OPPOSITE[state.dir]) return state;
  return { ...state, queued: dir };
}

/** advance one tick → { state, event: null | 'eat' | 'die' | 'win' } */
export function step(state, rand = Math.random) {
  if (state.over) return { state, event: null };
  const dir = state.queued;
  const [dx, dy] = DIRS[dir];
  const [hx, hy] = state.snake[0];
  const head = [hx + dx, hy + dy];
  const eats = state.food && head[0] === state.food[0] && head[1] === state.food[1];
  const body = eats ? state.snake : state.snake.slice(0, -1);
  const hitWall = head[0] < 0 || head[1] < 0 || head[0] >= W || head[1] >= H;
  const hitSelf = body.some(([x, y]) => x === head[0] && y === head[1]);
  if (hitWall || hitSelf) return { state: { ...state, dir, over: true }, event: 'die' };
  const snake = [head, ...body];
  if (!eats) return { state: { ...state, dir, snake }, event: null };
  const food = placeFood(snake, rand);
  const next = { ...state, dir, snake, food, score: state.score + 10, over: !food, won: !food };
  return { state: next, event: food ? 'eat' : 'win' };
}

/** render to rows of text: border, @ head, o body, * food */
export function render(state) {
  const grid = Array.from({ length: H }, () => Array(W).fill(' '));
  if (state.food) grid[state.food[1]][state.food[0]] = '*';
  state.snake.forEach(([x, y], i) => { if (y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = i === 0 ? '@' : 'o'; });
  return ['┌' + '─'.repeat(W) + '┐', ...grid.map(r => '│' + r.join('') + '│'), '└' + '─'.repeat(W) + '┘'];
}
