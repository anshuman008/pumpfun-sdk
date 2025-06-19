import pumpIdl from "./IDL/pump.json";
import { Pump } from "./IDL/pump";
import * as anchor from "@coral-xyz/anchor";

import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { bondingCurvePda, globalPda } from "./pda";


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
  async getBuytxs() {


    const global = this.program.account.global;
    const programId = this.program.programId;

      

 
  }


   globalPda() {
    return globalPda(this.program.programId);
  }

    bondingCurvePda(mint: PublicKey | string): PublicKey {
    return bondingCurvePda(this.program.programId, mint);
  }
}

(async () => {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const sdk = new PumpFunSDK(connection);

    sdk.getBuytxs();
})();
