"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const walletController_1 = require("../controllers/walletController");
const transactionsController_1 = require("../controllers/transactionsController");
const dextoolsController_1 = __importDefault(require("../controllers/dextoolsController"));
const router = express_1.default.Router();
const dextoolsController = new dextoolsController_1.default();
router.get("/", walletController_1.getWallets);
router.post("/add", walletController_1.addWallet);
router.get("/monitor", walletController_1.updateMonitoring);
router.post("/transactions", walletController_1.getWalletTransactions);
router.get("/delete", walletController_1.deleteAllTransactions);
router.post("/delete", walletController_1.deleteWallet);
router.delete("/delete/all", walletController_1.deleteAllWallets);
router.post("/signature", transactionsController_1.getTransactionDetailsBySignature);
router.post("/transfers", transactionsController_1.getTokenTransfersBySignature);
router.post("/token-details", transactionsController_1.getTokenDetailsByMint);
router.post("/token-balance", transactionsController_1.getTokenAndSolBalanceBySignature);
router.get("/dextools/top-traders/:pairAddress", dextoolsController.getPairTopTraders);
// router.get("/graph", drawGraph);
exports.default = router;
