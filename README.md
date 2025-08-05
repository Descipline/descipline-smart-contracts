# **Descipline – An open Challenge Arena where discpline is rewarded**

>  Put money on the line, prove your success, and earn rewards — all trustless, transparent, and on-chain.

---

## **🌟 Overview**
- Descipline is a decentralized platform that turns self-discipline into real rewards.  
- Users can create or join **time-based or usage-based challenges**, staking funds before a deadline.  
- Winners — verified via **merkle proof verification** — reclaim their stake and share forfeited funds from those who didn’t succeed.
- Attestation - backed by [**Solana Attestation Service**](https://attest.solana.com/)

**Key features:**
- **Trustless Escrow:** All funds locked in Solana smart contracts.  
- **Transparent Verification:** Proofs of success via Solana Attestation Service.  
- **Open Arena:** Anyone can create or join challenges.  
- **Fair Rewards:** Stake from non-completers distributed to winners.

---

## **🛠 How It Works**

1. **Create Challenge**  
   - Initiator sets challenge details (goal, stake amount, deadline).  
   - Contract stores challenge data on-chain.  
   - Backend integrates with **Solana Attestation Service** to set credential & schema storage.  

![1](data/images/1.png)


2. **Join Challenge**  
   - Challenger deposits SPL tokens before deadline.  
   - If staking SOL, frontend auto-wraps to wSOL.  

![2](data/images/2.png)


3. **Attestation & Winner Resolution**  
   - At challenge end, attestor signs attestation.  
   - Backend indexes winners, stores results in DB, uploads to Arweave.  
   - Merkle root of winner list stored on-chain for verification.


![3](data/images/3.png)


4. **Claim Rewards**  
   - Winners submit Merkle proof to claim stake + share of forfeits.


![4](data/images/4.png)


---

## **📂 Project Structure**

- struct
   ```
   descipline-smart-contracts/
   │── programs/               # smart contract(s)
   │   └── descipline/          
   │       ├── src/             
   │       ├── Cargo.toml       
   │       └── Anchor.toml      
   │
   │── scripts/                # Helper scripts
   │── tests/                  # Integration tests
   │── README.md
   ```
- dependencies
   ```
   anchor-cli 0.30.1
   solana-cli 2.2.17
   rustc 1.87.0
   ```

- run
   ```
   yarn manual:build
   anchor deploy
   yarn codama-idl
   yarn test
   ```
## **🔧 Dev Tools**
- [gill](https://github.com/DecalLabs/gill)
- [codama](https://github.com/codama-idl/codama)
- [svm-merkle-tree](https://github.com/deanmlittle/svm-merkle-tree)
- [solana-attestation-service](https://solana.com/de/news/solana-attestation-service)
- [create-solana-dapp](https://github.com/solana-foundation/create-solana-dapp)
- [anchor escrow](https://github.com/Mobius3-3/escrow/tree/5b8249ecb0c84ee20b4cf4289b33c212905e52b8)