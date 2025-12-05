"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../lib/db/index");
const client_1 = require("../lib/db/client");
const redis_1 = require("../lib/db/redis");
async function main() {
    try {
        await (0, index_1.initializeDatabase)();
        await (0, redis_1.connectRedis)();
    }
    catch (err) {
        console.error('Initialization error:', err);
        process.exitCode = 1;
    }
    finally {
        await (0, redis_1.disconnectRedis)();
        await (0, client_1.disconnectDB)();
    }
}
main();
