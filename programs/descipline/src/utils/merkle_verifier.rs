use brine_tree::{MerkleTree, Leaf, BrineTreeError, verify};

// fn verify(

// ) {
//   let seeds: &[&[u8]] = &[b"test"];
//   let mut tree = TestTree::new(seeds);
  
//   // Add initial leaves
//   assert!(tree.try_add(&[b"val_1"]).is_ok());
//   assert!(tree.try_add(&[b"val_2"]).is_ok());
  
//   // Get proof for val_1
//   let leaves = [
//       Leaf::new(&[b"val_1"]),
//       Leaf::new(&[b"val_2"]),
//   ];
//   let proof = tree.get_merkle_proof(&leaves, 0);
  
//   // Verify proof (typed)
//   assert!(verify(tree.get_root(), &proof, Leaf::new(&[b"val_1"])));

//   let a : [u8; 32] = tree.get_root().to_bytes();
//   let b : [[u8; 32]; 3] = [
//       proof[0].to_bytes(),
//       proof[1].to_bytes(),
//       proof[2].to_bytes(),
//   ];
//   let c : [u8; 32] = Leaf::new(&[b"val_1"]).to_bytes();
//   // Verify proof (generic)
//   assert!(verify(a, &b, c));
// }


