use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Challenge {
  pub name: String, // The name as seeds for deriving Challenge PDA
  pub initiator: Pubkey,   
  pub stake_mint: Option<Pubkey>, // It could be native Sol or SPL token.
  pub stake_amount: u64,
  pub fee: u16, // The fee will be taken by initiator, minumum denomination is 1 / 10000
  pub stake_end_at: i64,
  pub claim_start_from: i64,
  pub schema: Pubkey, // The schema will be attested by authorized signers.
  pub bump: u8,
  pub bump_vault: u8
}