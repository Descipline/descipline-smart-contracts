use anchor_lang::prelude::*;
use crate::constants::TokenAllowed;

#[account]
#[derive(InitSpace)]
pub struct Challenge {
  #[max_len(32)]
  pub name: String, // The name as seeds for deriving Challenge PDA.
  pub initiator: Pubkey,   
  pub token_allowed: TokenAllowed, // It could be wrapped Sol or SPL token.
  pub stake_amount: u64,
  pub fee: u16, // Inactive feat. The fee will be taken by initiator, minumum denomination is 1 / 10000.
  pub stake_end_at: i64,
  pub claim_start_from: i64,
  pub schema: Pubkey, // The schema will be attested by authorized signers.
  pub attestor: Pubkey,
  pub bump: u8
} 