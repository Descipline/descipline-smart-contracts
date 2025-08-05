import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import wallet from "../data/authority.json";

const address_list = [
  "7dEDturUW4UFZFgLNm5EQX8MbmFZnXjQViyrDfHNyPrN"
]

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 1_000_000n;

// Mint address
const mint = new PublicKey("4NQMuSBhVrqTh8FMv5AbHvADVwHSnxrHNERPdAFu5B8p");
const to_list = address_list.map(address => new PublicKey(address));

(async () => {
    try {
        for (const to of to_list) {
          // Create an ATA
          const ata = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, to);
          console.log(`Your ata is: ${ata.address.toBase58()}`);

          // Mint to ATA
          const mintTx = await mintTo(connection, keypair, mint, ata.address, keypair.publicKey, 1_000_000_000n);
          console.log(`Your mint txid: ${mintTx}`);
        }
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
