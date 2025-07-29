use brine_tree::{MerkleTree, Leaf, BrineTreeError};
use std::fs;
use std::io::{BufRead, BufReader};
use std::collections::HashMap;
use bs58;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct ProofOutput {
    root_hash: [u8; 32],
    proofs: HashMap<String, Vec<u8>>, // Base58 pubkey -> proof bytes
}

fn main() -> Result<(), BrineTreeError>{
    const TREE_DEPTH: usize = 18;

    // Read pubkeys from file
    let file_path = "../../data/input/winner_list.txt"; // one pubkey per line
    let file = fs::File::open(file_path)
        .expect("Failed to open pubkeys.txt");
    let reader = BufReader::new(file);

    let mut pubkeys: Vec<String> = vec![];
    for line in reader.lines() {
        let pk = line.expect("Failed to read line");
        if !pk.trim().is_empty() {
            pubkeys.push(pk.trim().to_string());
        }
    }

    let mut tree = MerkleTree::<{ TREE_DEPTH }>::new(&[b"empty_leaf_seed"]);
    let mut leaves: Vec<Leaf> = vec![];

    for pk in &pubkeys {
        // Decode base58
        let decoded = bs58::decode(pk).into_vec()
            .expect("Invalid base58 pubkey");

        // Add as leaf
        let leaf = Leaf::new(&[&decoded[..]]);
        tree.try_add_leaf(leaf)?;
        leaves.push(leaf);
    }

    // 3Generate proofs for each leaf
    let mut proofs_map: HashMap<String, Vec<u8>> = HashMap::new();
    for (i, pk) in pubkeys.iter().enumerate() {
        let proof = tree.get_merkle_proof(&leaves, i);
        let proof_bytes = proof.iter().flat_map(|h| h.to_bytes()).collect();
        proofs_map.insert(pk.clone(), proof_bytes);
    }

    // Root hash
    let root_hash = tree.get_root().to_bytes();

    // 4️⃣ Save to JSON
    let output = ProofOutput {
        root_hash: root_hash,
        proofs: proofs_map,
    };

    let json_out = serde_json::to_string_pretty(&output)
        .expect("Failed to serialize JSON");
    fs::write("../../data/output/winner_list_proofs.json", json_out)
        .expect("Failed to write proofs.json");

    println!("✅ Proofs written to proofs.json");
    Ok(())
}