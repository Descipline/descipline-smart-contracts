import fs from 'fs';
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { 
  getInitAuthorityInstruction,
  getCreateChallengeInstruction,
  getStakeInstruction,
  DESCIPLINE_PROGRAM_ADDRESS,
  TokenAllowed,
  getResolveInstruction,
  getClaimInstruction,
  getClaimAndCloseInstruction
} from "../descipline-lib";

import {
  airdropFactory,
  createKeyPairSignerFromPrivateKeyBytes,
  lamports,
  Signature,
  TransactionSigner,
  Instruction,
  Address,
  Blockhash,
  createSolanaClient,
  createTransaction,
  SolanaClient,
  KeyPairSigner
} from "gill";

import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { resolve } from 'path';

require("dotenv").config();

function load_merkle_proof(FilePath = "data/output/winner_list_proofs.json"): [number[], Record<string, [number, Buffer<ArrayBuffer>]>] {
  const rawData = fs.readFileSync(FilePath, "utf-8");
  const parsed = JSON.parse(rawData);
  const merkleRoot: number[] = parsed.merkleRoot;
  const proofMap: Record<string, [number, Buffer<ArrayBuffer>]> = parsed.proofMap;
  return [merkleRoot, proofMap];
}

async function setupWallets(client: SolanaClient, wallet_path = "/home/fc/.config/solana/id.json", airdrop_switch_on = false) {
  const keypairBytes = new Uint8Array(JSON.parse(fs.readFileSync(wallet_path).toString()));
  const payer = await createKeyPairSignerFromBytes(keypairBytes);

  const privateKeys = [
    process.env.INITIATOR_PRIVATE_KEY,
    process.env.WINNER_1_PRIVATE_KEY,
    process.env.WINNER_2_PRIVATE_KEY,
    process.env.LOSER_PRIVATE_KEY,
  ] as string[];

  const [initiator, winner1, winner2, loser] = await Promise.all(
    privateKeys.map(key =>
      createKeyPairSignerFromPrivateKeyBytes(bs58.decode(key.trim()).slice(0, 32))
    )
  );
  return { payer, authority: payer, attestor: payer, initiator, winner1, winner2, loser };
}

async function airdrop(address: Address, client: SolanaClient, enabled: boolean = true) {
  if (!enabled) return;
  const airdrop = airdropFactory({ rpc: client.rpc, rpcSubscriptions: client.rpcSubscriptions });
  const tx: Signature = await airdrop({
    commitment: 'processed',
    lamports: lamports(BigInt(1_000_000_000)),
    recipientAddress: address
  });
  console.log(`    - Airdrop completed: ${tx}`);
}

async function sendAndConfirmInstructions(
  client: SolanaClient,
  payer: TransactionSigner,
  instructions: Instruction[],
  description: string
): Promise<Signature> {
  try {
    const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      version: "legacy",
      feePayer: payer,
      instructions,
      latestBlockhash,
      computeUnitLimit: 200_000,
      computeUnitPrice: 1,
    });
    const sig = await client.sendAndConfirmTransaction(tx);
    console.log(`    - ${description} - Signature: ${sig}`);
    return sig;
  } catch (err: any) {
    console.error("Simulation/log error:", err.simulationResponse || err.cause?.logs || err);
    throw err;
  }
}

const [MERKLE_ROOT, MERKLE_PROOFS] = load_merkle_proof()
const WINNER_LIST_URI = "https://gateway.irys.xyz/GKZg8NzEdPsjw9hB1zkYUbXqjYRqVbhKoXxi6KxrLPDb";
const CREDENTIAL_PDA = new PublicKey("3AxXk5xXwm8gJWsyyKshjgtXFC2GLzFreX6refrBmL9b");
const SCHEMA_PDA = new PublicKey("6DUEfJWTitsLSL92wa2TT9SEribipmCqjSEVjUEoMMNJ");
const ATTESTATION_PDA = new PublicKey("53d4kry65ZUQK6Txrk1SoHkCyyurE6v2ZFo8KznzLH3d");
const USDC_MINT = new PublicKey("4NQMuSBhVrqTh8FMv5AbHvADVwHSnxrHNERPdAFu5B8p");
const PROGRAM_ID = new PublicKey(DESCIPLINE_PROGRAM_ADDRESS);
const CHALLENGE_PDA = "GmjPvaAfmW8XkhcKvygWnL1WM2JUxeSN5upEK8Yg6Yn2";

const CONFIG = {
  CLUSTER_OR_RPC: 'devnet',
  CREDENTIAL_NAME: 'OFFICIAL-AUTHORITY',
  SCHEMA_NAME: 'OFFICIAL-PROOF-SCHEMA',
  SCHEMA_LAYOUT: Buffer.from([13, 13, 0, 13]),
  SCHEMA_FIELDS: ["challenge", "merkle_root", "winner_count", "winner_list_uri"],
  SCHEMA_VERSION: 1,
  SCHEMA_DESCRIPTION: 'Challenge schema for merkle proof',
  ATTESTATION_DATA: {
      challenge: Buffer.from((new PublicKey(CHALLENGE_PDA)).toBytes()),
      merkle_root: Buffer.from(MERKLE_ROOT),
      winner_count: 2,
      winner_list_uri: Buffer.from(WINNER_LIST_URI, "utf-8"), 
  },
  ATTESTATION_EXPIRY_DAYS: 365
};
console.log(CONFIG.ATTESTATION_DATA)

