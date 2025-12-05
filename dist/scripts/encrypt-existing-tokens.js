"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = require("../lib/utils/crypto");
const MetaConnection_1 = require("../lib/db/models/MetaConnection");
const client_1 = require("../lib/db/client");
dotenv_1.default.config();
async function run(dryRun = true) {
    await (0, client_1.connectDB)();
    const cursor = MetaConnection_1.MetaConnectionModel.find({}).cursor();
    let processed = 0;
    let updated = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        processed++;
        let changed = false;
        // accessToken
        try {
            // Attempt to decrypt; if it throws or produces gibberish, consider it plaintext
            const maybePlain = doc.accessToken;
            try {
                const dec = (0, crypto_1.decrypt)(maybePlain);
                // If decrypt succeeds, token already encrypted. No change
            }
            catch (_e) {
                // Not encrypted yet; encrypt
                doc.accessToken = (0, crypto_1.encrypt)(maybePlain);
                changed = true;
            }
        }
        catch (e) {
            console.error(`Error handling accessToken for doc ${doc._id}:`, e);
        }
        // refreshToken
        if (doc.refreshToken) {
            const maybePlainR = doc.refreshToken;
            try {
                const dec = (0, crypto_1.decrypt)(maybePlainR);
            }
            catch (_e) {
                doc.refreshToken = (0, crypto_1.encrypt)(maybePlainR);
                changed = true;
            }
        }
        if (changed) {
            updated++;
            if (!dryRun) {
                await doc.save();
            }
        }
    }
    console.log(`Processed ${processed} MetaConnection docs. Updated ${updated}. Dry run: ${dryRun}`);
    await (0, client_1.disconnectDB)();
}
const dry = process.env.DRY_RUN !== 'false';
run(dry).catch(async (err) => {
    console.error('Migration failed:', err);
    try {
        await (0, client_1.disconnectDB)();
    }
    catch { }
    process.exit(1);
});
