"use strict";
// // chains/btc.ts
// import * as bitcoin from "bitcoinjs-lib";
// import * as ecc from "tiny-secp256k1";
// bitcoin.initEccLib(ecc);
// export function btcLock({ sellerPubKey, buyerPubKey, amountSats, lockTime }:any) {
//   const redeemScript = bitcoin.script.fromASM(`
//       OP_IF
//           ${buyerPubKey.toString("hex")} OP_CHECKSIG
//       OP_ELSE
//           ${lockTime} OP_CHECKLOCKTIMEVERIFY OP_DROP
//           ${sellerPubKey.toString("hex")} OP_CHECKSIG
//       OP_ENDIF
//   `);
//   const p2sh = bitcoin.payments.p2sh({
//     redeem: { output: redeemScript }
//   });
//   return {
//     address: p2sh.address,
//     redeemScript: redeemScript.toString("hex")
//   };
// }
// export function btcRelease({ psbtBase64, signer }:any) {
//   let psbt = bitcoin.Psbt.fromBase64(psbtBase64);
//   psbt.signAllInputs(signer);
//   psbt.finalizeAllInputs();
//   return psbt.extractTransaction().toHex();
// }
