"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenAndSolBalanceBySignature = exports.getTokenDetailsByMint = exports.getTokenTransfersBySignature = exports.getTransactionDetailsBySignature = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const transactionsService_1 = __importDefault(require("../services/transactionsService"));
const web3_js_1 = require("@solana/web3.js");
const getTransactionDetailsBySignature = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { signature } = req.body;
    const transactionInfo = yield transactionsService_1.default.transactionDetailsBySignature(signature);
    res.json(transactionInfo);
}));
exports.getTransactionDetailsBySignature = getTransactionDetailsBySignature;
const getTokenTransfersBySignature = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { signature, wallet } = req.body;
        const publicKey = wallet ? new web3_js_1.PublicKey(wallet) : undefined;
        const transactionInfo = yield transactionsService_1.default.tokenTransfersBySignature(signature, publicKey);
        res.json(transactionInfo);
    }
    catch (err) {
        const error = err;
        console.error("Error getting token transfers:", err);
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
}));
exports.getTokenTransfersBySignature = getTokenTransfersBySignature;
const getTokenDetailsByMint = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mint } = req.body;
    const publicKey = new web3_js_1.PublicKey(mint);
    const tokenDetails = yield transactionsService_1.default.getTokenDetails(publicKey);
    res.json(tokenDetails);
}));
exports.getTokenDetailsByMint = getTokenDetailsByMint;
const getTokenAndSolBalanceBySignature = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { signature } = req.body;
    const tokenAndSolBalance = yield transactionsService_1.default.tokenAndSolBalanceBySignature(signature);
    res.json(tokenAndSolBalance);
}));
exports.getTokenAndSolBalanceBySignature = getTokenAndSolBalanceBySignature;
