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
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const config_1 = require("../config");
const { Metadata, deprecated } = require('@metaplex-foundation/mpl-token-metadata');
const utils_1 = require("../utils");
const interfaces_1 = require("./interfaces");
class TransactionsService {
    constructor() {
        this.connection = config_1.rpcConnection;
        this.tokenProgramId = new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    }
    parseInstructionsInOutAmount(transactionData) {
        // Extract pre and post token balances to map decimals and mint addresses
        if (!transactionData.meta) {
            throw new Error('Transaction meta data is missing');
        }
        if (!transactionData.meta.preTokenBalances || !transactionData.meta.postTokenBalances) {
            throw new Error('Transaction token balances are missing');
        }
        if (!transactionData.meta.innerInstructions) {
            throw new Error('Transaction instructions are missing');
        }
        // Initialize variables for the swap details
        let sentAmount = null;
        let receivedAmount = null;
        // Extract the swap instructions
        const instructions = transactionData.meta.innerInstructions.flatMap(i => i.instructions);
        const transferInstructionWithParsedInfo = instructions.filter(instruction => { var _a; return 'parsed' in instruction && ((_a = instruction.parsed) === null || _a === void 0 ? void 0 : _a.type) === 'transfer'; });
        transferInstructionWithParsedInfo.forEach(instruction => {
            // const newCondition = (instruction.program === 'system' && instruction.parsed.type === 'transfer' && instruction.parsed.info.source === 'waletID'
            if (instruction.program === 'system' && instruction.parsed.type === 'transfer') {
                const { amount } = instruction.parsed.info;
                if (!sentAmount) {
                    sentAmount = amount;
                }
                else {
                    receivedAmount = amount;
                }
            }
        });
        return {
            //   sent: sentAmount,
            //   received: receivedAmount,
            instructions: instructions.filter(i => 'parsed' in i)
        };
    }
    transactionDetailsBySignature(signature) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const transaction = yield this.connection.getParsedTransaction(signature, {
                    commitment: "confirmed",
                    maxSupportedTransactionVersion: 0,
                });
                if (!transaction) {
                    console.log("Transaction not found.");
                    return;
                }
                // const transactionDetails =
                //   // @ts-ignore
                //   transaction.transaction.message.instructions[0]?.parsed?.info || transaction.transaction.message.instructions[2]?.parsed?.info;
                // if (!transactionDetails) {
                //   console.log("Transaction details are missing.");
                //   return;
                // }
                return transaction;
            }
            catch (err) {
                console.error("Error processing transaction:", err);
                throw err;
            }
        });
    }
    latestTransaction(publicKey) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const signatures = yield this.connection.getSignaturesForAddress(publicKey, {
                    limit: 1,
                });
                if (signatures.length === 0) {
                    throw new Error("No transactions found.");
                }
                const latestSignature = (_a = signatures[0]) === null || _a === void 0 ? void 0 : _a.signature;
                if (!latestSignature) {
                    throw new Error("No latest transaction found.");
                }
                return latestSignature;
            }
            catch (error) {
                console.error("Error processing transaction:", error);
                throw new Error("Error processing transaction");
            }
        });
    }
    getTokenDetails(mint) {
        return __awaiter(this, void 0, void 0, function* () {
            let metadataPda = yield deprecated.Metadata.getPDA(mint);
            let metdadataContent = yield Metadata.fromAccountAddress(this.connection, metadataPda);
            const data = metdadataContent.pretty().data;
            return {
                mint: mint.toBase58(),
                name: (0, utils_1.cleanString)(data.name),
                symbol: (0, utils_1.cleanString)(data.symbol),
                url: (0, utils_1.getSolscanTokenUrl)(mint.toBase58())
            };
        });
    }
    parseOwnerTransfers(transfers) {
        const ownerTransfers = transfers.filter(t => t.isOwner);
        if (!ownerTransfers) {
            throw new Error("Owner transfers not found.");
        }
        let sentTrasfer;
        let receivedTrasfer;
        if (ownerTransfers.length === 1) {
            console.log('Strategy 1');
            const ownerTransferChangeType = ownerTransfers[0].changeType;
            const searchedTransferType = ownerTransferChangeType === interfaces_1.TOKEN_TRANSFER_CHANGE_TYPE.INCREASE ? interfaces_1.TOKEN_TRANSFER_CHANGE_TYPE.DECREASE : interfaces_1.TOKEN_TRANSFER_CHANGE_TYPE.INCREASE;
            const ownerInteraction = transfers.find(t => t.mint === ownerTransfers[0].mint && t.changeType === searchedTransferType);
            if (ownerInteraction && ownerTransferChangeType === interfaces_1.TOKEN_TRANSFER_CHANGE_TYPE.INCREASE) {
                receivedTrasfer = ownerInteraction;
            }
            else {
                sentTrasfer = ownerInteraction;
            }
            if (sentTrasfer) {
                receivedTrasfer = transfers.find(t => t.owner === (sentTrasfer === null || sentTrasfer === void 0 ? void 0 : sentTrasfer.owner) && t.changeType === ownerTransferChangeType);
            }
            else if (receivedTrasfer) {
                sentTrasfer = transfers.find(t => t.owner === (receivedTrasfer === null || receivedTrasfer === void 0 ? void 0 : receivedTrasfer.owner) && t.changeType === ownerTransferChangeType);
            }
        }
        else {
            console.log('Strategy 2');
            sentTrasfer = ownerTransfers.find(t => t.changeType === interfaces_1.TOKEN_TRANSFER_CHANGE_TYPE.DECREASE);
            receivedTrasfer = ownerTransfers.find(t => t.changeType === interfaces_1.TOKEN_TRANSFER_CHANGE_TYPE.INCREASE);
        }
        return {
            sent: sentTrasfer,
            received: receivedTrasfer
        };
    }
    tokenTransfersBySignature(signature, walletId) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = yield this.transactionDetailsBySignature(signature);
            if (!transaction || !transaction.meta) {
                console.log("Transaction or metadata not found.");
                return [];
            }
            const transfers = this.extractTokenTransfers(transaction.meta, walletId);
            const { sent, received } = this.parseOwnerTransfers(transfers);
            // const { sent: sentInstruction, received: receivedInstruction } = this.parseInstructionsInOutAmount(transaction)
            const sentTokenData = sent ? yield this.getTokenDetails(new web3_js_1.PublicKey(sent.mint)) : undefined;
            const receivedTokenData = received ? yield this.getTokenDetails(new web3_js_1.PublicKey(received.mint)) : undefined;
            return {
                signature,
                sent: (0, utils_1.formatTransfer)(sent, sentTokenData),
                received: (0, utils_1.formatTransfer)(received, receivedTokenData),
                transfers,
            };
        });
    }
    extractTokenTransfers(meta, walletId) {
        var _a, _b, _c, _d, _e, _f;
        const walletIdBase58 = walletId === null || walletId === void 0 ? void 0 : walletId.toBase58();
        const transfers = [];
        if (!meta.postTokenBalances || !meta.preTokenBalances) {
            console.log("Token balances not found.");
            return [];
        }
        for (let i = 0; i < meta.postTokenBalances.length; i++) {
            const post = meta.postTokenBalances[i];
            const pre = (_a = meta.preTokenBalances) === null || _a === void 0 ? void 0 : _a.find(b => b.accountIndex === post.accountIndex);
            if ((pre === null || pre === void 0 ? void 0 : pre.uiTokenAmount.uiAmount) !== post.uiTokenAmount.uiAmount) {
                const changeAmount = ((_b = post.uiTokenAmount.uiAmount) !== null && _b !== void 0 ? _b : 0) - ((_c = pre === null || pre === void 0 ? void 0 : pre.uiTokenAmount.uiAmount) !== null && _c !== void 0 ? _c : 0);
                const changeType = changeAmount < 0 ? interfaces_1.TOKEN_TRANSFER_CHANGE_TYPE.DECREASE : (changeAmount > 0 ? interfaces_1.TOKEN_TRANSFER_CHANGE_TYPE.INCREASE : interfaces_1.TOKEN_TRANSFER_CHANGE_TYPE.UNCHANGED);
                transfers.push({
                    mint: post.mint,
                    owner: (_d = post.owner) !== null && _d !== void 0 ? _d : '',
                    preBalance: (_e = pre === null || pre === void 0 ? void 0 : pre.uiTokenAmount.uiAmount) !== null && _e !== void 0 ? _e : 0,
                    postBalance: (_f = post.uiTokenAmount.uiAmount) !== null && _f !== void 0 ? _f : 0,
                    amountChange: changeAmount,
                    changeType,
                    decimals: post.uiTokenAmount.decimals,
                    isOwner: post.owner === walletIdBase58
                });
            }
        }
        return transfers;
    }
    tokenAndSolBalanceBySignature(signature) {
        return __awaiter(this, void 0, void 0, function* () {
            // const getTokenAccountBalance = await this.connection.getTokenAccountBalance(mint);
            const transaction = yield this.transactionDetailsBySignature(signature);
            if (!transaction || !transaction.meta) {
                throw new Error("Transaction or metadata not found.");
            }
            const instruction = this.parseInstructionsInOutAmount(transaction);
            return instruction;
        });
    }
}
// Export an instance of the TransactionsService class
exports.default = new TransactionsService();
