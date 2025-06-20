import pumpIdl from "./IDL/pump.json";
import { Pump } from "./IDL/pump";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { AccountInfo, clusterApiUrl, Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { bondingCurvePda, creatorVaultPda, globalPda } from "./pda";
import { BondingCurve, Global } from "./types";
import {  createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";

export const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
);
export const PUMP_AMM_PROGRAM_ID = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
);

export const BONDING_CURVE_NEW_SIZE = 150;


type PublicKeyData = {};
type PublicKeyInitData = number | string | Uint8Array | Array<number> | PublicKeyData;

class PumpFunSDK {
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

  async sellInstructions(
    global: Global,
    bondingCurveAccountInfo: AccountInfo<Buffer> | null,
    mint: PublicKey,
    user: PublicKey,
    amount: BN,
    solAmount: BN,
    slippage: number,
  ): Promise<TransactionInstruction[]> {
    return this.withFixBondingCurve(
      mint,
      bondingCurveAccountInfo,
      user,
      async () => {
        return [
          await this.program.methods
            .sell(
              amount,
              solAmount.sub(
                solAmount
                  .mul(new BN(Math.floor(slippage * 10)))
                  .div(new BN(1000)),
              ),
            )
            .accountsPartial({
              feeRecipient: getFeeRecipient(global),
              mint,
              associatedUser: getAssociatedTokenAddressSync(mint, user, true),
              user,
            })
            .instruction(),
        ];
      },
    );
  }



    private async withFixBondingCurve(
    mint: PublicKey,
    bondingCurveAccountInfo: AccountInfo<Buffer> | null,
    user: PublicKey,
    block: () => Promise<TransactionInstruction[]>,
  ): Promise<TransactionInstruction[]> {
    if (
      bondingCurveAccountInfo === null ||
      bondingCurveAccountInfo.data.length < BONDING_CURVE_NEW_SIZE
    ) {
      return [
        await this.extendAccount(this.bondingCurvePda(mint), user),
        ...(await block()),
      ];
    }

    return await block();
  }

  async extendAccount(
    account: PublicKey,
    user: PublicKey,
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .extendAccount()
      .accountsPartial({
        account,
        user,
      })
      .instruction();
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


(async () => {
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const sdk = new PumpFunSDK(connection);


    const global = await sdk.fetchGlobal();
    const mint = new PublicKey("6oyodsxBXqdjsvgY2VrxrXx1G4tiqKoZExYNoUgRpump");
    const user = new PublicKey("C8Kerf9QEbVAefvkqFx7TNwfqcgjowc9hhP66dzrKqum");
    const bonding_curvePda =  sdk.bondingCurvePda(mint);

    console.log("Bonding Curve PDA:", bonding_curvePda.toBase58());
    const bondingCurveAccountInfo = await connection.getAccountInfo(bonding_curvePda);

    if (!bondingCurveAccountInfo) {
        console.error("Bonding Curve account not found");
        return;
    }

    const bonding_curve_data = await sdk.fetchBondingCurve(mint);
    // const tx1 = await sdk.getBuytxs(mint,user,bondingCurveAccountInfo,bonding_curve_data.creator,10,bonding_curve_data, new BN(25000*1000000), new BN(1000000));

    const tx2 = await sdk.sellInstructions(
        global,
        bondingCurveAccountInfo,
        mint,
        user,
        new BN(1000000),
        new BN(-1),
        10
    );

    console.log("Transaction Instructions:", tx2);

    const transection = new Transaction().add(...tx2);
    const latestBlockhash = await connection.getLatestBlockhash();
    transection.recentBlockhash = latestBlockhash.blockhash;
    transection.feePayer = user;

    const simulatedTx = await connection.simulateTransaction(transection);
    console.log("Simulation Result:", simulatedTx);
})();

