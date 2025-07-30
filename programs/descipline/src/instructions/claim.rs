use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};
use brine_tree::{Leaf, verify};
use bs58;

use crate::{
    state::{Challenge, Receipt, Resolution}, 
    // interfaces::{SchemaInterface, CredentialInterface},
    // constants::{TokenAllowed, ATTESTOR_NUMBER}, 
    errors::{GeneralError, ClaimError},
    // utils::{PinocchioVerifier, SchemaValidator}
};

use super::shared::{transfer_tokens};

#[derive(Accounts)]
pub struct Claim<'info> {
  #[account(mut)]
  pub winner: Signer<'info>,

  #[account(
    mut,
    associated_token::mint = stake_mint,
    associated_token::authority = winner
  )]
  pub winner_ata: Account<'info, TokenAccount>,

  #[account(
    mut,
    associated_token::mint = stake_mint,
    associated_token::authority = challenge,
    constraint = stake_mint.key() == challenge.token_allowed.mint() @ GeneralError::NotAllowedToken
  )]
  pub vault: Account<'info, TokenAccount>,

  #[account(
    seeds = [b"challenge", challenge.initiator.key().as_ref(), challenge.name.as_str().as_bytes()],
    bump = challenge.bump,
  )]
  pub challenge: Account<'info, Challenge>,

  #[account(
    mut,
    seeds = [b"resolution", challenge.key().as_ref()],
    bump = resolution.bump,
  )]
  pub resolution: Account<'info, Resolution>,

  #[account(
    mut,
    close = winner,
    seeds = [b"receipt", challenge.key().as_ref(), winner.key().as_ref()],
    bump
  )]
  pub receipt: Account<'info, Receipt>,

  pub stake_mint: Account<'info, Mint>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub token_program: Program<'info, Token>,
  pub system_program: Program<'info, System>,
}

impl<'info> Claim<'info> {
  pub fn claim(
    &mut self,
    proof: Vec<Vec<u8>>
  ) -> Result<()> {
    // time lock
    // require!(Clock::get()?.unix_timestamp > self.challenge.claim_start_from, ClaimError::ClaimNotStart);
    let proof_vec: Vec<[u8; 32]> = proof.into_iter()
    .map(|item| {
      let arr: [u8; 32] = item.as_slice().try_into().unwrap(); // safe after length check
      arr
    })
    .collect();
    // verify merkle proof
    let root = self.resolution.root_hash;
    // Add as leaf
    let leaf = Leaf::new(&[self.winner.key().to_bytes().as_ref()]);

    msg!("before verify");
    verify(root, &proof_vec, leaf);
    msg!("verify finished");

    let amount = self.vault.amount.checked_div(self.resolution.winner_notclaim_count as u64).unwrap();
    let signers_seeds = &[
      b"challenge", 
      self.challenge.initiator.as_ref(), 
      self.challenge.name.as_str().as_bytes()
    ];
    transfer_tokens(
      &self.vault,
      &self.winner_ata,
      &amount,
      &self.stake_mint,
      &self.challenge.to_account_info(),
      &self.token_program,
      Some(signers_seeds),
    )
    .map_err(|_| ClaimError::ClaimFailed)?;

  self.resolution.winner_notclaim_count -= 1;

    Ok(())
  }
}