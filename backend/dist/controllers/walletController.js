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
exports.deleteAllWallets = exports.deleteWallet = exports.deleteAllTransactions = exports.getWalletTransactions = exports.updateMonitoring = exports.addWallet = exports.getWallets = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const prisma_1 = __importDefault(require("../lib/prisma"));
// import sendMail from "../mail/sendMail";
// import parse from "json2csv"
const config_1 = require("../config");
const web3_js_1 = require("@solana/web3.js");
const transactionsService_1 = __importDefault(require("../services/transactionsService"));
const activeConnections = new Map();
const getWallets = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const wallets = yield prisma_1.default.wallet.findMany();
    res.json(wallets);
}));
exports.getWallets = getWallets;
const getWalletTransactions = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletId } = req.body;
    const walletExists = yield prisma_1.default.wallet.findUnique({
        where: { wallet_id: walletId },
    });
    if (!walletExists) {
        yield prisma_1.default.wallet.create({
            data: { wallet_id: walletId, email: "tanishmajumdar2912@gmai.com" },
        });
        const publicKey = new web3_js_1.PublicKey(walletId);
        const signatures = yield config_1.rpcConnection.getSignaturesForAddress(publicKey, {
            limit: 100,
        });
        if (signatures.length === 0) {
            console.log("No transactions found.");
            return;
        }
        // @ts-ignore
        let transactions1 = [];
        const transactions = yield Promise.all(signatures.map((signature) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const transaction = yield config_1.rpcConnection.getParsedTransaction(signature.signature, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
            });
            transactions1.push(transaction);
            let transactionDetails;
            const instructions = transaction === null || transaction === void 0 ? void 0 : transaction.transaction.message.instructions;
            if (instructions && instructions.length > 0) {
                const instruction = instructions[2] || instructions[0];
                if ("parsed" in instruction) {
                    transactionDetails = (_a = instruction.parsed) === null || _a === void 0 ? void 0 : _a.info;
                }
            }
            if (!transactionDetails) {
                console.log("Unable to parse transaction details");
                return null;
            }
            const transactionExists = yield prisma_1.default.transaction.findUnique({
                where: { transaction_id: signature.signature },
            });
            if (transactionExists) {
                return {
                    wallet_id: transactionDetails.source,
                    destination_id: transactionDetails.destination,
                    amount: transactionDetails.lamports / web3_js_1.LAMPORTS_PER_SOL,
                };
            }
            yield prisma_1.default.transaction.create({
                data: {
                    transaction_id: signature.signature,
                    wallet_id: transactionDetails.source,
                    destination_id: transactionDetails.destination,
                    amount: transactionDetails.lamports / web3_js_1.LAMPORTS_PER_SOL,
                },
            });
            return {
                wallet_id: transactionDetails.source,
                destination_id: transactionDetails.destination,
                amount: transactionDetails.lamports / web3_js_1.LAMPORTS_PER_SOL,
            };
        })));
        console.log(transactions);
        res.json(transactions);
        return;
    }
    const processedWallets = new Set();
    const transactions = yield recursiveDatabaseQuery(walletId, processedWallets, 0);
    res.json(transactions);
}));
exports.getWalletTransactions = getWalletTransactions;
const recursiveDatabaseQuery = (walletId, processedWallets, level) => __awaiter(void 0, void 0, void 0, function* () {
    if (level > 12 || processedWallets.has(walletId))
        return []; // Base case and prevention of duplicate processing
    processedWallets.add(walletId);
    const transactions = yield prisma_1.default.transaction.findMany({
        where: {
            OR: [{ wallet_id: walletId }, { destination_id: walletId }],
        },
    });
    let allTransactions = [...transactions];
    for (const transaction of transactions) {
        const nextWalletId = transaction.wallet_id === walletId
            ? transaction.destination_id
            : transaction.wallet_id;
        const nextTransactions = yield recursiveDatabaseQuery(nextWalletId, processedWallets, level + 1);
        allTransactions = [...allTransactions, ...nextTransactions];
    }
    return allTransactions;
});
const addWallet = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletId, email } = req.body;
    if (!walletId) {
        res.status(400).json({ message: "Wallet ID is required." });
        return;
    }
    const wallet = yield prisma_1.default.wallet.findUnique({
        where: { wallet_id: walletId },
    });
    if (!wallet) {
        yield prisma_1.default.wallet.create({
            data: { wallet_id: walletId, email },
        });
        // @ts-ignore
        updateMonitoring(req, res);
        return;
    }
    res.json({ message: "Wallet added successfully." });
}));
exports.addWallet = addWallet;
const getLatestTransactionDetails = (publicKey) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const latestTransactionSignature = yield transactionsService_1.default.latestTransaction(publicKey);
        const transaction = yield transactionsService_1.default.transactionDetailsBySignature(latestTransactionSignature);
        if (transaction) {
            if ((_a = transaction.meta) === null || _a === void 0 ? void 0 : _a.err) {
                console.log("Transaction failed. Skipping...");
                return;
            }
            const tokenTransfers = yield transactionsService_1.default.tokenTransfersBySignature(latestTransactionSignature, publicKey);
            console.log(tokenTransfers);
        }
    }
    catch (error) {
        console.error("Error processing transaction:", error);
    }
});
const updateMonitoring = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Active Connections:", activeConnections);
    try {
        const wallets = yield prisma_1.default.wallet.findMany();
        if (wallets.length === 0) {
            res.status(404).json({ message: "No wallets found to monitor." });
            return;
        }
        wallets.forEach((wallet) => {
            const publicKeyStr = wallet.wallet_id;
            if (!activeConnections.has(publicKeyStr)) {
                const publicKey = new web3_js_1.PublicKey(publicKeyStr);
                const connectionId = config_1.rpcConnection.onAccountChange(publicKey, (accountInfo) => __awaiter(void 0, void 0, void 0, function* () {
                    console.log("Account data changed:", accountInfo.data);
                    yield getLatestTransactionDetails(publicKey);
                }), "confirmed" // Pass the commitment directly as a string
                );
                activeConnections.set(publicKeyStr, connectionId);
                console.log("Listening for changes to account:", publicKey.toBase58());
            }
        });
        res.json({ message: "Monitoring started for all wallets." });
    }
    catch (error) {
        console.error("Error starting monitoring:", error);
        res.status(500).json({ error: "Failed to start monitoring." });
    }
}));
exports.updateMonitoring = updateMonitoring;
const deleteAllTransactions = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.transaction.deleteMany();
    yield prisma_1.default.wallet.deleteMany();
    res.json({ message: "All transactions deleted." });
}));
exports.deleteAllTransactions = deleteAllTransactions;
const deleteWallet = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletId } = req.body;
    yield prisma_1.default.transaction.deleteMany({
        where: {
            OR: [{ wallet_id: walletId }, { destination_id: walletId }],
        },
    });
    yield prisma_1.default.wallet.delete({
        where: { wallet_id: walletId },
    });
    const connectionId = activeConnections.get(walletId);
    console.log(connectionId);
    if (connectionId) {
        config_1.rpcConnection.removeAccountChangeListener(connectionId);
        activeConnections.delete(walletId);
    }
    res.json({ message: "Wallet deleted successfully. Connection removed." });
}));
exports.deleteWallet = deleteWallet;
const deleteAllWallets = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.default.transaction.deleteMany();
    yield prisma_1.default.wallet.deleteMany();
    res.json({ message: "All wallets deleted." });
}));
exports.deleteAllWallets = deleteAllWallets;
const addSuspect = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletId } = req.body;
    const wallet = yield prisma_1.default.wallet.findUnique({
        where: { wallet_id: walletId },
    });
    if (!wallet) {
        yield prisma_1.default.wallet.create({
            data: { wallet_id: walletId, email: "tanishmajumdar2912@gmail.com" },
        });
    }
    const walletExists = yield prisma_1.default.suspicions.findUnique({
        where: { wallet_id: walletId },
    });
    if (!walletExists) {
        yield prisma_1.default.suspicions.create({
            data: { wallet_id: walletId },
        });
        res.json({ message: "Suspect added successfully." });
        return;
    }
    res.json({ message: "Suspect already exists." });
}));
