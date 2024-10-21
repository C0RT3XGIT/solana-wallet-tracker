import asyncHandler from "express-async-handler";
import transactionsService from "../services/transactionsService";
import { PublicKey } from "@solana/web3.js";

const getTransactionDetailsBySignature = asyncHandler(async (req, res) => {
  const { signature } = req.body;
  const transactionInfo =
    await transactionsService.transactionDetailsBySignature(signature);
  res.json(transactionInfo);
});

const getTokenTransfersBySignature = asyncHandler(async (req, res) => {
  try {
    const { signature, wallet } = req.body;
    const publicKey = wallet ? new PublicKey(wallet) : undefined;
    const transactionInfo = await transactionsService.tokenTransfersBySignature(
      signature,
      publicKey
    );
    res.json(transactionInfo);
  } catch (err) {
    const error = err as Error;
    console.error("Error getting token transfers:", err);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

const getTokenAndSolBalanceBySignature = asyncHandler(async (req, res) => {
  const { signature } = req.body;
  const tokenAndSolBalance =
    await transactionsService.tokenAndSolBalanceBySignature(signature);
  res.json(tokenAndSolBalance);
});

export {
  getTransactionDetailsBySignature,
  getTokenTransfersBySignature,
  getTokenAndSolBalanceBySignature,
};
