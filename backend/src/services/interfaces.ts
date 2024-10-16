import { ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
export interface TokenDetails {
    mint: string;
    url: string;
    name: string;
    symbol: string;
  }
  
export enum TOKEN_TRANSFER_CHANGE_TYPE {
    DECREASE = 'dec',
    INCREASE = 'inc',
    UNCHANGED = 'unchanged'
  }
  
export interface TokenTransfer {
    mint: string;
    owner: string;
    preBalance: number;
    postBalance: number;
    amountChange: number;
    decimals: number;
    isOwner: boolean;
    changeType: TOKEN_TRANSFER_CHANGE_TYPE;
  }
  
  export type ParsedInteraction = {
    sent?: TokenTransfer;
    received?: TokenTransfer;
  }

  export type InstructionWithParsedData = ParsedInstruction & {
    parsed: PartiallyDecodedInstruction;
  }
  
