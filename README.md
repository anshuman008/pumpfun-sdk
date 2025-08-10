# 🚀 PumpFun SDK

[![npm version](https://img.shields.io/npm/v/latest-pumpfun-sdk.svg)](https://www.npmjs.com/package/latest-pumpfun-sdk)
[![npm downloads](https://img.shields.io/npm/dm/latest-pumpfun-sdk.svg)](https://www.npmjs.com/package/latest-pumpfun-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)

A comprehensive TypeScript SDK for interacting with the **PumpFun protocol** on Solana blockchain. Create, buy, sell, and manage tokens with ease using our battle-tested SDK.

## ✨ Features

- 🎯 **Create & Buy in One Transaction** - Launch tokens and buy them immediately
- 💰 **Advanced Bonding Curve Management** - Handle complex tokenomics with ease
- 🔄 **Seamless Trading Operations** - Buy and sell tokens with optimized transactions
- 🛡️ **Production Ready** - Built with TypeScript and comprehensive error handling
- ⚡ **High Performance** - Optimized for Solana's high-speed blockchain
- 🧪 **Built-in Testing** - Includes simulation and transaction validation
- 📱 **Cross-Platform** - Works on Node.js, React Native, and web browsers

## 📦 Installation

```bash
npm install latest-pumpfun-sdk
```

Or using yarn:

```bash
yarn add latest-pumpfun-sdk
```

## 🚀 Quick Start

```typescript
import { PumpFunSDK } from "latest-pumpfun-sdk";
import { Connection, Keypair } from "@solana/web3.js";

// Initialize connection
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY");
const sdk = new PumpFunSDK(connection);

// You're ready to use the SDK!
```

## 📚 API Reference

### Core Classes

#### `PumpFunSDK`
Main SDK class for interacting with the PumpFun protocol.

```typescript
class PumpFunSDK {
  constructor(connection: Connection)
  
  // Token Management
  createAndBuy(globalData, mint, name, symbol, uri, creator, authority, buyAmount, solAmount): Promise<Instruction[]>
  getCreateTxs(mint, name, symbol, uri, creator, authority): Promise<{success: boolean, data: Instruction[]}>
  
  // Trading Operations
  getBuyTxs(global, mint, buyer, slippage, tokenAmount, solAmount): Promise<{success: boolean, data: Instruction[]}>
  getSellTxs(mint, seller, slippage, tokenAmount, solAmount): Promise<{success: boolean, data: Instruction[]}>
  
  // Data Fetching
  fetchGlobal(): Promise<GlobalData>
  fetchBondingCurve(mint: PublicKey): Promise<BondingCurveData>
  
  // Utility Functions
  getTokenAmount(bondingCurve, solAmount): number
}
```

### Data Types

```typescript
interface BondingCurveData {
  creator: PublicKey;
  virtualTokenReserves: BN;
  virtualSolReserves: BN;
  realTokenReserves: BN;
  realSolReserves: BN;
  tokenTotalSupply: BN;
  complete: boolean;
}

interface GlobalData {
  // Global protocol configuration
}
```

## 💡 Usage Examples

### Setup & Configuration

```typescript
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

// Initialize connection (recommend using Helius for mainnet)
const connection = new Connection(
  "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY",
  "confirmed"
);

// Setup your wallet
const creatorKeypair = Keypair.fromSecretKey(
  bs58.decode(
    process.env.WALLET_A_PRIVATE_KEY || "your-private-key-here"
  )
);

// Initialize SDK
const sdk = new PumpFunSDK(connection);
```

### 🎯 Create and Buy a Token (Recommended)

The `createAndBuy` instruction allows you to create a new token and immediately buy it in a single transaction:

```typescript
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

    // Configure bonding curve parameters
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

    // Simulate transaction first
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

    // Send transaction
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

### 💰 Buy a Token

```typescript
const buyToken = async (signer: Keypair, mint: PublicKey, solAmount: number) => {
  const bonding_curve_data = await sdk.fetchBondingCurve(mint);
  const tokenAmount = sdk.getTokenAmount(bonding_curve_data, solAmount);

  console.log("💰 Token amount to receive:", tokenAmount);

  const global = await sdk.fetchGlobal();

  const tx1 = await sdk.getBuyTxs(
    global,
    mint,
    signer.publicKey,
    100, // Slippage tolerance (100 = 1%)
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

### 📉 Sell a Token

```typescript
const sellToken = async (signer: Keypair, mint: PublicKey, tokenAmount: number) => {
  const global = await sdk.fetchGlobal();
  const bondingCurve = await sdk.fetchBondingCurve(mint);
  const solAmount = getSolFromToken(
    global,
    bondingCurve,
    new BN(tokenAmount * 1000000)
  );

  console.log("💎 SOL amount to receive:", Number(solAmount) / LAMPORTS_PER_SOL);

  const tx2 = await sdk.getSellTxs(
    mint,
    signer.publicKey,
    10, // Slippage tolerance (10 = 0.1%)
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

### 🏗️ Create a Token (Legacy Method)

```typescript
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

## 🔧 Configuration

### Environment Variables

```bash
# Required
WALLET_A_PRIVATE_KEY=your_base58_encoded_private_key

# Optional
HELIUS_API_KEY=your_helius_api_key
RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

### RPC Endpoints

| Network | Endpoint | Description |
|---------|----------|-------------|
| Mainnet | `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY` | Production (Recommended) |
| Mainnet | `https://api.mainnet-beta.solana.com` | Solana RPC (Rate limited) |
| Devnet | `https://api.devnet.solana.com` | Development & Testing |

## 🧪 Testing & Development

### Prerequisites

- Node.js 16+ 
- TypeScript 5.8+
- Solana CLI tools

### Development Setup

```bash
# Clone repository
git clone <your-repo-url>
cd pumpfun-sdk

# Install dependencies
npm install

# Build project
npm run build

# Run tests (if available)
npm test
```

### Transaction Simulation

Always simulate transactions before sending them to mainnet:

```typescript
// Simulate transaction
const simulateResult = await connection.simulateTransaction(transaction);

if (simulateResult.value.err) {
  console.error("❌ Simulation failed:", simulateResult.value.err);
  return;
}

console.log("✅ Simulation successful!");
```

## 📊 Performance Tips

- **Use Helius RPC** for mainnet operations (better rate limits)
- **Set compute unit limits** for complex transactions
- **Simulate transactions** before sending to mainnet
- **Handle errors gracefully** with proper try-catch blocks
- **Use proper slippage tolerance** based on market conditions

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [📦 NPM Package](https://www.npmjs.com/package/latest-pumpfun-sdk)
- [🐙 GitHub Repository](https://github.com/yourusername/pumpfun-sdk)
- [📚 Documentation](https://docs.pumpfun.com)
- [💬 Discord Community](https://discord.gg/pumpfun)
- [🐦 Twitter](https://twitter.com/pumpfun)

## ⚠️ Disclaimer

This SDK is provided "as is" without warranty of any kind. Use at your own risk. Always test thoroughly on devnet before using on mainnet.

---

**Made with ❤️ by the PumpFun team** 