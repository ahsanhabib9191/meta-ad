"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.generateApiKey = generateApiKey;
exports.hashApiKey = hashApiKey;
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const IV_LENGTH = 16; // 16 bytes for AES-GCM
const ALGO = 'aes-256-gcm';
// Cache the encryption key to avoid parsing on every encrypt/decrypt call
let cachedKey = null;
function getKey() {
    if (cachedKey) {
        return cachedKey;
    }
    const keyHex = process.env.ENCRYPTION_KEY || '';
    if (!keyHex || keyHex.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars).');
    }
    cachedKey = Buffer.from(keyHex, 'hex');
    return cachedKey;
}
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto_1.default.createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Store: [IV(16)] [AUTH_TAG(16)] [CIPHERTEXT]
    const payload = Buffer.concat([iv, authTag, encrypted]);
    return payload.toString('base64');
}
function decrypt(encryptedText) {
    try {
        const payload = Buffer.from(encryptedText, 'base64');
        if (payload.length < IV_LENGTH * 2) {
            throw new Error('Invalid encrypted payload.');
        }
        const iv = payload.subarray(0, IV_LENGTH);
        const authTag = payload.subarray(IV_LENGTH, IV_LENGTH * 2);
        const ciphertext = payload.subarray(IV_LENGTH * 2);
        const key = getKey();
        const decipher = crypto_1.default.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return decrypted.toString('utf8');
    }
    catch (err) {
        throw new Error('Failed to decrypt payload: ' + err.message);
    }
}
async function hashPassword(password) {
    const saltRounds = 10;
    return bcrypt_1.default.hash(password, saltRounds);
}
async function comparePassword(password, hash) {
    return bcrypt_1.default.compare(password, hash);
}
function generateApiKey() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
function hashApiKey(apiKey) {
    return crypto_1.default.createHash('sha256').update(apiKey).digest('hex');
}
