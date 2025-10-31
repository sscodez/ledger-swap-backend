"use strict";
// import express from 'express';
// // import { EscrowService } from '../services/escrowService';
// const app = express();
// app.use(express.json());
// app.post("/escrow/create/:chain", async (req, res) => {
//   try { res.json(await EscrowService.create(req.params.chain, req.body)); }
//   catch(e:any){ res.status(500).json({ error: e.message }) }
// });
// app.post("/escrow/release/:chain", async (req, res) => {
//   try { res.json(await EscrowService.release(req.params.chain, req.body)); }
//   catch(e:any){ res.status(500).json({ error: e.message }) }
// });
// app.post("/escrow/refund/:chain", async (req, res) => {
//   try { res.json(await EscrowService.refund(req.params.chain, req.body)); }
//   catch(e:any){ res.status(500).json({ error: e.message }) }
// });
// app.listen(3000, () => console.log("✅ Multi-Chain Escrow API Running"));
