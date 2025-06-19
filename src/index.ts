import pumpIdl from "./IDL/pump.json";
import { Pump } from "./IDL/pump";
import * as anchor from "@coral-xyz/anchor";

import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js/lib";



const connection = new Connection(clusterApiUrl("mainnet-beta"),"confirmed");

const keypair = Keypair.generate();
const wallet = new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection,wallet);

const pumpProgram = new anchor.Program<Pump>(pumpIdl as Pump,  provider);