async function main() {
  const stakeMint = USDC_MINT;
  const challengeName = "DESCIP-TEST-CHALLENGE5";
  const stakeAmount = 50n * 10n ** 6n;
  const fee = 0;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const stakeEndAt = now + 15n * 3600n;
  const claimStartFrom = stakeEndAt + 1n;

  const client = createSolanaClient({ urlOrMoniker: CONFIG.CLUSTER_OR_RPC });
  const { payer, authority, attestor, initiator, winner1, winner2, loser } = await setupWallets(client);
  // console.log("MERKLE_ROOT:", MERKLE_ROOT);
  // console.log("MERKLE_PROOFS keys:", Object.keys(MERKLE_PROOFS));
  console.log(winner1.address as string, winner2.address as string)
  const [winner1_index, winner1_proof] = MERKLE_PROOFS[winner1.address as string];
  const [winner2_index, winner2_proof] = MERKLE_PROOFS[winner2.address as string];

  await airdrop(payer.address, client, false);

  let credentialAuthority = PublicKey.findProgramAddressSync(
    [Buffer.from("authority")],
    PROGRAM_ID
  )[0].toString() as Address;

  let challenge = PublicKey.findProgramAddressSync(
    [Buffer.from("challenge"), bs58.decode(initiator.address), Buffer.from(challengeName)],
    PROGRAM_ID
  )[0].toString() as Address;

  let resolution = PublicKey.findProgramAddressSync(
    [Buffer.from("resolution"), bs58.decode(challenge)],
    PROGRAM_ID
  )[0].toString() as Address;

  let receipt_winner1 = PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), bs58.decode(challenge), bs58.decode(winner1.address)],
    PROGRAM_ID
  )[0].toString() as Address;

  let receipt_winner2 = PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), bs58.decode(challenge), bs58.decode(winner2.address)],
    PROGRAM_ID
  )[0].toString() as Address;

  let receipt_loser = PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), bs58.decode(challenge), bs58.decode(loser.address)],
    PROGRAM_ID
  )[0].toString() as Address;

  let vault = getAssociatedTokenAddressSync(
    USDC_MINT,
    new PublicKey(challenge),
    true
  ).toString() as Address;

  let winner1Ata = getAssociatedTokenAddressSync(
    USDC_MINT,
    new PublicKey(winner1.address),
    false
  ).toString() as Address;

  let winner2Ata = getAssociatedTokenAddressSync(
    USDC_MINT,
    new PublicKey(winner2.address),
    false
  ).toString() as Address;

  let loserAta = getAssociatedTokenAddressSync(
    USDC_MINT,
    new PublicKey(loser.address),
    false
  ).toString() as Address;

  // // Create Challenge
  // const createChallengeInstruction = getCreateChallengeInstruction({
  //   initiator,
  //   vault,
  //   challenge,
  //   schema: SCHEMA_PDA.toString() as Address,
  //   credential: CREDENTIAL_PDA.toString() as Address,
  //   credentialAuthority,
  //   stakeMint: stakeMint.toString() as Address,
  //   name: challengeName,
  //   tokenAllowed: TokenAllowed.USDC,
  //   stakeAmount,
  //   fee,
  //   stakeEndAt,
  //   claimStartFrom
  // });

  // await sendAndConfirmInstructions(client, initiator, [createChallengeInstruction], "Challenge created");
  // console.log(`    - Challenge PDA: ${challenge}`);

  // // Stake
  
  // const stakeInstruction1 = getStakeInstruction({
  //   challenger: winner1,
  //   stakeMint: stakeMint.toString() as Address,
  //   challenge,
  //   receipt: receipt_winner1.toString() as Address,
  //   vault,
  //   challengerAta: winner1Ata
  // });

  // await sendAndConfirmInstructions(client, winner1, [stakeInstruction1], "Winner1 staked");

  // const stakeInstruction2 = getStakeInstruction({
  //   challenger: winner2,
  //   stakeMint: stakeMint.toString() as Address,
  //   challenge,
  //   receipt: receipt_winner2.toString() as Address,
  //   vault,
  //   challengerAta: winner2Ata
  // });

  // const stakeInstruction3 = getStakeInstruction({
  //   challenger: loser,
  //   stakeMint: stakeMint.toString() as Address,
  //   challenge,
  //   receipt: receipt_loser.toString() as Address,
  //   vault,
  //   challengerAta: loserAta
  // });

  // await sendAndConfirmInstructions(client, winner2, [stakeInstruction2], "Winner2 staked");
  // await sendAndConfirmInstructions(client, loser, [stakeInstruction3], "Loser staked");

  // Resolve
  const resolveInstruction = getResolveInstruction({
    attestor,
    challenge,
    resolution,
    attestation: ATTESTATION_PDA.toString() as Address,
  });

  await sendAndConfirmInstructions(client, attestor, [resolveInstruction], "Attestation resolved");

  //Claim
  const claimInstruction = getClaimInstruction({
    winner: winner1,
    winnerAta: winner1Ata,
    vault,
    challenge,
    resolution,
    receipt: receipt_winner1,
    stakeMint: stakeMint.toString() as Address,
    proof: Buffer.from(winner1_proof),
    index: winner1_index
  });

  await sendAndConfirmInstructions(client, winner1, [claimInstruction], "winner1 claimed");
  
  // Claim and close
  const claimAndCloseInstruction = getClaimAndCloseInstruction({
    winner: winner2,
    winnerAta: winner2Ata,
    vault,
    challenge,
    resolution,
    initiator: initiator.address,
    attestor: attestor.address,
    receipt: receipt_winner2,
    stakeMint: stakeMint.toString() as Address,
    proof: Buffer.from(winner2_proof),
    index: winner2_index
  });

  await sendAndConfirmInstructions(client, winner2, [claimAndCloseInstruction], "winner2 claimed");
  

}

main().catch(err => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});

