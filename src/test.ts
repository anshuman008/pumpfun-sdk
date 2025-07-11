import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { PumpFunSDK } from "./sdk";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";


const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
const signer = Keypair.fromSecretKey(
    bs58.decode(process.env.PRIVATE_KEY || "")
  );



const createToken = async() =>{
    const sdk = new PumpFunSDK(connection);

    const tokenMint = Keypair.generate();
    const tx3 = await sdk.getCreatetxs(tokenMint.publicKey,"PUMP SDK","PSDK","https://ipfs.io/ipfs/QmNwbGHa81nQAygoH5LWQU2KTrzqHQRSpUkAUgn7R9gzAv",signer.publicKey,signer.publicKey)

    console.log("Transaction Instructions:", tx3);

    const transection = new Transaction().add(tx3);
    const latestBlockhash = await connection.getLatestBlockhash();
    transection.recentBlockhash = latestBlockhash.blockhash;
    transection.feePayer = signer.publicKey;

    const simulatedTx = await connection.simulateTransaction(transection);
    console.log("Simulation Result:", simulatedTx);

    // const signature = await connection.sendTransaction(transection, [signer]);

    // console.log("Transaction Signature:", signature);
    // const confirmation = await connection.confirmTransaction(signature, "confirmed");
    // console.log("Transaction Confirmation:", confirmation);
}


const buyToken = async() =>{
    const sdk = new PumpFunSDK(connection);


    const mint = new PublicKey("6oyodsxBXqdjsvgY2VrxrXx1G4tiqKoZExYNoUgRpump");

    const tx1 = await sdk.getBuytxs(mint,signer.publicKey,10, new BN(343325*1000000), new BN(0.1 * LAMPORTS_PER_SOL));

    
    //@ts-ignore
    const transection = new Transaction().add(...tx1);
    const latestBlockhash = await connection.getLatestBlockhash();
    transection.recentBlockhash = latestBlockhash.blockhash;
    transection.feePayer = signer.publicKey;

    const simulatedTx = await connection.simulateTransaction(transection);
    console.log("Simulation Result:", simulatedTx);

    // const signature = await connection.sendTransaction(transection, [signer]);

    // console.log("Transaction Signature:", signature);
    // const confirmation = await connection.confirmTransaction(signature, "confirmed");
    // console.log("Transaction Confirmation:", confirmation);

}



const sellToken = async () => {

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
    const tx2 = await sdk.getSelltxs(mint,signer.publicKey,10,new BN(tokenAccountInfo.value.amount),new BN(-1));

    const transection = new Transaction().add(...tx2);
    const latestBlockhash = await connection.getLatestBlockhash();
    transection.recentBlockhash = latestBlockhash.blockhash;
    transection.feePayer = signer.publicKey;

    const simulatedTx = await connection.simulateTransaction(transection);
    console.log("Simulation Result:", simulatedTx);

    // const signature = await connection.sendTransaction(transection, [signer]);

    // console.log("Transaction Signature:", signature);
    // const confirmation = await connection.confirmTransaction(signature, "confirmed");
    // console.log("Transaction Confirmation:", confirmation);

};


// createToken();
buyToken();
// sellToken()