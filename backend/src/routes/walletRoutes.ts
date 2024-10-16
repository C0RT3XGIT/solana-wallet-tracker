import express from "express";
import { Request, Response } from "express";

import {
  getWallets,
  addWallet,
  updateMonitoring,
  getWalletTransactions,
  deleteAllTransactions,
  deleteWallet,
    deleteAllWallets
} from "../controllers/walletController";

import {getTransactionDetailsBySignature, getTokenTransfersBySignature, getTokenDetailsByMint, getTokenAndSolBalanceBySignature} from "../controllers/transactionsController";
import DextoolsController from "../controllers/dextoolsController";

const router = express.Router();
const dextoolsController = new DextoolsController();

router.get("/", getWallets);
router.post("/add", addWallet);
router.get("/monitor", updateMonitoring);
router.post("/transactions", getWalletTransactions);
router.get("/delete", deleteAllTransactions);
router.post("/delete", deleteWallet);
router.delete("/delete/all", deleteAllWallets)
router.post("/signature", getTransactionDetailsBySignature);
router.post("/transfers", getTokenTransfersBySignature);
router.post("/token-details", getTokenDetailsByMint);
router.post("/token-balance", getTokenAndSolBalanceBySignature);
router.get("/dextools/top-traders/:pairAddress", dextoolsController.getPairTopTraders);
// router.get("/graph", drawGraph);

export default router;
