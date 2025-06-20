# latest-pumpfun-sdk

A TypeScript SDK for interacting with the PumpFun protocol on Solana.

## Installation

```sh
npm install latest-pumpfun-sdk
```

## Usage

### Setup

```ts
import { Connection, Keypair, PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PumpFunSDK } from "latest-pumpfun-sdk";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import BN from "bn.js";

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
const signer = Keypair.fromSecretKey(
  bs58.decode(process.env.PRIVATE_KEY || "")
);
```

### Create a Token

```ts
const sdk = new PumpFunSDK(connection);
const tokenMint = Keypair.generate();
const tx = await sdk.getCreatetxs(
  tokenMint.publicKey,
  "PUMP SDK",
  "PSDK",
  "https://ipfs.io/ipfs/QmNwbGHa81nQAygoH5LWQU2KTrzqHQRSpUkAUgn7R9gzAv",
  signer.publicKey,
  signer.publicKey
);

const transaction = new Transaction().add(tx);
const latestBlockhash = await connection.getLatestBlockhash();
transaction.recentBlockhash = latestBlockhash.blockhash;
transaction.feePayer = signer.publicKey;

const simulatedTx = await connection.simulateTransaction(transaction);
console.log("Simulation Result:", simulatedTx);
```

### Buy a Token

```ts
const mint = new PublicKey("6oyodsxBXqdjsvgY2VrxrXx1G4tiqKoZExYNoUgRpump");
const bonding_curvePda = sdk.bondingCurvePda(mint);
const bondingCurveAccountInfo = await connection.getAccountInfo(bonding_curvePda);
const bonding_curve_data = await sdk.fetchBondingCurve(mint);
const txs = await sdk.getBuytxs(
  mint,
  signer.publicKey,
  bondingCurveAccountInfo,
  bonding_curve_data.creator,
  10,
  bonding_curve_data,
  new BN(343325 * 1000000),
  new BN(0.1 * LAMPORTS_PER_SOL)
);

const transaction = new Transaction().add(...txs);
const latestBlockhash = await connection.getLatestBlockhash();
transaction.recentBlockhash = latestBlockhash.blockhash;
transaction.feePayer = signer.publicKey;

const simulatedTx = await connection.simulateTransaction(transaction);
console.log("Simulation Result:", simulatedTx);
```

### Sell a Token

```ts
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const userAta = getAssociatedTokenAddressSync(mint, signer.publicKey, true);
const tokenAccountInfo = await connection.getTokenAccountBalance(userAta);
const txs = await sdk.getSelltxs(
  mint,
  signer.publicKey,
  10,
  new BN(tokenAccountInfo.value.amount),
  new BN(-1)
);

const transaction = new Transaction().add(...txs);
const latestBlockhash = await connection.getLatestBlockhash();
transaction.recentBlockhash = latestBlockhash.blockhash;
transaction.feePayer = signer.publicKey;

const simulatedTx = await connection.simulateTransaction(transaction);
console.log("Simulation Result:", simulatedTx);
```

## License

MIT 