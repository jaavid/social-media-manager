/** Compare JSON values without treating object insertion order as business data. */
export function sameJsonValue(left: unknown, right: unknown): boolean {
  if (left === null || right === null) return left === right;
  if (typeof left !== typeof right) return false;
  if (typeof left === 'string' || typeof left === 'boolean') return left === right;
  if (typeof left === 'number') return Number.isFinite(left) && left === right;
  if (typeof left !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && Array.from(left).every((value, index) => Object.hasOwn(left, index) && Object.hasOwn(right, index) && sameJsonValue(value, right[index]));
  }
  if (Object.getPrototypeOf(left) !== Object.prototype || Object.getPrototypeOf(right) !== Object.prototype) return false;
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length
    && keys.every(key => Object.hasOwn(b, key) && sameJsonValue(a[key], b[key]));
}
