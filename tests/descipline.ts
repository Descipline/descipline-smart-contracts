import fs from 'fs';
import { describe, before, it } from "node:test";
import assert from "node:assert";
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
  fetchCredential,
  fetchSchema, 
  fetchAttestation,
  deriveEventAuthorityAddress,
  getCloseAttestationInstruction, 
  SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
  deriveAttestationPda,
  getCreateAttestationInstruction,
  serializeAttestationData,
} from "sas-lib";

import {
  airdropFactory,
  createKeyPairSignerFromPrivateKeyBytes,
  generateKeyPairSigner,
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

// help functions

function load_merkle_proof(FilePath = "data/output/winner_list_proofs.json"): [number[], Record<string, [number, Buffer<ArrayBuffer>]>] {
  const rawData = fs.readFileSync(FilePath, "utf-8");
  const parsed = JSON.parse(rawData);
  const merkleRoot: number[] = parsed.merkleRoot;
  const proofMap: Record<string, [number, Buffer<ArrayBuffer>]> = parsed.proofMap;
  return [merkleRoot, proofMap];
}

async function setupWallets(client: SolanaClient, wallet_path = "data/authority.json", airdrop_switch_on = false) {
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
const IS_INIT = false;
const [MERKLE_ROOT, MERKLE_PROOFS] = load_merkle_proof()
const WINNER_LIST_URI = "https://gateway.irys.xyz/GKZg8NzEdPsjw9hB1zkYUbXqjYRqVbhKoXxi6KxrLPDb";
const CREDENTIAL_PDA = new PublicKey("EuqQv8UZmFUn3ksEDYh4Zes3quSPXv8J5Ctas24N8FmY");
const SCHEMA_PDA = new PublicKey("6qbJyzaoy7CBgr75gyiLRvPWQ5MTXgxFwNofELXpWgGA");
const USDC_MINT = new PublicKey("4NQMuSBhVrqTh8FMv5AbHvADVwHSnxrHNERPdAFu5B8p");
const PROGRAM_ID = new PublicKey(DESCIPLINE_PROGRAM_ADDRESS);
const CHALLENGE_NAME = "DESCIP-TEST-CHALLENGE5";

const CONFIG = {
  CLUSTER_OR_RPC: 'devnet',
  CREDENTIAL_NAME: 'OFFICIAL-AUTHORITY',
  SCHEMA_NAME: 'OFFICIAL-PROOF-SCHEMA',
  SCHEMA_LAYOUT: Buffer.from([13, 13, 0, 13]),
  SCHEMA_FIELDS: ["challenge", "merkle_root", "winner_count", "winner_list_uri"],
  SCHEMA_VERSION: 1,
  SCHEMA_DESCRIPTION: 'Challenge schema for merkle proof',
  ATTESTATION_EXPIRY_DAYS: 365
};
let attestation_data =  {
  challenge: Buffer.from([]), // Buffer.from((new PublicKey(CHALLENGE_PDA)).toBytes()),
  merkle_root: Buffer.from(MERKLE_ROOT),
  winner_count: 2,
  winner_list_uri: Buffer.from(WINNER_LIST_URI, "utf-8"), 
};

async function main() {
  const client = createSolanaClient({ urlOrMoniker: CONFIG.CLUSTER_OR_RPC });
  // const schema = await fetchSchema(client.rpc, SCHEMA_PDA.toString() as Address);
  // console.log("schema is :", schema);

  // const attestation = await fetchAttestation(client.rpc, ATTESTATION_PDA.toString() as Address);
  // console.log("attestation is :", attestation);
  const stakeMint = USDC_MINT;
  
  const stakeAmount = 50n * 10n ** 6n;
  const fee = 0;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const stakeEndAt = now + 15n * 3600n;
  const claimStartFrom = stakeEndAt + 1n;

  
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
    [Buffer.from("challenge"), bs58.decode(initiator.address), Buffer.from(CHALLENGE_NAME)],
    PROGRAM_ID
  )[0].toString() as Address;

  attestation_data["challenge"] = bs58.decode(challenge);

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

  if (IS_INIT) {
    console.log("\n0. Init Credential Authority...");
    const initAuthorityInstruction = getInitAuthorityInstruction({
      signer: authority,
      credentialAuthority
    })
    await sendAndConfirmInstructions(client, initiator, [initAuthorityInstruction], "Authority inited");
    console.log(`    - credential_authority PDA: ${credentialAuthority}`);
  }
  // let credential_pda = await fetchCredential(client.rpc, CREDENTIAL_PDA.toString() as Address);
  // console.log("sas credential data", credential_pda);

  console.log("\n1. Create Challenge...");
  const createChallengeInstruction = getCreateChallengeInstruction({
    initiator,
    vault,
    challenge,
    schema: SCHEMA_PDA.toString() as Address,
    credential: CREDENTIAL_PDA.toString() as Address,
    credentialAuthority,
    stakeMint: stakeMint.toString() as Address,
    name: CHALLENGE_NAME,
    tokenAllowed: TokenAllowed.USDC,
    stakeAmount,
    fee,
    stakeEndAt,
    claimStartFrom
  });

  await sendAndConfirmInstructions(client, initiator, [createChallengeInstruction], "Challenge created");
  console.log(`    - Challenge PDA: ${challenge}`);

  console.log("\n2. Stake...");
  const stakeInstruction1 = getStakeInstruction({
    challenger: winner1,
    stakeMint: stakeMint.toString() as Address,
    challenge,
    receipt: receipt_winner1.toString() as Address,
    vault,
    challengerAta: winner1Ata
  });

  await sendAndConfirmInstructions(client, winner1, [stakeInstruction1], "Winner1 staked");

  const stakeInstruction2 = getStakeInstruction({
    challenger: winner2,
    stakeMint: stakeMint.toString() as Address,
    challenge,
    receipt: receipt_winner2.toString() as Address,
    vault,
    challengerAta: winner2Ata
  });

  await sendAndConfirmInstructions(client, winner2, [stakeInstruction2], "Winner2 staked");

  const stakeInstruction3 = getStakeInstruction({
    challenger: loser,
    stakeMint: stakeMint.toString() as Address,
    challenge,
    receipt: receipt_loser.toString() as Address,
    vault,
    challengerAta: loserAta
  });

  await sendAndConfirmInstructions(client, loser, [stakeInstruction3], "Loser staked");

  // create merkle tree proof ans store data
  console.log("\n3. Creating Attestation...");
  const nonce = (await generateKeyPairSigner()).address
  const [attestationPda] = await deriveAttestationPda({
      credential: CREDENTIAL_PDA.toString() as Address,
      schema: SCHEMA_PDA.toString() as Address,
      nonce
  });

  const schema = await fetchSchema(client.rpc, SCHEMA_PDA.toString() as Address);
  const expiryTimestamp = Math.floor(Date.now() / 1000) + (CONFIG.ATTESTATION_EXPIRY_DAYS * 24 * 60 * 60);

  const createAttestationInstruction = getCreateAttestationInstruction({
      payer,
      authority: authority,
      credential: CREDENTIAL_PDA.toString() as Address,
      schema: SCHEMA_PDA.toString() as Address,
      attestation: attestationPda,
      nonce,
      expiry: expiryTimestamp,
      data: serializeAttestationData(schema.data, attestation_data),
  });

  await sendAndConfirmInstructions(client, payer, [createAttestationInstruction], 'Attestation created');
  // console.log(`    - Attestation PDA: ${attestationPda}`); 

  const attestation = await fetchAttestation(client.rpc, attestationPda);

  console.log("\n4. Resolve...");
  const resolveInstruction = getResolveInstruction({
    attestor,
    challenge,
    resolution,
    attestation: attestation.address,
  });

  await sendAndConfirmInstructions(client, attestor, [resolveInstruction], "Attestation resolved");

  console.log("\n5. Claim...");
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
  
  console.log("\n6. Claim and close...");
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
  
  // Close Attestation
  console.log("\n7. Closing Attestation...");

  const eventAuthority = await deriveEventAuthorityAddress();
  const closeAttestationInstruction = getCloseAttestationInstruction({
      payer,
      attestation: attestation.address,
      authority: authority,
      credential: CREDENTIAL_PDA.toString() as Address,
      eventAuthority,
      attestationProgram: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS
  });
  await sendAndConfirmInstructions(client, payer, [closeAttestationInstruction], 'Closed attestation');
};

main().catch(err => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});

