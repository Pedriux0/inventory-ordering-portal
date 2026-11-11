const { retryOnConflict, isTemporaryConflict } = require('../../src/utils/retry');

const conflict = (code) => Object.assign(new Error(code), { code });

describe('retry on temporary database conflicts (req 3.4.1)', () => {
  test('a deadlock is retried and the second attempt succeeds', async () => {
    const task = jest.fn().mockRejectedValueOnce(conflict('ER_LOCK_DEADLOCK')).mockResolvedValueOnce('saved');
    await expect(retryOnConflict(task)).resolves.toBe('saved');
    expect(task).toHaveBeenCalledTimes(2);
  });

  test('"record has changed" (snapshot isolation) and lock timeouts are retried too', () => {
    expect(isTemporaryConflict(conflict('ER_CHECKREAD'))).toBe(true);
    expect(isTemporaryConflict(conflict('ER_LOCK_WAIT_TIMEOUT'))).toBe(true);
  });

  test('a real error (duplicate, not enough stock, ...) is thrown straight away, never retried', async () => {
    const task = jest.fn().mockRejectedValue(conflict('ER_DUP_ENTRY'));
    await expect(retryOnConflict(task)).rejects.toThrow('ER_DUP_ENTRY');
    expect(task).toHaveBeenCalledTimes(1);
  });

  test('it gives up after 5 attempts and reports the conflict', async () => {
    const task = jest.fn().mockRejectedValue(conflict('ER_LOCK_DEADLOCK'));
    await expect(retryOnConflict(task)).rejects.toThrow('ER_LOCK_DEADLOCK');
    expect(task).toHaveBeenCalledTimes(5);
  });
});
