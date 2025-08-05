import fs from 'fs';
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
    createKeyPairSignerFromBytes,
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

async function setupWallets(client: SolanaClient, wallet_path = "data/authority.json", is_airdrop: boolean = false) {
    try {
        const keypairBytes = new Uint8Array(JSON.parse(fs.readFileSync(wallet_path).toString()));
        const payer = await createKeyPairSignerFromBytes(keypairBytes);
        // const authorizedSigner1 = await generateKeyPairSigner();
        const issuer = await generateKeyPairSigner();
        if (is_airdrop) {
            const airdrop = airdropFactory({ rpc: client.rpc, rpcSubscriptions: client.rpcSubscriptions });
            const airdropTx: Signature = await airdrop({
                commitment: 'processed',
                lamports: lamports(BigInt(1_000_000_000)),
                recipientAddress: payer.address
            });
            console.log(`    - Airdrop completed: ${airdropTx}`);
        }
        return { payer, authorizedSigner1: payer, issuer };
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
    const { payer, authorizedSigner1, issuer } = await setupWallets(client);
 
    // Step 2: Create Credential
    console.log("\n2. Creating Credential...");
    const [credentialPda] = await deriveCredentialPda({
        authority: authorizedSigner1.address,
        name: CONFIG.CREDENTIAL_NAME
    });
 
    const createCredentialInstruction = getCreateCredentialInstruction({
        payer,
        credential: credentialPda,
        authority: authorizedSigner1,
        name: CONFIG.CREDENTIAL_NAME,
        signers: [authorizedSigner1.address]
    });
 
    await sendAndConfirmInstructions(client, payer, [createCredentialInstruction], 'Credential created');
    console.log(`    - Credential PDA: ${credentialPda}`); 
 
    // Step 3: Create Schema
    console.log("\n3.  Creating Schema...");
    const [schemaPda] = await deriveSchemaPda({
        credential: credentialPda,
        name: CONFIG.SCHEMA_NAME,
        version: CONFIG.SCHEMA_VERSION
    });
 
    const createSchemaInstruction = getCreateSchemaInstruction({
        authority: authorizedSigner1,
        payer,
        name: CONFIG.SCHEMA_NAME,
        credential: credentialPda,
        description: CONFIG.SCHEMA_DESCRIPTION,
        fieldNames: CONFIG.SCHEMA_FIELDS,
        schema: schemaPda,
        layout: CONFIG.SCHEMA_LAYOUT,
    });
 
    await sendAndConfirmInstructions(client, payer, [createSchemaInstruction], 'Schema created');
    console.log(`    - Schema PDA: ${schemaPda}`);
}
 
main()
    .then(() => console.log("\nSolana Attestation Service demo completed successfully!"))
    .catch((error) => {
        console.error("❌ Demo failed:", error);
        process.exit(1);
    });