"use strict";
// // chains/xdc.ts
// import Web3 from "web3";
// import abi from "./abi/XDCEscrow.json";
// const web3 = new Web3("https://rpc.xinfin.network");
// const contract = new web3.eth.Contract(abi, process.env.XDC_ESCROW_ADDR);
// // chains/iota.ts
// // Contract Address after deployment
// const ESCROW_ADDR = process.env.IOTA_ESCROW_ADDR;
// const contract = new web3.eth.Contract(abi, ESCROW_ADDR);
// // --- SELLER LOCKS FUNDS ---
// export async function iotaLockSeller({ escrowId, sellerWallet, privateKey, amount }:any) {
//   const tx = contract.methods.lockSeller(escrowId);
//   const gas = await tx.estimateGas({ from: sellerWallet, value: web3.utils.toWei(amount, "ether") });
//   const signed = await web3.eth.accounts.signTransaction({
//     to: ESCROW_ADDR,
//     data: tx.encodeABI(),
//     gas,
//     value: web3.utils.toWei(amount, "ether")
//   }, privateKey);
//   return await web3.eth.sendSignedTransaction(signed.rawTransaction);
// }
// // --- BUYER LOCKS MATCHING FUNDS ---
// export async function iotaLockBuyer({ escrowId, buyerWallet, privateKey, amount }:any) {
//   const tx = contract.methods.lockBuyer(escrowId);
//   const gas = await tx.estimateGas({ from: buyerWallet, value: web3.utils.toWei(amount, "ether") });
//   const signed = await web3.eth.accounts.signTransaction({
//     to: ESCROW_ADDR,
//     data: tx.encodeABI(),
//     gas,
//     value: web3.utils.toWei(amount, "ether")
//   }, privateKey);
//   return await web3.eth.sendSignedTransaction(signed.rawTransaction);
// }
// // --- RELEASE ESCROW ---
// export async function iotaRelease({ escrowId, wallet, privateKey }:any) {
//   const tx = contract.methods.release(escrowId);
//   const gas = await tx.estimateGas({ from: wallet });
//   const signed = await web3.eth.accounts.signTransaction({
//     to: ESCROW_ADDR,
//     data: tx.encodeABI(),
//     gas
//   }, privateKey);
//   return await web3.eth.sendSignedTransaction(signed.rawTransaction);
// }
