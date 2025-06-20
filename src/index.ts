import pumpIdl from "./IDL/pump.json";
import { Pump } from "./IDL/pump";
import * as anchor from "@coral-xyz/anchor";

import { AccountInfo, clusterApiUrl, Connection, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { bondingCurvePda, creatorVaultPda, globalPda } from "./pda";
import { Global } from "./types";
import { createAssociatedTokenAccountIdempotent, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";

export const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
);
export const PUMP_AMM_PROGRAM_ID = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
);


class PumpFunSDK {
  private program: anchor.Program<Pump>;

  constructor(connection: Connection) {
    const keypair = Keypair.generate();
    const wallet = new anchor.Wallet(keypair);
    const provider = new anchor.AnchorProvider(connection, wallet);

    
    const pumpProgram = new anchor.Program<Pump>(pumpIdl as Pump, provider);
    this.program = pumpProgram;
  }

  // Add methods to interact with the Pump program here
  async getBuytxs(mint:PublicKey,user:PublicKey,
        bondingCurveAccountInfo: AccountInfo<Buffer> | null,
        newCoinCreator: PublicKey,
        slippage: number = 0.1,
  ) {
   const instructions:TransactionInstruction[] = [];
   const associatedUser = getAssociatedTokenAddressSync(mint,user,true);

   const userTokenAccount = await this.program.provider.connection.getAccountInfo(associatedUser);

   if(!userTokenAccount){
    instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
            user,
            associatedUser,
            user,
            mint
        )
    )
   };


    const global = this.program.account.global;
    const globalPda = this.globalPda();
    const globalData = await global.fetch(globalPda);
    const feeWallet = getFeeRecipient(globalData);
    const mintadd = mint;
    const bondigCurve = this.bondingCurvePda(mintadd);
    const bondigCurveAta = getAssociatedTokenAddressSync(mintadd,bondigCurve); 


    const amount = 1000000; // Example amount, replace with actual logic
    const feeBasisPoints = globalData.feeBasisPoints;

         instructions.push(
          await this.program.methods
            .buy(
              amount,
              solAmount.add(
                solAmount
                  .mul(new BN(Math.floor(slippage * 10)))
                  .div(new BN(1000)),
              ),
            )
            .accountsPartial({
              feeRecipient: feeWallet,
              mint,
              associatedUser,
              user,
              creatorVault: this.creatorVaultPda(
                bondingCurveAccountInfo === null
                  ? newCoinCreator
                  : bondingCurve.creator,
              ),
            })
            .instruction(),
        );

        return instructions;
 
  }


   globalPda() {
    return globalPda(this.program.programId);
  }

    bondingCurvePda(mint: PublicKey | string): PublicKey {
    return bondingCurvePda(this.program.programId, mint);
  }


   creatorVaultPda(creator: PublicKey) {
    return creatorVaultPda(this.program.programId, creator);
  }

  async fetchGlobal(): Promise<any> {
    return await this.program.account.global.fetch(
      this.globalPda(),
    );
  }


}


function getFeeRecipient(global: Global): PublicKey {
  const feeRecipients = [global.feeRecipient, ...global.feeRecipients];
  return feeRecipients[Math.floor(Math.random() * feeRecipients.length)];
}


(async () => {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const sdk = new PumpFunSDK(connection);

    sdk.getBuytxs();
})();
