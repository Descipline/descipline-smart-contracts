use anchor_lang::prelude::*;

use crate::{state::CredentialAuthority};

#[derive(Accounts)]
pub struct InitAuthority<'info> {
  #[account(mut)]
  pub signer: Signer<'info>,

  #[account(
    init,
    payer = signer,
    seeds = [b"authority"],
    bump,
    space = 8 + CredentialAuthority::INIT_SPACE
  )]
  pub credential_authority: Account<'info, CredentialAuthority>,

  pub system_program: Program<'info, System>,
}

impl<'info> InitAuthority<'info> {
  pub fn init_authority(&mut self, bumps: &InitAuthorityBumps) -> Result<()> {
    self.credential_authority.set_inner(
      CredentialAuthority {
        signer: self.signer.key(),
        bump: bumps.credential_authority
      }
    );
    
    Ok(())
  }
}
