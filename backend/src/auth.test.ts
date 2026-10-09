import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedTelegramIds, AuthError, verifyInitData } from './auth.js';
import { signInitData } from './testing.js';

const token = '123456:test-token';
const user = { id: 42, first_name: 'Иван', username: 'ivan' };

test('валидная подпись initData принимается', () => {
  assert.deepEqual(verifyInitData(signInitData(user, token), token), user);
});

test('подпись другим токеном отклоняется', () => {
  assert.throws(
    () => verifyInitData(signInitData(user, 'other-token'), token),
    (e) => e instanceof AuthError && e.status === 401,
  );
});

test('подменённые данные пользователя отклоняются', () => {
  const tampered = new URLSearchParams(signInitData(user, token));
  tampered.set('user', JSON.stringify({ ...user, id: 1 }));
  assert.throws(() => verifyInitData(tampered.toString(), token), /подпись/);
});

test('initData без hash и пустой отклоняются', () => {
  const noHash = new URLSearchParams(signInitData(user, token));
  noHash.delete('hash');
  assert.throws(() => verifyInitData(noHash.toString(), token), /подпись/);
  assert.throws(() => verifyInitData('', token), /подпись/);
});

test('устаревшая сессия (старше суток) отклоняется', () => {
  const now = Date.now();
  const twoDaysAgo = Math.floor(now / 1000) - 2 * 86400;
  assert.throws(() => verifyInitData(signInitData(user, token, twoDaysAgo), token, now), /устарела/);
});

test('некорректный Telegram ID отклоняется', () => {
  assert.throws(() => verifyInitData(signInitData({ id: -5 }, token), token), /Telegram ID/);
});

test('список разрешённых ID разбирается из строки через запятую', () => {
  assert.deepEqual([...allowedTelegramIds(' 1, 22 ,,333 ')], ['1', '22', '333']);
  assert.equal(allowedTelegramIds('').size, 0);
  assert.equal(allowedTelegramIds(undefined).size, 0);
});
