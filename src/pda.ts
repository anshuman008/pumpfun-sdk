import { PublicKey } from "@solana/web3.js";





export const globalPda = (programId: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("global")],
        programId,
    )[0];
}


export const bondingCurvePda = (
    programId: PublicKey,
    mint: PublicKey | string,
) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("bonding-curve"), new PublicKey(mint).toBuffer()],
        programId,
    )[0];
};


export const creatorVaultPda = (programId: PublicKey, creator: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("creator-vault"), creator.toBuffer()],
        programId,
    )[0];
};

