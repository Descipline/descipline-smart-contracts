use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};


use crate::{
    state::{Challenge, Receipt, Resolution}, 
    // interfaces::{SchemaInterface, CredentialInterface},
    // constants::{TokenAllowed, ATTESTOR_NUMBER}, 
    errors::{GeneralError, ClaimError},
    // utils::{PinocchioVerifier, SchemaValidator}
};

use super::shared::{transfer_tokens, verify_address, close_token_account};

#[derive(Accounts)]
pub struct ClaimAndClose<'info> {
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
    mut,
    close = initiator,
    has_one = initiator,
    seeds = [b"challenge", challenge.initiator.key().as_ref(), challenge.name.as_str().as_bytes()],
    bump = challenge.bump,
  )]
  pub challenge: Account<'info, Challenge>,

  #[account(
    mut,
    close = attestor,
    seeds = [b"resolution", challenge.key().as_ref()],
    bump = resolution.bump,
    constraint = attestor.key() == challenge.attestor @ GeneralError::NotAllowedAttestor
  )]
  pub resolution: Account<'info, Resolution>,

  #[account(
    mut,
    close = winner,
    seeds = [b"receipt", challenge.key().as_ref(), winner.key().as_ref()],
    bump = receipt.bump
  )]
  pub receipt: Account<'info, Receipt>,

  pub initiator: SystemAccount<'info>,
  pub attestor: SystemAccount<'info>,
  pub stake_mint: Account<'info, Mint>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub token_program: Program<'info, Token>,
  pub system_program: Program<'info, System>,
}

impl<'info> ClaimAndClose<'info> {
  pub fn claim_and_close(
    &mut self,
    proof: Vec<u8>, 
    index: u8
  ) -> Result<()> {
    // time lock
    // require!(Clock::get()?.unix_timestamp > self.challenge.claim_start_from, ClaimError::ClaimNotStart);

    require!(self.resolution.winner_notclaim_count == 1, ClaimError::InvalidCloseChallenge);
    // verify merkle proof
    let merkle_root = self.resolution.root_hash;

    verify_address(
      self.winner.key(),
      proof,
      index,
      merkle_root
    )?;

    let signers_seeds = &[
      b"challenge", 
      self.challenge.initiator.as_ref(), 
      self.challenge.name.as_str().as_bytes(),
      &[self.challenge.bump]
    ];

    transfer_tokens(
      &self.vault,
      &self.winner_ata,
      &self.vault.amount,
      &self.stake_mint,
      &self.challenge.to_account_info(),
      &self.token_program,
      Some(signers_seeds),
    )
    .map_err(|_| ClaimError::ClaimFailed)?;

  close_token_account(
    &self.vault, 
    &self.initiator, 
    &self.challenge.to_account_info(), 
    &self.token_program,
    Some(signers_seeds))?;

    Ok(())
  }

}