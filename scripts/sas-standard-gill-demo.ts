import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
    getCreateCredentialInstruction,
    getCreateSchemaInstruction,
    serializeAttestationData,
    getCreateAttestationInstruction,
    fetchSchema,
    getChangeAuthorizedSignersInstruction,
    fetchAttestation,
    deserializeAttestationData,
    deriveAttestationPda,
    deriveCredentialPda,
    deriveSchemaPda,
    deriveEventAuthorityAddress,
    getCloseAttestationInstruction,
    SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS
} from "sas-lib";
import {
    airdropFactory,
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
} from "gill";
import {
    estimateComputeUnitLimitFactory
} from "gill/programs";
import { PublicKey } from "@solana/web3.js";
import { createKeyPairSignerFromBytes } from '@solana/signers';
import fs from 'fs';
// import * as utils from "../tests/utils/utils";

function load_merkle_proof(FilePath="data/output/winner_list_proofs.json"): [number[], Record<string, [number, Buffer<ArrayBuffer>]>] {
    // Read and parse the file
    const rawData = fs.readFileSync(FilePath, "utf-8");
    const parsed = JSON.parse(rawData);
  
    // Extract Merkle root and proof map
    const merkleRoot: number[] = parsed.merkleRoot;
    const proofMap:Record<string, [number, Buffer<ArrayBuffer>]> = parsed.proofMap;
  
    return [merkleRoot, proofMap];
}

const MERKLE_ROOT = load_merkle_proof()[0]
const WINNER_LIST_URI = "https://gateway.irys.xyz/GKZg8NzEdPsjw9hB1zkYUbXqjYRqVbhKoXxi6KxrLPDb"

let credentialPda = "3AxXk5xXwm8gJWsyyKshjgtXFC2GLzFreX6refrBmL9b" as Address;
let schemaPda = "CHtaC8wHRjjdDTcq8qFhVEWewqfqGZHYqUwAmXbKKGQr" as Address;
/////
let challengePda = "GmjPvaAfmW8XkhcKvygWnL1WM2JUxeSN5upEK8Yg6Yn2";

const CONFIG = {
    CLUSTER_OR_RPC: 'devnet',
    CREDENTIAL_NAME: 'OFFICIAL-AUTHORITY',
    SCHEMA_NAME: 'OFFICIAL-PROOF-SCHEMA',
    SCHEMA_LAYOUT: Buffer.from([13, 13, 0, 13]),
    SCHEMA_FIELDS: ["challenge", "merkle_root", "winner_count", "winner_list_uri"],
    SCHEMA_VERSION: 1,
    SCHEMA_DESCRIPTION: 'Challenge schema for merkle proof',
    ATTESTATION_DATA: {
        challenge: Buffer.from((new PublicKey(challengePda)).toBytes()),
        merkle_root: Buffer.from(MERKLE_ROOT),
        winner_count: 2,
        winner_list_uri: Buffer.from(WINNER_LIST_URI, "utf-8"), 
    },
    ATTESTATION_EXPIRY_DAYS: 365
};

const AIRDROP_SWITCH_ON = false;

