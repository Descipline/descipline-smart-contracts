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

// credential_authority: EmyHsCweqWZX7wPTKVmGxyEUJiP2mPXCi2rrBdgJvctW
// initiator pubkey: 4k5ks1Tp6z4tUpJB5dqaW9HpuxrP9kqPCZMXLARWLuMv
// loser pubkey: 4y3skg4uH6KBvumkXRSs6Dx3f6jFNDNSBmaT7Xo56aSU

//  - Attestation PDA: CWvCj9CghVgkf8xGz6VXwrp2Vzz52b2DgYAUQ6vXhu4u
const CREDENTIAL_PDA = new PublicKey("5C4smiRRFkPrMLrpT7yKzH6xpoJgEoGJhBQTRyi9qX1L");
const SCHEMA_PDA = new PublicKey("5ku9sAQv1a8KgJ1gV9W5wTECdSoBDnjoaDc68957Xtsk");
const Attestation_PDA = new PublicKey("9w19rmMYmrE2VNPJzfrQ86YcTrPp7H1oFPCEFqtQ5M6z");
const USDC_MINT = new PublicKey("4NQMuSBhVrqTh8FMv5AbHvADVwHSnxrHNERPdAFu5B8p");

describe("descipline", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const program = anchor.workspace.descipline as Program<Descipline>;
  
  console.log("programId is: ", program.programId)
  const credentialSigner = provider.wallet.payer;
  
  const credentialSignerPubkey = credentialSigner?.publicKey;
  console.log(credentialSignerPubkey?.toBase58())
  const authorizedSigners = [credentialSigner];

  // Decode the base58 private key string
  let secretKeyBase58 = process.env.DEV_WAlLET_PRIVATE_KEY as string;
  let secretKey = bs58.decode(secretKeyBase58);
  const initiator = Keypair.fromSecretKey(secretKey);
  console.log("initiator pubkey:", initiator.publicKey.toBase58());
  const credentialAuthorityPDA = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("authority")], program.programId)[0];
  console.log(credentialAuthorityPDA.toBase58())

  secretKeyBase58 = process.env.RUST_WALLET_PRIVATE_KEY as string;
  secretKey = bs58.decode(secretKeyBase58);
  const loser = Keypair.fromSecretKey(secretKey);
  console.log("loser pubkey:", loser.publicKey.toBase58());

  const challenge_name = 'TEST-CHALLENGE3';
  const stake_amount = new anchor.BN(50 * 10**6);
  const fee = 100;
  const stake_end_at = new anchor.BN(Math.floor(Date.now() / 1000) +  15 * 3600); // seconds since epoch
  const claim_start_from = new anchor.BN(Math.floor(Date.now() / 1000) + 15 * 3600 + 1);
  const initiator_is_winner = true;
  // Needed PDAs and mint
  let challengePda: PublicKey;
  let resolutionPda: PublicKey;
  let vault: PublicKey;
  let stakeMint: PublicKey;
  let receipt;
  let bump: number;
  let tx: string;

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
    tx = await program.methods
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

    tx = await program.methods
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

  it.skip("3. Stake", async () => {
    // derive challenge PDA
    [receipt, bump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("receipt"),
          challengePda.toBuffer(),
          initiator.publicKey.toBuffer(),
        ],
        program.programId
      );
    tx = await program.methods
    .stake()
    .accountsPartial({
      challenger: initiator.publicKey,
      stakeMint: USDC_MINT,
      challenge: challengePda,
      receipt: receipt,
      vault: vault
    })
    .signers([initiator])
    .rpc();
    console.log("Your transaction signature", tx);

    // derive challenge PDA
    [receipt, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("receipt"),
        challengePda.toBuffer(),
        credentialSignerPubkey!.toBuffer(),
      ],
      program.programId
    );
    
    tx = await program.methods
    .stake()
    .accountsPartial({
      challenger: credentialSigner?.publicKey,
      stakeMint: USDC_MINT,
      challenge: challengePda,
      receipt: receipt,
      vault
    })
    .rpc();    
    console.log("Your transaction signature", tx);

    // loser join
    [receipt, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("receipt"),
        challengePda.toBuffer(),
        loser.publicKey.toBuffer(),
      ],
      program.programId
    );
    
    tx = await program.methods
    .stake()
    .accountsPartial({
      challenger: loser.publicKey,
      stakeMint: USDC_MINT,
      challenge: challengePda,
      receipt: receipt,
      vault
    })
    .signers([loser])
    .rpc();    
    console.log("Your transaction signature", tx);
  });

  it("4. Resolve", async () => {

    // derive challenge PDA
    [resolutionPda, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("resolution"),
        challengePda.toBuffer()
      ],
      program.programId
    );


    tx = await program.methods
    .resolve()
    .accountsPartial({
      attestor: credentialSigner?.publicKey,
      challenge: challengePda,
      resolution: resolutionPda,
      attestation: Attestation_PDA
    })
    .rpc();    
    console.log("Your transaction signature", tx);
  })

  
});
