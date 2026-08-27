/**
 * Генератор псевдослучайного рельефа («шум»).
 *
 * Чтобы горы выглядели естественно, высота точки не берётся случайно —
 * иначе получится «наждачка». Используется value noise: сетка случайных
 * значений, между которыми высота плавно интерполируется. Несколько
 * слоёв разного масштаба, сложенные вместе (это называется фрактальный
 * шум, или fBm), дают крупные хребты плюс мелкие детали на них.
 *
 * Всё детерминировано: один и тот же seed всегда даёт один и тот же
 * рельеф. Это важно — сцена должна выглядеть одинаково при каждой
 * загрузке страницы.
 */

/** Стабильное псевдослучайное число из пары координат. */
function hash(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

/** Сглаживающая кривая: убирает угловатость на стыках ячеек сетки. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Один слой шума. */
function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);

  const u = smoothstep(xf);
  const v = smoothstep(yf);

  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

/**
 * Итоговая высота точки рельефа.
 *
 * @param octaves сколько слоёв складывать: больше — детальнее, но дороже
 * @returns значение примерно от 0 до 1
 */
export function terrainHeight(
  x: number,
  y: number,
  seed = 1337,
  octaves = 5,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let total = 0;

  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * frequency, y * frequency, seed + i) * amplitude;
    total += amplitude;
    // Каждый следующий слой вдвое мельче и вдвое слабее предыдущего.
    amplitude *= 0.5;
    frequency *= 2;
  }

  const n = value / total;

  // Возведение в степень делает долины шире, а хребты — острее.
  // Без этого рельеф выглядит как холмы, а не как горы.
  return Math.pow(n, 1.9);
}
