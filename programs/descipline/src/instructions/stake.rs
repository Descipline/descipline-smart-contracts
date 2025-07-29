use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

use crate::{
    state::{Challenge, Receipt},
    errors::{GeneralError, StakeError},
};

use super::shared::{transfer_tokens};

#[derive(Accounts)]
pub struct Stake<'info> {
  #[account(mut)]
  pub challenger: Signer<'info>,

  #[account(
    mut,
    associated_token::mint = stake_mint,
    associated_token::authority = challenger
  )]
  pub challenger_ata: Account<'info, TokenAccount>,

  #[account(
    init,
    payer = challenger,
    seeds = [b"receipt", challenge.key().as_ref(), challenger.key().as_ref()],
    bump,
    space = 8 + Receipt::INIT_SPACE
  )]
  pub receipt: Account<'info, Receipt>,

  #[account(
    mut,
    associated_token::mint = stake_mint,
    associated_token::authority = challenge,
    constraint = stake_mint.key() == challenge.token_allowed.mint() @ GeneralError::NotAllowedToken
  )]
  pub vault: Account<'info, TokenAccount>,

  #[account(
    seeds = [b"challenge", challenge.initiator.key().as_ref(), challenge.name.as_str().as_bytes()],
    bump = challenge.bump
  )]
  pub challenge: Account<'info, Challenge>,

  pub stake_mint: Account<'info, Mint>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub token_program: Program<'info, Token>,
  pub system_program: Program<'info, System>,
}

impl<'info> Stake<'info> {
  pub fn stake(
    &mut self,
    bumps: &StakeBumps
  ) -> Result<()> {
    // before stake endtime
    // require!(Clock::get()?.unix_timestamp < self.challenge.stake_end_at, StakeError::StakeEnded);
    // msg!("challenge amount is: {} {}", self.challenger_ata.amount, self.challenge.stake_amount);
    // assert!(false, "early revert");
    // check token balance >= required
    require!( self.challenger_ata.amount >= self.challenge.stake_amount, StakeError::InsufficientToken);
    
    // transfer token
    transfer_tokens(
      &self.challenger_ata,
      &self.vault,
      &self.challenge.stake_amount,
      &self.stake_mint,
      &self.challenger,
      &self.token_program,
      None,
    )
    .map_err(|_| StakeError::StakeFailed)?;

    // set receipt
    self.receipt.set_inner(
      Receipt {
        bump: bumps.receipt
      }
    );

    Ok(())
  }
}