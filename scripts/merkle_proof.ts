import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { HashingAlgorithm, MerkleTree, MerkleProof } from "svm-merkle-tree";
import * as fs from 'fs';

const whitelistFilePath ="data2/input/winner_list.txt"
const outputFilePath = "data2/output/winner_list_proofs.json"

async function main() {  
  let whitelistedAddresses: string[];
  let merkleRoot: number[];
  const proofMap: Record<string, [number, Buffer<ArrayBuffer>]> = {};
  let fileContent = fs.readFileSync(whitelistFilePath, "utf-8");

  // Split by lines and filter out empty lines
  whitelistedAddresses = fileContent
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);  // Convert to PublicKey
  
  console.log("Whitelisted addresses:", whitelistedAddresses);

  // Create Merkle Tree
  let merkleTree = new MerkleTree(HashingAlgorithm.Keccak, 32);
  whitelistedAddresses.forEach((address) => {
    merkleTree.add_leaf((new PublicKey(address)).toBytes());
  });

  whitelistedAddresses.forEach((address) => {
    const index = whitelistedAddresses.findIndex(addr => addr===address);
    
    const proof = merkleTree.merkle_proof_index(index);
    const proofArray = Buffer.from(proof.get_pairing_hashes());
    proofMap[address] = [index, proofArray];
  });
  merkleTree.merklize();
  merkleRoot = Array.from(merkleTree.get_merkle_root());
  // Final output object
  let output = {
    merkleRoot,
    proofMap,
  };

  // Write to file
  fs.writeFileSync(outputFilePath, JSON.stringify(output, null, 2));
}

main() 
.then(() => console.log("\nGenerate proof successfully!"))
.catch((error) => {
    console.error("❌ Generate proof failed:", error);
    process.exit(1);
});