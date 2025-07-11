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
    const tx3 = await sdk.getCreateTxs(tokenMint.publicKey,"PUMP SDK","PSDK","https://ipfs.io/ipfs/QmNwbGHa81nQAygoH5LWQU2KTrzqHQRSpUkAUgn7R9gzAv",signer.publicKey,signer.publicKey)

    if(tx3.success){
    const transection = new Transaction().add(tx3.data);
    const latestBlockhash = await connection.getLatestBlockhash();
    transection.recentBlockhash = latestBlockhash.blockhash;
    transection.feePayer = signer.publicKey;

    const simulatedTx = await connection.simulateTransaction(transection);
    console.log("Simulation Result:", simulatedTx);

    const signature = await connection.sendTransaction(transection, [signer,tokenMint]);
    console.log("Transaction Signature:", signature);
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    }
```

### Buy a Token

```ts
    const sdk = new PumpFunSDK(connection);
    const mint = new PublicKey("6oyodsxBXqdjsvgY2VrxrXx1G4tiqKoZExYNoUgRpump");
    const bonding_curve_data = await sdk.fetchBondingCurve(mint);
    const solAmount = 0.2;
    const tokenAmount = sdk.getTokenAmount(bonding_curve_data,solAmount);

    const tx1 = await sdk.getBuyTxs(mint,signer.publicKey,100, new BN(tokenAmount),new BN(solAmount*LAMPORTS_PER_SOL) );
    
    if(tx1.success){
    const transection = new Transaction().add(...tx1.data);
    const latestBlockhash = await connection.getLatestBlockhash();
    transection.recentBlockhash = latestBlockhash.blockhash;
    transection.feePayer = signer.publicKey;

    const simulatedTx = await connection.simulateTransaction(transection);
    console.log("Simulation Result:", simulatedTx);

   // confirm transaction
    const signature = await connection.sendTransaction(transection, [signer]);

    console.log("Transaction Signature:", signature);
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    console.log("Transaction Confirmation:", confirmation);
    }
```

### Sell a Token

```ts
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

    const mint = new PublicKey("6oyodsxBXqdjsvgY2VrxrXx1G4tiqKoZExYNoUgRpump");
    const sdk = new PumpFunSDK(connection);
    const userAta = getAssociatedTokenAddressSync(mint, signer.publicKey, true);

    console.log("User ATA:", userAta.toBase58());

    const tokenAccountInfo = await connection.getTokenAccountBalance(userAta);
    if (!tokenAccountInfo) {
        console.error("User ATA account not found");
        return;
    }

    console.log("User Token Hoding amount:", tokenAccountInfo.value.uiAmount);
    const tx2 = await sdk.getSellTxs(mint,signer.publicKey,10,new BN(tokenAccountInfo.value.amount),new BN(-1));

    if(tx2.success){
    const transection = new Transaction().add(...tx2.data);
    const latestBlockhash = await connection.getLatestBlockhash();
    transection.recentBlockhash = latestBlockhash.blockhash;
    transection.feePayer = signer.publicKey;

    const simulatedTx = await connection.simulateTransaction(transection);
    console.log("Simulation Result:", simulatedTx);

    const signature = await connection.sendTransaction(transection, [signer]);

    console.log("Transaction Signature:", signature);
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    console.log("Transaction Confirmation:", confirmation);
    }
```

## License

MIT 