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
  const authorizedSigners = [credentialSigner];

  // Decode the base58 private key string
  const secretKeyBase58 = process.env.DEV_WAlLET_PRIVATE_KEY as string;
  const secretKey = bs58.decode(secretKeyBase58);

  // Create Keypair from secret key
  const initiator = Keypair.fromSecretKey(secretKey);
  const credentialAuthorityPDA = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("authority")], program.programId)[0];

  // Needed PDAs and mint
  let challengePda: PublicKey;
  let vault: PublicKey;
  let stakeMint: PublicKey;
  let bump: number;



  before(async () => {
  });

  it.skip("1. Initialize Credential Authority", async () => {
    const tx = await program.methods
    .initAuthority()
    .accountsPartial({
    })
    .rpc();
    console.log("Your transaction signature", tx);
  });

  it("2. Initialize Credential Authority", async () => {
    const challenge_name = 'TEST-CHALLENGE';
    const stake_amount = new anchor.BN(5*10**9);
    const fee = 100;
    const stake_end_at = new anchor.BN(Math.floor(Date.now() / 1000) +  15 * 3600); // seconds since epoch
    const claim_start_from = new anchor.BN(Math.floor(Date.now() / 1000) + 15 * 3600 + 1);

      // Step 2: Derive challenge PDA

      [challengePda, bump] = await PublicKey.findProgramAddress(
        [
          Buffer.from("challenge"),
          initiator.publicKey.toBuffer(),
          Buffer.from(challenge_name),
        ],
        program.programId
      );
  
      // Step 3: Derive vault ATA
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
});
