import { SOLSCAN_URL } from '../config';
import { TokenTransfer, TokenDetails } from '../services/interfaces';

const cleanString = (str: string) => {
    // Remove null bytes and trim whitespace
    return str.replace(/\0/g, '').trim();
  };

  const getSolscanTokenUrl = (mint:string) => {
    return `${SOLSCAN_URL}/token/${mint}`;
  }

  // const fromatedSentTransfer = {
  //   ...sent,
  //   amount: sent.amountChange,
  //   tokenData: sentTokenData
  // }

  //Create a function that will format transaction as shown above
  const formatTransfer = (transfer?: TokenTransfer, tokenData?: TokenDetails) => {
    return {
      amount: transfer?.amountChange,
      tokenData
    }
  }

export {
  cleanString,
  getSolscanTokenUrl,
  formatTransfer
}
