import {
  Connection,
//  ParsedInstruction,
  ParsedTransactionMeta,
  ParsedTransactionWithMeta, 
  PublicKey,
} from '@solana/web3.js';
import { rpcConnection } from '../config';
const { Metadata, deprecated } = require('@metaplex-foundation/mpl-token-metadata');
import { cleanString, formatTransfer, getSolscanTokenUrl } from '../utils';
import { TokenDetails, TOKEN_TRANSFER_CHANGE_TYPE, TokenTransfer, ParsedInteraction, InstructionWithParsedData } from './interfaces';

class TransactionsService {
  private readonly connection: Connection;
  private readonly tokenProgramId: PublicKey;

  constructor() {
    this.connection = rpcConnection;
    this.tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  }

  private parseInstructionsInOutAmount(transactionData: ParsedTransactionWithMeta) {

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
    let sentAmount: number | null = null;
    let receivedAmount = null;
    // Extract the swap instructions
    const instructions = transactionData.meta.innerInstructions.flatMap(i => i.instructions);

    const transferInstructionWithParsedInfo = instructions.filter(instruction => 'parsed' in instruction && instruction.parsed?.type === 'transfer') as InstructionWithParsedData[];

    transferInstructionWithParsedInfo.forEach(instruction => {

      // const newCondition = (instruction.program === 'system' && instruction.parsed.type === 'transfer' && instruction.parsed.info.source === 'waletID'
      if (instruction.program === 'system' && instruction.parsed.type === 'transfer') {
        const { amount } = instruction.parsed.info;
        if (!sentAmount) {
          sentAmount = amount;
        } else {
          receivedAmount = amount;
        }
      }

    });
    return {
    //   sent: sentAmount,
    //   received: receivedAmount,
      instructions: instructions.filter(i => 'parsed' in i )
    }
  }


