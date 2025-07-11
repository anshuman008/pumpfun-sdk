import pumpIdl from "./IDL/pump.json";
import { Pump } from "./IDL/pump";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { AccountInfo, clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { bondingCurvePda, creatorVaultPda, globalPda } from "./pda";
import { BondingCurve, Global } from "./types";
import {  createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import dotenv from "dotenv";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
export const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
);
export const PUMP_AMM_PROGRAM_ID = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
);


dotenv.config();

type PublicKeyData = {};
type PublicKeyInitData = number | string | Uint8Array | Array<number> | PublicKeyData;
type Error = {};


export enum PumpFunErrorType {
  BONDING_CURVE_NOT_FOUND = "BONDING_CURVE_NOT_FOUND",
  GLOBAL_DATA_NOT_FOUND = "GLOBAL_DATA_NOT_FOUND",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_PARAMETERS = "INVALID_PARAMETERS",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

export interface PumpFunError {
  type: PumpFunErrorType;
  message: string;
  details?: any;
}

export type PumpFunResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: PumpFunError;
};


export class PumpFunSDK {
  private program: anchor.Program<Pump>;

  constructor(connection: Connection) {
    const keypair = Keypair.generate();
    const wallet = new anchor.Wallet(keypair);
    const provider = new anchor.AnchorProvider(connection, wallet);

    
    const pumpProgram = new anchor.Program<Pump>(pumpIdl as Pump, provider);
    this.program = pumpProgram;
  }

  async getBuyTxs(mint:PublicKey,user:PublicKey,
        slippage: number,
        amount: BN,
        solAmount: BN,
  ): Promise<PumpFunResult<TransactionInstruction[]>>  {

   try{


      if (!mint || !user || !amount || !solAmount) {
        return {
          success: false,
          error: {
            type: PumpFunErrorType.INVALID_PARAMETERS,
            message: "Invalid parameters provided",
            details: { mint, user, amount, solAmount }
          }
        };
      }


       if (slippage < 0 ) {
        return {
          success: false,
          error: {
            type: PumpFunErrorType.INVALID_PARAMETERS,
            message: "Slippage canot be in negative",
            details: { slippage }
          }
        };
      }


    const bonding_curvePda =  this.bondingCurvePda(mint);

    console.log("Bonding Curve PDA:", bonding_curvePda.toBase58());
    const bondingCurveAccountInfo = await this.program.provider.connection.getAccountInfo(bonding_curvePda);


   if (!bondingCurveAccountInfo) {
        return {
          success: false,
          error: {
            type: PumpFunErrorType.BONDING_CURVE_NOT_FOUND,
            message: "Bonding Curve account not found for this token",
            details: { mint: mint.toBase58(), bondingCurvePda: bonding_curvePda.toBase58() }
          }
        };
      }

   const bonding_curve_data = await this.fetchBondingCurve(mint);
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
                  ? bonding_curve_data.creator
                  : bonding_curve_data.creator,
              ),
            })
            .instruction(),
        );

      return {
        success: true,
        data: instructions
      };

   }
   catch(error){
    console.error("Error in getBuyTxs:", error);
      return {
        success: false,
        error: {
          type: PumpFunErrorType.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : "An unknown error occurred",
          details: error
        }
      };
   }

  }

  async getSellTxs(mint:PublicKey,user:PublicKey,
        slippage: number,
        amount: BN,
        solAmount: BN,
  ):  Promise<PumpFunResult<TransactionInstruction[]>> {

    try{
       if (!mint || !user || !amount || !solAmount) {
        return {
          success: false,
          error: {
            type: PumpFunErrorType.INVALID_PARAMETERS,
            message: "Invalid parameters provided",
            details: { mint, user, amount, solAmount }
          }
        };
      }


       if (slippage < 0 ) {
        return {
          success: false,
          error: {
            type: PumpFunErrorType.INVALID_PARAMETERS,
            message: "Slippage cant be in negative",
            details: { slippage }
          }
        };
      }

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

        return {
        success: true,
        data: instructions
      };
    }
    catch(error){
     console.error("Error in getSellTxs:", error);
      return {
        success: false,
        error: {
          type: PumpFunErrorType.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : "An unknown error occurred",
          details: error
        }
      };

    }


  }

  async getCreateTxs(
    mint: PublicKey,
    name: string,
    symbol: string,
    uri: string,
    creator: PublicKey,
    user: PublicKey,
  ): Promise<PumpFunResult<TransactionInstruction>> {
    
    try{

      if (!mint || !name || !symbol || !uri || !creator || !user) {
        return {
          success: false,
          error: {
            type: PumpFunErrorType.INVALID_PARAMETERS,
            message: "Invalid parameters provided for token creation",
            details: { mint, name, symbol, uri, creator, user }
          }
        };
      }


      const createInstruction = await this.program.methods
     .create(
        name,
        symbol,
        uri,
        creator
     ).accountsPartial({
        mint,
        user
     }).instruction();


      return {
        success: true,
        data: createInstruction
      };
    }
    catch(error){
    console.error("Error in getCreateTxs:", error);
      return {
        success: false,
        error: {
          type: PumpFunErrorType.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : "An unknown error occurred",
          details: error
        }
      };
    }
  }

  
  async createAndBuy(
    mint: PublicKey,
    name: string,
    symbol: string,
    uri: string,
    creator: PublicKey,
    user: PublicKey,
    amount: BN,
    solAmount: BN,
  ){

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





