const { validatePassword, hashPassword, comparePassword } = require('../../src/utils/password');

describe('password utils', () => {
  // UT-01 (req 2.1.3)
  test('UT-01 hashes the password before storing', async () => {
    const plain = 'TestPassword1234!';
    const hash = await hashPassword(plain);

    // the stored value must never be the original password
    expect(hash).not.toBe(plain);
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hashes always start with $2a$, $2b$ or $2y$
    expect(hash).toHaveLength(60); // fits the CHAR(60) column in the users table
    // the hash must still be usable to verify the right password and reject a wrong one
    expect(await comparePassword(plain, hash)).toBe(true);
    expect(await comparePassword('WrongPassword1234!', hash)).toBe(false);
  });

  // UT-02 (req 2.1.2)
  test('UT-02 rejects a password below 16 characters', () => {
    // 'Short1!' has upper, lower and digit, so length is the only rule it breaks
    const errors = validatePassword('Short1!');

    expect(errors).toContain('Password must be at least 16 characters long');
  });

  test('accepts a password that meets every rule', () => {
    expect(validatePassword('TestPassword1234!')).toEqual([]);
  });

  // the next three passwords are 16+ chars, so only the character rule is being tested
  test('rejects a password with no uppercase letter', () => {
    expect(validatePassword('testpassword12345')).toContain(
      'Password must contain at least one uppercase letter'
    );
  });

  test('rejects a password with no lowercase letter', () => {
    expect(validatePassword('TESTPASSWORD12345')).toContain(
      'Password must contain at least one lowercase letter'
    );
  });

  test('rejects a password with no number', () => {
    expect(validatePassword('TestPasswordNoDigits')).toContain(
      'Password must contain at least one number'
    );
  });

  // the password comes from the request body, so it can be anything
  test('rejects a missing or non-string password', () => {
    expect(validatePassword(undefined).length).toBeGreaterThan(0);
    expect(validatePassword(12345678901234567890).length).toBeGreaterThan(0);
  });
});
