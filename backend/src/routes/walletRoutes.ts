import express from "express";
import { Request, Response } from "express";

import {
  getWallets,
  addWallet,
  updateMonitoring,
  getWalletTransactions,
  deleteAllTransactions,
  deleteWallet,
  deleteAllWallets,
} from "../controllers/walletController";

import {
  getTransactionDetailsBySignature,
  getTokenTransfersBySignature,
  getTokenAndSolBalanceBySignature,
} from "../controllers/transactionsController";

import tokenController from "../controllers/tokenController";
import RaydiumService from "../services/raydiumService";

const router = express.Router();
const raydiumService = new RaydiumService();

router.get("/", getWallets);
router.post("/add", addWallet);
router.get("/monitor", updateMonitoring);
router.post("/transactions", getWalletTransactions);
router.get("/delete", deleteAllTransactions);
router.post("/delete", deleteWallet);
router.delete("/delete/all", deleteAllWallets);
router.post("/signature", getTransactionDetailsBySignature);
router.post("/transfers", getTokenTransfersBySignature);
router.get("/token-details/:tokenAddress", tokenController.getTokenDetails);
router.post("/token-balance", getTokenAndSolBalanceBySignature);
router.get(
  "/dextools/top-traders/:pairAddress",
  tokenController.getPairTopTraders
);
router.get(
  "/dextools/pair-details/:tokenAddress",
  tokenController.getPairByTokenAddress
);
// router.get("/graph", drawGraph);

router.get("/pools/info/mint", async (req, res) => {
  const { mint, single } = req.query;
  try {
    if (typeof mint !== "string") throw new Error("Invalid mint");
    const pools = await (single
      ? raydiumService.getPoolInfoByMint(mint)
      : raydiumService.getAllPoolsByMint(mint));
    res.json({ success: true, data: { ...pools } });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

export default router;
