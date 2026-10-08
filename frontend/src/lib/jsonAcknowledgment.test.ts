import { sameJsonValue } from './jsonAcknowledgment';
test('jsonb key reordering preserves an acknowledgment, including nested array objects', () => {
  expect(sameJsonValue({ b: [{ z: 1, a: { x: true, y: null } }], a: 'fixture' }, { a: 'fixture', b: [{ a: { y: null, x: true }, z: 1 }] })).toBe(true);
});
test.each([
  [[1, 2], [2, 1]], [{ a: 1 }, { a: '1' }], [{ a: null }, {}],
  [{ a: 1 }, { a: 2 }], [{ a: [1] }, { a: [1, 2] }],
  [null, {}], [[], {}], [undefined, null], [undefined, undefined],
  [{ a: undefined }, {}], [NaN, NaN], [new Date(0), {}],
  [Array(1), Array(1)], [{ a: { x: 1 } }, { a: { y: 1 } }],
])('rejects changed or malformed acknowledgment %#', (left, right) => {
  expect(sameJsonValue(left, right)).toBe(false);
});
