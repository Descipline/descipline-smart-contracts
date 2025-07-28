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

// 1. Setting up wallets and funding payer...

// 2. Creating Credential...
//     - Credential created - Signature: 4r5ytT2KbB6bBZkSzUvT3SGFnm1pNygdJVXU6yH8STBqrGbR5MwWaeB5Avdz6QBaNDwRBPGR2AJgYFy1huvBR1oN
//     - Credential PDA: 4gAE8DDMtiJbHpGPbhKXBDnb6FWjVWsNjPwHnWCYKPDZ

// 3.  Creating Schema...
//     - Schema created - Signature: 2o6CqEUmNrJiMrLPGVHRdFWvPzvQqxDzq4t6ksBDWyVmaP8NwQ7hWhWeN3Hqh8yerziWM4oHeTVCQUmryY89LQYt
//     - Schema PDA: CjqMWzV15Wj2mGETnLAyhtdq8ujM6CSCFkTtKkKcq1mC

// 4. Creating Attestation...
//     - Attestation created - Signature: 5e5dkjReWFqqAVz4VNtdtQbmjKLHYMNDFtcRZAQpcnWreMZtmYEPEuoezx2naJDgJ2FZBiqQ8CL89drwNA5Mq38r
//     - Attestation PDA: CWvCj9CghVgkf8xGz6VXwrp2Vzz52b2DgYAUQ6vXhu4u

// 5. Updating Authorized Signers...
//     - Authorized signers updated - Signature: cJE9NXFwXhmdEdDveHsx9VoAhvZ1XU6nEvxeUxpt4AeVwuUziFWL6JDrTXqSwu5GbYDpuR4TBTAxyg85huhC7x8

// 6. Verifying Attestations...
//     - Attestation data: {
//   merkle_root: [ 1, 2, 3 ],
//   winner_count: 1,
//   winner_list_uri: [ 1, 2, 3 ]
// }
//     - Test User is verified
//     - Random User is not verified
