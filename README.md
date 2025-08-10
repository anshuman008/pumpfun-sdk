# latest-pumpfun-sdk

A TypeScript SDK for interacting with the PumpFun protocol on Solana.

## Installation

```sh
npm install latest-pumpfun-sdk
```

## Usage

### Setup

```ts
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { getSolFromToken, PumpFunSDK } from "latest-pumpfun-sdk";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { BN } from "bn.js";

const connection = new Connection(
  "https://mainnet.helius-rpc.com/?api-key=",
  "confirmed"
);

const creatorKeypair = Keypair.fromSecretKey(
  bs58.decode(
    process.env.WALLET_A_PRIVATE_KEY || "your-private-key-here"
  )
);

const sdk = new PumpFunSDK(connection);
```

### Create and Buy a Token (Recommended)

The `createAndBuy` instruction allows you to create a new token and immediately buy it in a single transaction:

```ts
const createAndBuy = async (
  name: string,
  symbol: string,
  uri: string,
  solAmount: number
) => {
  try {
    const globalData = await sdk.fetchGlobal();
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    let initialVirtualTokenReserves = new BN(1_073_000_000_000_000);
    let initialVirtualSolReserves = new BN(30_000_000_000);
    let initialRealTokenReserves = new BN(793_100_000_000_000);
    let initialRealSolReserves = new BN(0);
    let tokenTotalSupply = new BN(1_000_000_000_000_000);

    const bondingCurve = {
      creator: creatorKeypair.publicKey,
      virtualTokenReserves: initialVirtualTokenReserves,
      virtualSolReserves: initialVirtualSolReserves,
      realTokenReserves: initialRealTokenReserves,
      realSolReserves: initialRealSolReserves,
      tokenTotalSupply: tokenTotalSupply,
      complete: false,
    };

    const buyAmountSOL = 0.01;
    console.log(
      "💰 Final pump.fun dev buy amount being used:",
      buyAmountSOL,
      "SOL"
    );

    const buyAmount = sdk.getTokenAmount(bondingCurve, buyAmountSOL);

    const createInstructions = await sdk.createAndBuy(
      globalData,
      mintKeypair.publicKey,
      name,
      symbol,
      uri,
      creatorKeypair.publicKey,
      creatorKeypair.publicKey,
      buyAmount,
      new BN(buyAmountSOL * LAMPORTS_PER_SOL)
    );

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");

    const messageV0 = new TransactionMessage({
      payerKey: creatorKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 400_000,
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 5_000_000,
        }),
        ...createInstructions,
      ],
    }).compileToV0Message();

    const txMain = new VersionedTransaction(messageV0);
    txMain.sign([mintKeypair, creatorKeypair]);

    const simulateResult = await connection.simulateTransaction(txMain, {
      commitment: "confirmed",
      replaceRecentBlockhash: true,
    });

    if (simulateResult.value.err) {
      console.error("❌ Simulation failed:", simulateResult.value.err);
      console.error("Logs:", simulateResult.value.logs);
      return null;
    }

    console.log("✅ Simulation successful!");
    console.log("📋 Logs:", simulateResult.value.logs?.slice(-5));

    const signature = await connection.sendTransaction(txMain, {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      maxRetries: 2,
    });

    console.log(`🔗 Transaction: https://solscan.io/tx/${signature}`);
    console.log(
      "\n🤖 Axiom Trade:",
      `https://axiom.trade/t/${mintKeypair.publicKey.toBase58()}\n`
    );

    return mint.toBase58();
  } catch (error) {
    console.error("❌ PumpFun creation error:", error);
    return null;
  }
};

// Example usage
await createAndBuy(
  "Tired",
  "TIDI",
  "https://ipfs.io/ipfs/bafkreicykqvqcw2s4als72b4qndvgy5pz7kp3m3tl24u5cpi6sqvdry4nq",
  0.01
);
```

### Create a Token (Legacy Method)

```ts
const tokenMint = Keypair.generate();
const tx3 = await sdk.getCreateTxs(
  tokenMint.publicKey,
  "PUMP SDK",
  "PSDK",
  "https://ipfs.io/ipfs/QmNwbGHa81nQAygoH5LWQU2KTrzqHQRSpUkAUgn7R9gzAv",
  signer.publicKey,
  signer.publicKey
);

if (tx3.success) {
  const transection = new Transaction().add(tx3.data);
  const latestBlockhash = await connection.getLatestBlockhash();
  transection.recentBlockhash = latestBlockhash.blockhash;
  transection.feePayer = signer.publicKey;

  const simulatedTx = await connection.simulateTransaction(transection);
  console.log("Simulation Result:", simulatedTx);

  const signature = await connection.sendTransaction(transection, [signer, tokenMint]);
  console.log("Transaction Signature:", signature);
  const confirmation = await connection.confirmTransaction(signature, "confirmed");
}
```

### Buy a Token

```ts
const buyToken = async (signer: Keypair, mint: PublicKey, solAmount: number) => {
  const bonding_curve_data = await sdk.fetchBondingCurve(mint);
  const tokenAmount = sdk.getTokenAmount(bonding_curve_data, solAmount);

  console.log("here is the token amount---", tokenAmount);

  const global = await sdk.fetchGlobal();

  const tx1 = await sdk.getBuyTxs(
    global,
    mint,
    signer.publicKey,
    100,
    new BN(tokenAmount),
    new BN(solAmount * LAMPORTS_PER_SOL)
  );

  if (tx1.success) {
    const transection = new Transaction().add(...tx1.data);
    const latestBlockhash = await connection.getLatestBlockhash();
    transection.recentBlockhash = latestBlockhash.blockhash;
    transection.feePayer = signer.publicKey;

    const simulatedTx = await connection.simulateTransaction(transection);
    console.log("Simulation Result:", simulatedTx);
  }
};

// Example usage
buyToken(creatorKeypair, new PublicKey("CHdrZKYM8qHE4zig4dK2oiNpi2kzENV6FmsbzxzHLBXW"), 0.01);
```

### Sell a Token

```ts
const sellToken = async (signer: Keypair, mint: PublicKey, tokenAmount: number) => {
  const global = await sdk.fetchGlobal();
  const bondingCurve = await sdk.fetchBondingCurve(mint);
  const solAmount = getSolFromToken(
    global,
    bondingCurve,
    new BN(tokenAmount * 1000000)
  );

  console.log("here is the sol amount: ", Number(solAmount) / LAMPORTS_PER_SOL);

  const tx2 = await sdk.getSellTxs(
    mint,
    signer.publicKey,
    10,
    new BN(tokenAmount * 1000000),
    solAmount
  );

  if (tx2.success) {
    const transection = new Transaction().add(...tx2.data);
    const latestBlockhash = await connection.getLatestBlockhash();
    transection.recentBlockhash = latestBlockhash.blockhash;
    transection.feePayer = creatorKeypair.publicKey;
    transection.sign(creatorKeypair);

    const simulatedTx = await connection.simulateTransaction(transection);
    console.log("Simulation Result:", simulatedTx);
  }
};

// Example usage
sellToken(creatorKeypair, new PublicKey("CHdrZKYM8qHE4zig4dK2oiNpi2kzENV6FmsbzxzHLBXW"), 357547.48317);
```

## License

MIT 