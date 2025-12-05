"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = require("../lib/utils/crypto");
dotenv_1.default.config();
async function run() {
    console.log('Testing advanced crypto utilities...');
    // Test encryption/decryption with various inputs
    const testCases = [
        'simple text',
        'text with special chars: !@#$%^&*()',
        'unicode: 你好世界 🌍',
        'long text: ' + 'a'.repeat(10000),
        'empty string: ',
        'numbers: 1234567890',
        JSON.stringify({ nested: { object: true, value: 123 } }),
    ];
    for (const testCase of testCases) {
        const encrypted = (0, crypto_1.encrypt)(testCase);
        if (encrypted === testCase)
            throw new Error('Encryption did not change the text');
        if (!encrypted || encrypted.length === 0)
            throw new Error('Encryption produced empty result');
        const decrypted = (0, crypto_1.decrypt)(encrypted);
        if (decrypted !== testCase) {
            throw new Error(`Decryption mismatch for: "${testCase.slice(0, 50)}..."`);
        }
    }
    // Test encryption produces different ciphertext for same plaintext (IV randomness)
    const plaintext = 'test encryption randomness';
    const encrypted1 = (0, crypto_1.encrypt)(plaintext);
    const encrypted2 = (0, crypto_1.encrypt)(plaintext);
    if (encrypted1 === encrypted2) {
        throw new Error('Encryption should produce different ciphertext each time (IV randomness)');
    }
    // Both should decrypt to the same plaintext
    if ((0, crypto_1.decrypt)(encrypted1) !== plaintext || (0, crypto_1.decrypt)(encrypted2) !== plaintext) {
        throw new Error('Different ciphertexts should decrypt to same plaintext');
    }
    // Test decryption of invalid data
    try {
        (0, crypto_1.decrypt)('invalid-base64-data!!!');
        throw new Error('Decrypting invalid data should throw');
    }
    catch (err) {
        if (!err.message.includes('decrypt')) {
            throw new Error('Expected decrypt error message');
        }
    }
    try {
        (0, crypto_1.decrypt)(''); // Empty string
        throw new Error('Decrypting empty string should throw');
    }
    catch (err) {
        if (!err.message.includes('decrypt')) {
            throw new Error('Expected decrypt error for empty string');
        }
    }
    // Test truncated ciphertext
    const validEncrypted = (0, crypto_1.encrypt)('valid text');
    const truncated = validEncrypted.slice(0, 10);
    try {
        (0, crypto_1.decrypt)(truncated);
        throw new Error('Decrypting truncated ciphertext should throw');
    }
    catch (err) {
        if (!err.message.includes('decrypt')) {
            throw new Error('Expected decrypt error for truncated data');
        }
    }
    // Test password hashing
    const password = 'mySecurePassword123!';
    const hash1 = await (0, crypto_1.hashPassword)(password);
    const hash2 = await (0, crypto_1.hashPassword)(password);
    if (hash1 === hash2) {
        throw new Error('Password hashing should produce different hashes (salt randomness)');
    }
    if (hash1 === password)
        throw new Error('Hash should differ from plaintext password');
    // Test password comparison
    const isValid = await (0, crypto_1.comparePassword)(password, hash1);
    if (!isValid)
        throw new Error('Password comparison failed for correct password');
    const isValid2 = await (0, crypto_1.comparePassword)(password, hash2);
    if (!isValid2)
        throw new Error('Password comparison failed for second hash');
    const isInvalid = await (0, crypto_1.comparePassword)('wrongPassword', hash1);
    if (isInvalid)
        throw new Error('Password comparison should fail for incorrect password');
    // Test API key generation
    const apiKey1 = (0, crypto_1.generateApiKey)();
    const apiKey2 = (0, crypto_1.generateApiKey)();
    if (apiKey1 === apiKey2)
        throw new Error('API keys should be unique');
    if (apiKey1.length !== 64)
        throw new Error('API key should be 64 hex characters');
    if (!/^[0-9a-f]{64}$/.test(apiKey1))
        throw new Error('API key should be lowercase hex');
    // Test API key hashing
    const apiKeyHash1 = (0, crypto_1.hashApiKey)(apiKey1);
    const apiKeyHash2 = (0, crypto_1.hashApiKey)(apiKey1); // Same key
    if (apiKeyHash1 !== apiKeyHash2) {
        throw new Error('Hashing same API key should produce same hash');
    }
    if (apiKeyHash1 === apiKey1)
        throw new Error('API key hash should differ from plaintext');
    if (apiKeyHash1.length !== 64)
        throw new Error('API key hash should be 64 hex characters (SHA-256)');
    const differentKeyHash = (0, crypto_1.hashApiKey)(apiKey2);
    if (apiKeyHash1 === differentKeyHash) {
        throw new Error('Different API keys should produce different hashes');
    }
    // Test encryption with missing/invalid key
    const originalKey = process.env.ENCRYPTION_KEY;
    // Test with invalid key length
    process.env.ENCRYPTION_KEY = 'tooshort';
    try {
        (0, crypto_1.encrypt)('test');
        throw new Error('Encryption with short key should throw');
    }
    catch (err) {
        if (!err.message.includes('ENCRYPTION_KEY')) {
            throw new Error('Expected ENCRYPTION_KEY error');
        }
    }
    // Test with missing key
    delete process.env.ENCRYPTION_KEY;
    try {
        (0, crypto_1.encrypt)('test');
        throw new Error('Encryption without key should throw');
    }
    catch (err) {
        if (!err.message.includes('ENCRYPTION_KEY')) {
            throw new Error('Expected ENCRYPTION_KEY error');
        }
    }
    // Restore key
    process.env.ENCRYPTION_KEY = originalKey;
    // Test edge case: very long password
    const longPassword = 'p'.repeat(1000);
    const longHash = await (0, crypto_1.hashPassword)(longPassword);
    const longValid = await (0, crypto_1.comparePassword)(longPassword, longHash);
    if (!longValid)
        throw new Error('Long password hashing failed');
    // Test edge case: empty password
    const emptyHash = await (0, crypto_1.hashPassword)('');
    const emptyValid = await (0, crypto_1.comparePassword)('', emptyHash);
    if (!emptyValid)
        throw new Error('Empty password hashing failed');
    console.log('✅ All advanced crypto tests passed');
}
run().catch((err) => {
    console.error('❌ Advanced crypto tests failed:', err.message);
    process.exit(1);
});
