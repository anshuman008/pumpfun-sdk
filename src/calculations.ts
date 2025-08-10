import BN from "bn.js";
import { BondingCurve,Global } from "./types";
import { PublicKey } from "@solana/web3.js";



export const getBuyPrice = (amount: bigint , virtual_sol_reserve: bigint ,virtual_token_reserve: bigint, real_token_reserve: bigint): bigint => {


  //@ts-ignore
  if (amount <= 0n) {
    //@ts-ignore
    return 0n;
  }

  // Calculate the product of virtual reserves
  
  let n = virtual_sol_reserve * virtual_token_reserve;

  // Calculate the new virtual sol reserves after the purchase
  let i = virtual_sol_reserve + amount;

  // Calculate the new virtual token reserves after the purchase

  //@ts-ignore
  let r = n / i + 1000n;

  // Calculate the amount of tokens to be purchased
  let s = virtual_token_reserve - r;


  // console.log("here is the sol amount which user want to buy!!", amount );
  // console.log("here is the intial virtual sol ----->>>> ", virtual_sol_reserve );
  // console.log("here is the after adding buying amount sol into virtual sol ----->>>> ", virtual_sol_reserve);


  // console.log("here is the new virtual token reserves ----->>>> ", r);

  // console.log("here is the amount of tokens to be purchased ----->>>> ", s);

  // Return the minimum of the calculated tokens and real token reserves
  return s < real_token_reserve ? s : real_token_reserve;

  // return s;
}


export function newBondingCurve(global: Global): BondingCurve {
  return {
    virtualTokenReserves: global.initialVirtualTokenReserves,
    virtualSolReserves: global.initialVirtualSolReserves,
    realTokenReserves: global.initialRealTokenReserves,
    realSolReserves: new BN(0),
    tokenTotalSupply: global.tokenTotalSupply,
    complete: false,
    creator: PublicKey.default,
  };
}

function computeFee(amount: BN, feeBasisPoints: BN): BN {
  return ceilDiv(amount.mul(feeBasisPoints), new BN(10_000));
}

function ceilDiv(a: BN, b: BN): BN {
  return a.add(b.subn(1)).div(b);
}

function getFee(
  global: Global,
  bondingCurve: BondingCurve,
  amount: BN,
  isNewBondingCurve: boolean,
): BN {
  return computeFee(amount, global.feeBasisPoints).add(
    isNewBondingCurve || !PublicKey.default.equals(bondingCurve.creator)
      ? computeFee(amount, global.creatorFeeBasisPoints)
      : new BN(0),
  );
}

export function getBuySolFromToken(
  global: Global,
  bondingCurve: BondingCurve | null,
  amount: BN,
): BN {
  if (amount.eq(new BN(0))) {
    return new BN(0);
  }

  let isNewBondingCurve = false;

  if (bondingCurve === null) {
    bondingCurve = newBondingCurve(global);
    isNewBondingCurve = true;
  }

  // migrated bonding curve
  if (bondingCurve.virtualTokenReserves.eq(new BN(0))) {
    return new BN(0);
  }

  const minAmount = BN.min(amount, bondingCurve.realTokenReserves);

  const solCost = minAmount
    .mul(bondingCurve.virtualSolReserves)
    .div(bondingCurve.virtualTokenReserves.sub(minAmount))
    .add(new BN(1));

  return solCost.add(getFee(global, bondingCurve, solCost, isNewBondingCurve));
}

export function getSolFromToken(
  global: Global,
  bondingCurve: BondingCurve,
  amount: BN,
): BN {
  if (amount.eq(new BN(0))) {
    return new BN(0);
  }

  // migrated bonding curve
  if (bondingCurve.virtualTokenReserves.eq(new BN(0))) {
    return new BN(0);
  }

  const solCost = amount
    .mul(bondingCurve.virtualSolReserves)
    .div(bondingCurve.virtualTokenReserves.add(amount));

  return solCost.sub(getFee(global, bondingCurve, solCost, false));
}