  async transactionDetailsBySignature(
    signature: string,
  ) {
    try {
      const transaction = await this.connection.getParsedTransaction(signature, {
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
  }


  async latestTransaction(
    publicKey: PublicKey,
  ): Promise<string> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(publicKey, {
        limit: 1,
      });

      if (signatures.length === 0) {
        throw new Error("No transactions found.");
      }

      const latestSignature = signatures[0]?.signature;

      if (!latestSignature) {
        throw new Error("No latest transaction found.");
      }

      return latestSignature;

    } catch (error) {
      console.error("Error processing transaction:", error);
      throw new Error("Error processing transaction");
    }
  }

   async getTokenDetails(mint: PublicKey): Promise<TokenDetails> {
    let metadataPda = await deprecated.Metadata.getPDA(mint);
    let metdadataContent =  await Metadata.fromAccountAddress(this.connection, metadataPda);
    const data = metdadataContent.pretty().data;
    return {
      mint: mint.toBase58(),
      name: cleanString(data.name),
      symbol: cleanString(data.symbol),
      url: getSolscanTokenUrl(mint.toBase58())
    }
  }

  private parseOwnerTransfers(transfers: TokenTransfer[]): ParsedInteraction {
    const ownerTransfers = transfers.filter(t => t.isOwner)

    if (!ownerTransfers) {
      throw new Error("Owner transfers not found.");
    }

    let sentTrasfer:TokenTransfer | undefined
    let receivedTrasfer:TokenTransfer | undefined

    if (ownerTransfers.length === 1) {
      console.log('Strategy 1')
      const ownerTransferChangeType = ownerTransfers[0].changeType
      const searchedTransferType = ownerTransferChangeType === TOKEN_TRANSFER_CHANGE_TYPE.INCREASE ? TOKEN_TRANSFER_CHANGE_TYPE.DECREASE : TOKEN_TRANSFER_CHANGE_TYPE.INCREASE
      const ownerInteraction = transfers.find(t => t.mint === ownerTransfers[0].mint && t.changeType === searchedTransferType)
      
        if (ownerInteraction && ownerTransferChangeType === TOKEN_TRANSFER_CHANGE_TYPE.INCREASE) {
          receivedTrasfer = ownerInteraction
        } else {
          sentTrasfer = ownerInteraction
        }

        if (sentTrasfer) {
          receivedTrasfer = transfers.find(t => t.owner === sentTrasfer?.owner && t.changeType === ownerTransferChangeType)
        } else if (receivedTrasfer) {
          sentTrasfer = transfers.find(t => t.owner === receivedTrasfer?.owner && t.changeType === ownerTransferChangeType)
        }
    } else {
      console.log('Strategy 2')
      sentTrasfer = ownerTransfers.find(t => t.changeType === TOKEN_TRANSFER_CHANGE_TYPE.DECREASE)
      receivedTrasfer = ownerTransfers.find(t => t.changeType === TOKEN_TRANSFER_CHANGE_TYPE.INCREASE)
    }

    return {
      sent: sentTrasfer,
      received: receivedTrasfer
    }
  }

  async tokenTransfersBySignature(signature: string, walletId?: PublicKey): Promise<any> {
 
      const transaction = await this.transactionDetailsBySignature(signature);
      if (!transaction || !transaction.meta) {
      console.log("Transaction or metadata not found.");
        return [];
      }

      const transfers = this.extractTokenTransfers(transaction.meta, walletId);
      const { sent, received } = this.parseOwnerTransfers(transfers)
      // const { sent: sentInstruction, received: receivedInstruction } = this.parseInstructionsInOutAmount(transaction)


    const sentTokenData = sent ? await this.getTokenDetails(new PublicKey(sent.mint)) : undefined
    const receivedTokenData = received ? await this.getTokenDetails(new PublicKey(received.mint)) : undefined


    return {
      signature,
      sent: formatTransfer(sent, sentTokenData),
      received: formatTransfer(received, receivedTokenData),
      transfers,
    }
  }

  private extractTokenTransfers(meta: ParsedTransactionMeta, walletId?: PublicKey): TokenTransfer[] {
  
    const walletIdBase58 = walletId?.toBase58();
    const transfers = [];
    if (!meta.postTokenBalances || !meta.preTokenBalances) {
      console.log("Token balances not found.");
      return [];
    }

    for (let i = 0; i < meta.postTokenBalances.length; i++) {
      const post = meta.postTokenBalances[i];
      const pre = meta.preTokenBalances?.find(b => b.accountIndex === post.accountIndex);
      if (pre?.uiTokenAmount.uiAmount !== post.uiTokenAmount.uiAmount) {
        const changeAmount = (post.uiTokenAmount.uiAmount ?? 0) - (pre?.uiTokenAmount.uiAmount ?? 0)
        const changeType = changeAmount < 0 ? TOKEN_TRANSFER_CHANGE_TYPE.DECREASE : (changeAmount > 0 ? TOKEN_TRANSFER_CHANGE_TYPE.INCREASE : TOKEN_TRANSFER_CHANGE_TYPE.UNCHANGED)


        transfers.push({
          mint: post.mint,
          owner: post.owner ?? '',
          preBalance: pre?.uiTokenAmount.uiAmount ?? 0,
          postBalance: post.uiTokenAmount.uiAmount ?? 0,
          amountChange: changeAmount,
          changeType,
          decimals: post.uiTokenAmount.decimals,
          isOwner: post.owner === walletIdBase58
        })
      }
    }


    return transfers;
  }

  async tokenAndSolBalanceBySignature(signature: string) {
    // const getTokenAccountBalance = await this.connection.getTokenAccountBalance(mint);
    const transaction = await this.transactionDetailsBySignature(signature);
    if (!transaction || !transaction.meta) {
      throw new Error("Transaction or metadata not found.");
      }
   const instruction = this.parseInstructionsInOutAmount(transaction)
    return instruction
  }
}

  // Export an instance of the TransactionsService class
  export default new TransactionsService();