async function setupWallets(client: SolanaClient) {
    try {
         
        // Get bytes from local keypair file.
        const keypairFile = fs.readFileSync('/home/fc/.config/solana/id.json');
        const keypairBytes = new Uint8Array(JSON.parse(keypairFile.toString()));
  
        // Create a KeyPairSigner from the bytes.
        const payer = await createKeyPairSignerFromBytes(keypairBytes);
        const authorizedSigner1 = payer;
        const authorizedSigner2 = await generateKeyPairSigner();
        const issuer = payer;
        const testUser = await generateKeyPairSigner();

        if (AIRDROP_SWITCH_ON) {
            const airdrop = airdropFactory({ rpc: client.rpc, rpcSubscriptions: client.rpcSubscriptions });
            const airdropTx: Signature = await airdrop({
                commitment: 'processed',
                lamports: lamports(BigInt(1_000_000_000)),
                recipientAddress: payer.address
            });
    
            console.log(`    - Airdrop completed: ${airdropTx}`);
        }

        return { payer, authorizedSigner1, authorizedSigner2, issuer, testUser };
    } catch (error) {
        throw new Error(`Failed to setup wallets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function sendAndConfirmInstructions(
    client: SolanaClient,
    payer: TransactionSigner,
    instructions: Instruction[],
    description: string
): Promise<Signature> {
    try {
        const simulationTx = createTransaction({
            version: "legacy",
            feePayer: payer,
            instructions: instructions,
            latestBlockhash: {
                blockhash: '11111111111111111111111111111111' as Blockhash,
                lastValidBlockHeight: 0n,
            },
            computeUnitLimit: 1_400_000,
            computeUnitPrice: 1,
        });
 
        const estimateCompute = estimateComputeUnitLimitFactory({ rpc: client.rpc });
        const computeUnitLimit = await estimateCompute(simulationTx);
        const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
        const tx = createTransaction({
            version: "legacy",
            feePayer: payer,
            instructions: instructions,
            latestBlockhash,
            computeUnitLimit,
            computeUnitPrice: 1, // In production, use dynamic pricing
        });
 
        const signature = await client.sendAndConfirmTransaction(tx);
        console.log(`    - ${description} - Signature: ${signature}`);
        return signature;
    } catch (error) {
        throw new Error(`Failed to ${description.toLowerCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function verifyAttestation({
    client,
    schemaPda,
    userAddress
}: {
    client: SolanaClient;
    schemaPda: Address;
    userAddress: Address;
}): Promise<boolean> {
    try {
        const schema = await fetchSchema(client.rpc, schemaPda);
        if (schema.data.isPaused) {
            console.log(`    -  Schema is paused`);
            return false;
        }
        const [attestationPda] = await deriveAttestationPda({
            credential: schema.data.credential,
            schema: schemaPda,
            nonce: userAddress
        });
        const attestation = await fetchAttestation(client.rpc, attestationPda);
        const attestationData = deserializeAttestationData(schema.data, attestation.data.data as Uint8Array);
        console.log(`    - Attestation data:`, attestationData);
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
        return currentTimestamp < attestation.data.expiry;
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log("Starting Solana Attestation Service Demo\n");
    
    const client: SolanaClient = createSolanaClient({ urlOrMoniker: CONFIG.CLUSTER_OR_RPC });
 
    // Step 1: Setup wallets and fund payer
    console.log("1. Setting up wallets and funding payer...");
    const { payer, authorizedSigner1, authorizedSigner2, issuer, testUser } = await setupWallets(client);
 
    // Step 2: Create Credential
    // console.log("\n2. Creating Credential...");
    // [credentialPda] = await deriveCredentialPda({
    //     authority: issuer.address,
    //     name: CONFIG.CREDENTIAL_NAME
    // });
 
    // const createCredentialInstruction = getCreateCredentialInstruction({
    //     payer,
    //     credential: credentialPda,
    //     authority: issuer,
    //     name: CONFIG.CREDENTIAL_NAME,
    //     signers: [authorizedSigner1.address]
    // });
 
    // await sendAndConfirmInstructions(client, payer, [createCredentialInstruction], 'Credential created');
    // console.log(`    - Credential PDA: ${credentialPda}`); 
    
    // Step 3: Create Schema
    // console.log("\n3.  Creating Schema...");
    // [schemaPda] = await deriveSchemaPda({
    //     credential: credentialPda,
    //     name: CONFIG.SCHEMA_NAME,
    //     version: CONFIG.SCHEMA_VERSION
    // });
 
    // const createSchemaInstruction = getCreateSchemaInstruction({
    //     authority: issuer,
    //     payer,
    //     name: CONFIG.SCHEMA_NAME,
    //     credential: credentialPda,
    //     description: CONFIG.SCHEMA_DESCRIPTION,
    //     fieldNames: CONFIG.SCHEMA_FIELDS,
    //     schema: schemaPda,
    //     layout: CONFIG.SCHEMA_LAYOUT,
    // });
 
    // await sendAndConfirmInstructions(client, payer, [createSchemaInstruction], 'Schema created');
    // console.log(`    - Schema PDA: ${schemaPda}`); 
 
    // Step 4: Create Attestation
    console.log("\n4. Creating Attestation...");
    const [attestationPda] = await deriveAttestationPda({
        credential: credentialPda,
        schema: schemaPda,
        nonce: testUser.address
    });
 
    const schema = await fetchSchema(client.rpc, schemaPda);
    const expiryTimestamp = Math.floor(Date.now() / 1000) + (CONFIG.ATTESTATION_EXPIRY_DAYS * 24 * 60 * 60);
 
    const createAttestationInstruction = getCreateAttestationInstruction({
        payer,
        authority: authorizedSigner1,
        credential: credentialPda,
        schema: schemaPda,
        attestation: attestationPda,
        nonce: testUser.address,
        expiry: expiryTimestamp,
        data: serializeAttestationData(schema.data, CONFIG.ATTESTATION_DATA),
    });
 
    await sendAndConfirmInstructions(client, payer, [createAttestationInstruction], 'Attestation created');
    console.log(`    - Attestation PDA: ${attestationPda}`); 
 
    // // Step 5: Update Authorized Signers
    // console.log("\n5. Updating Authorized Signers...");
    // const changeAuthSignersInstruction = getChangeAuthorizedSignersInstruction({
    //     payer,
    //     authority: issuer,
    //     credential: credentialPda,
    //     signers: [authorizedSigner1.address]
    // });
 
    // await sendAndConfirmInstructions(client, payer, [changeAuthSignersInstruction], 'Authorized signers updated'); 
 
    // // Step 6: Verify Attestations
    // console.log("\n6. Verifying Attestations...");
 
    // const isUserVerified = await verifyAttestation({
    //     client,
    //     schemaPda,
    //     userAddress: testUser.address
    // });
    // console.log(`    - Test User is ${isUserVerified ? 'verified' : 'not verified'}`);
 
    // const randomUser = await generateKeyPairSigner();
    // const isRandomVerified = await verifyAttestation({
    //     client,
    //     schemaPda,
    //     userAddress: randomUser.address
    // });
    // console.log(`    - Random User is ${isRandomVerified ? 'verified' : 'not verified'}`); 

    // // Step 7. Close Attestation
    // console.log("\n7. Closing Attestation...");

    // const eventAuthority = await deriveEventAuthorityAddress();
    // const closeAttestationInstruction = await getCloseAttestationInstruction({
    //     payer,
    //     attestation: attestationPda,
    //     authority: authorizedSigner1,
    //     credential: credentialPda,
    //     eventAuthority,
    //     attestationProgram: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS
    // });
    // await sendAndConfirmInstructions(client, payer, [closeAttestationInstruction], 'Closed attestation');

}
 
main()
    .then(() => console.log("\nSolana Attestation Service demo completed successfully!"))
    .catch((error) => {
        console.error("❌ Demo failed:", error);
        process.exit(1);
    });

// 1. Setting up wallets and funding payer...
// - Schema created - Signature: 2TU2LqQ6DRve2xvUqzsTMgu6BWeHRJvCVE4Tymh3LpYkGTpZY5FGAzg1iypE4jekJv5xjzH6ct5kvgTfRun4mPfZ
// - Schema PDA: 4FS8mRQBUaUTsKwf4c8gqTx9RquGmJrR4Ky6Z5d9RGRj

// 2. Creating Attestation...
//     - Attestation created - Signature: 41VN88HCxRJ7uZD67jEDn2i745sBkbB5R683FqiSx4U8XmNDX45PYzrVMoRC2mwvCYYsDJpQkhutgmneLZnpjTAx
//     - Attestation PDA: 7h2PyWrjDUMTJ9JZrASJVXQcM3WyJeCsbeTR89bScFba