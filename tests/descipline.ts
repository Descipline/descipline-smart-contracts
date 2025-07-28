import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Descipline } from "../target/types/descipline";
import { Keypair, PublicKey, SystemProgram} from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { createMint, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
require("dotenv").config();

// 1. credential_signer sign credential 
// 2. sign schema
// 3. create challenge
//  - Attestation PDA: CWvCj9CghVgkf8xGz6VXwrp2Vzz52b2DgYAUQ6vXhu4u
const CREDENTIAL_PDA = new PublicKey("FZhMagtLNf7vnDN4hXee2jwXqgDjnN2Fx7CAJPkLr48g");
const SCHEMA_PDA = new PublicKey("EqLuLrgNjzbQZhrEn563bwb6fv2hcxPo1jz4ZSXVH9Dq");
const USDC_MINT = new PublicKey("4NQMuSBhVrqTh8FMv5AbHvADVwHSnxrHNERPdAFu5B8p");

describe("descipline", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const program = anchor.workspace.descipline as Program<Descipline>;
  

  const credentialSigner = provider.wallet.payer;
  
  const credentialSignerPubkey = credentialSigner?.publicKey;
  console.log(credentialSignerPubkey?.toBase58())
  const authorizedSigners = [credentialSigner];

  // Decode the base58 private key string
  const secretKeyBase58 = process.env.DEV_WAlLET_PRIVATE_KEY as string;
  const secretKey = bs58.decode(secretKeyBase58);

  // Create Keypair from secret key
  const initiator = Keypair.fromSecretKey(secretKey);
  console.log("initiator pubkey:", initiator.publicKey.toBase58());
  const credentialAuthorityPDA = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("authority")], program.programId)[0];
  console.log(credentialAuthorityPDA.toBase58())

  const challenge_name = 'TEST-CHALLENGE';
  const stake_amount = new anchor.BN(5000 * 10**6);
  const fee = 100;
  const stake_end_at = new anchor.BN(Math.floor(Date.now() / 1000) +  15 * 3600); // seconds since epoch
  const claim_start_from = new anchor.BN(Math.floor(Date.now() / 1000) + 15 * 3600 + 1);

  // Needed PDAs and mint
  let challengePda: PublicKey;
  let vault: PublicKey;
  let stakeMint: PublicKey;
  let receipt1;
  let receipt2;
  let bump: number;

  before(async () => {
    // derive challenge PDA
    [challengePda, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("challenge"),
        initiator.publicKey.toBuffer(),
        Buffer.from(challenge_name),
      ],
      program.programId
    );
  });

  it.skip("1. Initialize Credential Authority", async () => {
    const tx = await program.methods
    .initAuthority()
    .accountsPartial({
    })
    .rpc();
    console.log("Your transaction signature", tx);
  });

  it.skip("2. Create Challenge", async () => {
    // derive vault ATA
    vault = await getAssociatedTokenAddress(
      USDC_MINT,
      challengePda,
      true // allowOwnerOffCurve = true for PDA
    );

    const tx = await program.methods
    .createChallenge(
      challenge_name,
      {usdc: {}},
      stake_amount,
      fee,
      stake_end_at,
      claim_start_from,
    )
    .accountsPartial({
      initiator: initiator.publicKey,
      schema: SCHEMA_PDA,
      credential: CREDENTIAL_PDA,
      stakeMint: USDC_MINT,
      vault,
      credentialAuthority: credentialAuthorityPDA

    })
    .signers([initiator])
    .rpc();
    console.log("Your transaction signature", tx);
  });

  it("3. Stake", async () => {
    // derive challenge PDA
    [receipt1, bump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("receipt"),
          challengePda.toBuffer(),
          initiator.publicKey.toBuffer(),
        ],
        program.programId
      );
    const tx = await program.methods
    .stake()
    .accountsPartial({
      challenger: initiator.publicKey,
      stakeMint: USDC_MINT,
      challenge: challengePda,
      receipt: receipt1,
      vault: vault
    })
    .signers([initiator])
    .rpc();
    console.log("Your transaction signature", tx);

    // derive challenge PDA
    [receipt2, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("receipt"),
        challengePda.toBuffer(),
        credentialSignerPubkey!.toBuffer(),
      ],
      program.programId
    );
    
    const tx1 = await program.methods
    .stake()
    .accountsPartial({
      challenger: credentialSigner?.publicKey,
      stakeMint: USDC_MINT,
      challenge: challengePda,
      receipt: receipt2,
      vault
    })
    .rpc();    
    console.log("Your transaction signature", tx1);
  })
});
