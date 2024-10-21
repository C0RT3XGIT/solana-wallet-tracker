import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
// import sendMail from "../mail/sendMail";
// import parse from "json2csv"
import { rpcConnection } from "../config";

import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import TransactionsService from "../services/transactionsService";

interface ActiveConnection {
  walletId: string;
  connectionId: number;
}

const activeConnections: Map<string, number> = new Map();

const getWallets = asyncHandler(async (req: Request, res: Response) => {
  const wallets = await prisma.wallet.findMany();
  res.json(wallets);
});

const getWalletTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const { walletId } = req.body;
    const walletExists = await prisma.wallet.findUnique({
      where: { wallet_id: walletId },
    });
    if (!walletExists) {
      await prisma.wallet.create({
        data: { wallet_id: walletId, email: "tanishmajumdar2912@gmai.com" },
      });
      const publicKey = new PublicKey(walletId);
      const signatures = await rpcConnection.getSignaturesForAddress(
        publicKey,
        {
          limit: 100,
        }
      );
      if (signatures.length === 0) {
        console.log("No transactions found.");
        return;
      }
      // @ts-ignore
      let transactions1 = [];
      const transactions = await Promise.all(
        signatures.map(async (signature) => {
          const transaction = await rpcConnection.getParsedTransaction(
            signature.signature,
            {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            }
          );
          transactions1.push(transaction);

          let transactionDetails;
          const instructions = transaction?.transaction.message.instructions;
          if (instructions && instructions.length > 0) {
            const instruction = instructions[2] || instructions[0];
            if ("parsed" in instruction) {
              transactionDetails = instruction.parsed?.info;
            }
          }

          if (!transactionDetails) {
            console.log("Unable to parse transaction details");
            return null;
          }

          const transactionExists = await prisma.transaction.findUnique({
            where: { transaction_id: signature.signature },
          });
          if (transactionExists) {
            return {
              wallet_id: transactionDetails.source,
              destination_id: transactionDetails.destination,
              amount: transactionDetails.lamports / LAMPORTS_PER_SOL,
            };
          }
          await prisma.transaction.create({
            data: {
              transaction_id: signature.signature,
              wallet_id: transactionDetails.source,
              destination_id: transactionDetails.destination,
              amount: transactionDetails.lamports / LAMPORTS_PER_SOL,
            },
          });
          return {
            wallet_id: transactionDetails.source,
            destination_id: transactionDetails.destination,
            amount: transactionDetails.lamports / LAMPORTS_PER_SOL,
          };
        })
      );
      console.log(transactions);
      res.json(transactions);
      return;
    }
    const processedWallets = new Set<string>();
    const transactions = await recursiveDatabaseQuery(
      walletId,
      processedWallets,
      0
    );
    res.json(transactions);
  }
);

const recursiveDatabaseQuery = async (
  walletId: string,
  processedWallets: Set<string>,
  level: number
) => {
  if (level > 12 || processedWallets.has(walletId)) return []; // Base case and prevention of duplicate processing

  processedWallets.add(walletId);

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [{ wallet_id: walletId }, { destination_id: walletId }],
    },
  });

  let allTransactions = [...transactions];

  for (const transaction of transactions) {
    const nextWalletId =
      transaction.wallet_id === walletId
        ? transaction.destination_id
        : transaction.wallet_id;

    const nextTransactions = await recursiveDatabaseQuery(
      nextWalletId,
      processedWallets,
      level + 1
    );
    allTransactions = [...allTransactions, ...nextTransactions];
  }

  return allTransactions;
};

const addWallet = asyncHandler(async (req: Request, res: Response) => {
  const { walletId, email } = req.body;
  if (!walletId) {
    res.status(400).json({ message: "Wallet ID is required." });
    return;
  }
  const wallet = await prisma.wallet.findUnique({
    where: { wallet_id: walletId },
  });
  if (!wallet) {
    await prisma.wallet.create({
      data: { wallet_id: walletId, email },
    });
    // @ts-ignore
    updateMonitoring(req, res);
    return;
  }
  res.json({ message: "Wallet added successfully." });
});

const getLatestTransactionDetails = async (publicKey: PublicKey) => {
  try {
    const latestTransactionSignature =
      await TransactionsService.latestTransaction(publicKey);
    const transaction = await TransactionsService.transactionDetailsBySignature(
      latestTransactionSignature
    );
    if (transaction) {
      if (transaction.meta?.err) {
        console.log("Transaction failed. Skipping...");
        return;
      }
      const tokenTransfers =
        await TransactionsService.tokenTransfersBySignature(
          latestTransactionSignature,
          publicKey
        );
      console.log(tokenTransfers);
    }
  } catch (error) {
    console.error("Error processing transaction:", error);
  }
};

const updateMonitoring = asyncHandler(async (req: Request, res: Response) => {
  console.log("Active Connections:", activeConnections);

  try {
    const wallets = await prisma.wallet.findMany();
    if (wallets.length === 0) {
      res.status(404).json({ message: "No wallets found to monitor." });
      return;
    }
    wallets.forEach((wallet) => {
      const publicKeyStr = wallet.wallet_id;
      if (!activeConnections.has(publicKeyStr)) {
        const publicKey = new PublicKey(publicKeyStr);
        const connectionId = rpcConnection.onAccountChange(
          publicKey,
          async (accountInfo) => {
            console.log("Account data changed:", accountInfo.data);
            await getLatestTransactionDetails(publicKey);
          },
          "confirmed" // Pass the commitment directly as a string
        );
        activeConnections.set(publicKeyStr, connectionId);
        console.log("Listening for changes to account:", publicKey.toBase58());
      }
    });

    res.json({ message: "Monitoring started for all wallets." });
  } catch (error) {
    console.error("Error starting monitoring:", error);
    res.status(500).json({ error: "Failed to start monitoring." });
  }
});

const deleteAllTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
    res.json({ message: "All transactions deleted." });
  }
);

const deleteWallet = asyncHandler(async (req: Request, res: Response) => {
  const { walletId } = req.body;
  await prisma.transaction.deleteMany({
    where: {
      OR: [{ wallet_id: walletId }, { destination_id: walletId }],
    },
  });
  await prisma.wallet.delete({
    where: { wallet_id: walletId },
  });
  const connectionId = activeConnections.get(walletId);
  console.log(connectionId);
  if (connectionId) {
    rpcConnection.removeAccountChangeListener(connectionId);
    activeConnections.delete(walletId);
  }
  res.json({ message: "Wallet deleted successfully. Connection removed." });
});

const deleteAllWallets = asyncHandler(async (req: Request, res: Response) => {
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  res.json({ message: "All wallets deleted." });
});

const addSuspect = asyncHandler(async (req: Request, res: Response) => {
  const { walletId } = req.body;
  const wallet = await prisma.wallet.findUnique({
    where: { wallet_id: walletId },
  });
  if (!wallet) {
    await prisma.wallet.create({
      data: { wallet_id: walletId, email: "tanishmajumdar2912@gmail.com" },
    });
  }
  const walletExists = await prisma.suspicions.findUnique({
    where: { wallet_id: walletId },
  });

  if (!walletExists) {
    await prisma.suspicions.create({
      data: { wallet_id: walletId },
    });
    res.json({ message: "Suspect added successfully." });
    return;
  }
  res.json({ message: "Suspect already exists." });
});

export {
  getWallets,
  addWallet,
  updateMonitoring,
  getWalletTransactions,
  deleteAllTransactions,
  deleteWallet,
  deleteAllWallets,
};
