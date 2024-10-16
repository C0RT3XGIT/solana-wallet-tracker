"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTransfer = exports.getSolscanTokenUrl = exports.cleanString = void 0;
const config_1 = require("../config");
const cleanString = (str) => {
    // Remove null bytes and trim whitespace
    return str.replace(/\0/g, '').trim();
};
exports.cleanString = cleanString;
const getSolscanTokenUrl = (mint) => {
    return `${config_1.SOLSCAN_URL}/token/${mint}`;
};
exports.getSolscanTokenUrl = getSolscanTokenUrl;
// const fromatedSentTransfer = {
//   ...sent,
//   amount: sent.amountChange,
//   tokenData: sentTokenData
// }
//Create a function that will format transaction as shown above
const formatTransfer = (transfer, tokenData) => {
    return {
        amount: transfer === null || transfer === void 0 ? void 0 : transfer.amountChange,
        tokenData
    };
};
exports.formatTransfer = formatTransfer;
