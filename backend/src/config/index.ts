import { Connection } from '@solana/web3.js';

const RPC_URL:string = process.env.RPC_URL!;
const WSS_URL:string = process.env.WSS_URL!;
export const SOLSCAN_URL:string = process.env.SOLSCAN_URL!;

export const rpcConnection = new Connection(RPC_URL, {
  commitment: 'confirmed',
    wsEndpoint: WSS_URL,
});


