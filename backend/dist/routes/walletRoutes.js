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
const express_1 = __importDefault(require("express"));
const walletController_1 = require("../controllers/walletController");
const transactionsController_1 = require("../controllers/transactionsController");
const tokenController_1 = __importDefault(require("../controllers/tokenController"));
const raydiumService_1 = __importDefault(require("../services/raydiumService")); // Ensure this import is correct
const router = express_1.default.Router();
router.get("/", walletController_1.getWallets);
router.post("/add", walletController_1.addWallet);
router.get("/monitor", walletController_1.updateMonitoring);
router.post("/transactions", walletController_1.getWalletTransactions);
router.get("/delete", walletController_1.deleteAllTransactions);
router.post("/delete", walletController_1.deleteWallet);
router.delete("/delete/all", walletController_1.deleteAllWallets);
router.post("/signature", transactionsController_1.getTransactionDetailsBySignature);
router.post("/transfers", transactionsController_1.getTokenTransfersBySignature);
router.get("/token-details/:tokenAddress/:vsToken?", tokenController_1.default.getTokenDetails);
router.post("/token-balance", transactionsController_1.getTokenAndSolBalanceBySignature);
// router.get("/graph", drawGraph);
router.get("/pools/info/mint", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mint } = req.query;
    try {
        if (typeof mint !== "string")
            throw new Error("Invalid mint");
        const data = yield raydiumService_1.default.getPoolInfoByMint(mint);
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, msg: error.message });
    }
}));
exports.default = router;
