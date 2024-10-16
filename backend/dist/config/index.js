"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpcConnection = exports.SOLSCAN_URL = void 0;
const web3_js_1 = require("@solana/web3.js");
const RPC_URL = process.env.RPC_URL;
const WSS_URL = process.env.WSS_URL;
exports.SOLSCAN_URL = process.env.SOLSCAN_URL;
exports.rpcConnection = new web3_js_1.Connection(RPC_URL, {
    commitment: 'confirmed',
    wsEndpoint: WSS_URL,
});
