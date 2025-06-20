import pumpIdl from "./IDL/pump.json";
import { Pump } from "./IDL/pump";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { AccountInfo, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { bondingCurvePda, creatorVaultPda, globalPda } from "./pda";
import { BondingCurve, Global } from "./types";
import {  createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import dotenv from "dotenv";
export const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
);
export const PUMP_AMM_PROGRAM_ID = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
);


dotenv.config();

type PublicKeyData = {};
type PublicKeyInitData = number | string | Uint8Array | Array<number> | PublicKeyData;

export class PumpFunSDK {
  private program: anchor.Program<Pump>;

  constructor(connection: Connection) {
    const keypair = Keypair.generate();
    const wallet = new anchor.Wallet(keypair);
    const provider = new anchor.AnchorProvider(connection, wallet);

    
    const pumpProgram = new anchor.Program<Pump>(pumpIdl as Pump, provider);
    this.program = pumpProgram;
  }

  async getBuytxs(mint:PublicKey,user:PublicKey,
        bondingCurveAccountInfo: AccountInfo<Buffer> | null,
        newCoinCreator: PublicKey,
        slippage: number,
        bondingCurve: BondingCurve,
        amount: BN,
        solAmount: BN,
  ): Promise<TransactionInstruction[]> {
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

    const globalPda = this.globalPda();
    const globalData = await this.program.account.global.fetch(globalPda);
    const feeWallet = getFeeRecipient(globalData);

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

  async getSelltxs(mint:PublicKey,user:PublicKey,
        slippage: number,
        amount: BN,
        solAmount: BN,
  ): Promise<TransactionInstruction[]> {
   const instructions:TransactionInstruction[] = [];
   const associatedUser = getAssociatedTokenAddressSync(mint,user,true);

    const globalPda = this.globalPda();
    const globalData = await this.program.account.global.fetch(globalPda);
    const feeWallet = getFeeRecipient(globalData);

         instructions.push(
          await this.program.methods
            .sell(
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
            })
            .instruction(),
        );

        return instructions;
  }

  async getCreatetxs(
    mint: PublicKey,
    name: string,
    symbol: string,
    uri: string,
    creator: PublicKey,
    user: PublicKey,
  ):Promise<TransactionInstruction> {
     return await this.program.methods
     .create(
        name,
        symbol,
        uri,
        creator
     ).accountsPartial({
        mint,
        user
     }).instruction();
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

    async fetchBondingCurve(mint: PublicKeyInitData): Promise<BondingCurve> {
    return await this.program.account.bondingCurve.fetch(
      this.bondingCurvePda(mint as PublicKey),
    );
  }


}


function getFeeRecipient(global: Global): PublicKey {
  const feeRecipients = [global.feeRecipient, ...global.feeRecipients];
  return feeRecipients[Math.floor(Math.random() * feeRecipients.length)];
}




