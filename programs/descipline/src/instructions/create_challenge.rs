use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

use crate::{
    state::{Challenge, CredentialAuthority}, 
    interfaces::{SchemaInterface, CredentialInterface},
    constants::{TokenAllowed, SCHEMA_LAY_OUT, ATTESTOR_NUMBER}, 
    errors::{GeneralError, CredentialError},
    // utils::{PinocchioVerifier, SchemaValidator}
};

#[derive(Accounts)]
#[instruction(name: String, token_allowed: TokenAllowed)]
pub struct CreateChallenge<'info> {
  #[account(mut)]
  pub initiator: Signer<'info>,

  #[account(
    init,
    payer = initiator,
    associated_token::mint = stake_mint,
    associated_token::authority = challenge,
    constraint = stake_mint.key() == token_allowed.mint() @ GeneralError::NotAllowedToken
  )]
  pub vault: Account<'info, TokenAccount>,

  #[account(
    init,
    payer = initiator,
    seeds = [b"challenge", initiator.key().as_ref(), name.as_str().as_bytes()],
    bump,
    space = 8 + Challenge::INIT_SPACE
  )]
  pub challenge: Account<'info, Challenge>,



  /// CHECK: manually verified schema structure
  pub schema: UncheckedAccount<'info>,
  /// CHECK: manually verified credential structure
  pub credential: UncheckedAccount<'info>,

  #[account(
    seeds = [b"authority"],
    bump = credential_authority.bump
  )]
  pub credential_authority: Account<'info, CredentialAuthority>,

  pub stake_mint: Account<'info, Mint>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub token_program: Program<'info, Token>,
  pub system_program: Program<'info, System>,
}

impl<'info> CreateChallenge<'info> {
  pub fn create_challenge(
    &mut self,
    name: String,
    token_allowed: TokenAllowed,
    stake_amount: u64,
    fee: u16,
    stake_end_at: i64,
    claim_start_from: i64,
    bumps: CreateChallengeBumps,
  ) -> Result<()> {
    // Load and verify schema
    let schema_data = self.schema.try_borrow_data()?;
    let schema = SchemaInterface::new(&schema_data)?;
    
    // Verify schema name matches challenge name
    schema.verify_name(&name)?;
    schema.verify_credential(self.credential.key())?;
    schema.verify_layout(&SCHEMA_LAY_OUT)?; // todo: check merkle root data type, add to constants
    
    // Extract credential
    let credential_data = self.credential.try_borrow_data()?;
    let credential = CredentialInterface::new(&credential_data)?;
    credential.verify_authority(self.credential_authority.signer)?;

    require!(credential.authorized_signers.len() as u8 == ATTESTOR_NUMBER, CredentialError::TooManySigners);
    let attestor = credential.authorized_signers[0]; // simply only allow one signer


    self.challenge.set_inner(
      Challenge {
        name, 
        token_allowed,
        stake_amount,
        fee, 
        stake_end_at,
        claim_start_from,
        attestor,
        initiator: self.initiator.key(), 
        schema: self.schema.key(), 
        bump: bumps.challenge
      }
    );

    Ok(())
  }
}