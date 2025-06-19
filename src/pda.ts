import { PublicKey } from "@solana/web3.js";





export const globalPda = (programId: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("global")],
        programId,
    )[0];
}