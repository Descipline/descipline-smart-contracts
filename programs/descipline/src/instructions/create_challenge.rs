use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

use crate::{state::Challenge, error::ErrorCode};

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateChallenge<'info> {
  #[account(mut)]
  pub initiator: Signer<'info>,

  #[account(
    mut,
    seeds=[b"vault", challenge.key().as_ref()],
    bump
  )]
  pub vault: SystemAccount<'info>,

  #[account(
    init_if_needed,
    payer = initiator,
    associated_token::mint = stake_mint,
    associated_token::authority = challenge,
  )]
  pub token_vault: Option<Account<'info, TokenAccount>>,

  #[account(
    init,
    payer = initiator,
    seeds = [b"challenge", initiator.key().as_ref(), name.as_str().as_bytes()],
    bump,
    space = 8 + Challenge::INIT_SPACE
  )]
  pub challenge: Account<'info, Challenge>,

  /// If using SPL for staking, should be present
  pub stake_mint: Option<Account<'info, Mint>>,
  pub associated_token_program: Option<Program<'info, AssociatedToken>>,
  pub token_program: Option<Program<'info, Token>>,
  pub system_program: Program<'info, System>,
}

impl<'info> CreateChallenge<'info> {
  pub fn create_challenge(
    &mut self,
    name: String,
    fee: u16,
    stake_amount: u64,
    stake_end_at: i64,
    claim_start_from: i64,
    stake_mint: Option<Pubkey>,
    bumps: InitializeBumps,
  ) -> Result<()> {

    let bump_vault = match stake_mint {
      Some(_) => {
          bumps.token_vault
      }
      None => {
          bumps.vault
      }
    };

    self.challenge.set_inner(
      Challenge {
        name,
        initiator: self.initiator.key(),  
        stake_mint, 
        bump_vault,
        stake_amount,
        fee, 
        stake_end_at,
        claim_start_from,
        schema: self.schema.key(), 
        bump: bumps.challenge
      }
    );

    Ok(())
  }
}