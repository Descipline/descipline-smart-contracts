use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct CredentialAuthority{
  pub signer: Pubkey,
  pub bump: u8
} 