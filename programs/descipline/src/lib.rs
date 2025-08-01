#![allow(unexpected_cfgs)]
#![allow(deprecated)]
pub mod instructions;
pub mod state;
pub mod interfaces;
pub mod constants;
pub mod error;

use anchor_lang::prelude::*;
pub use instructions::*;
pub use constants::*;

declare_id!("5how19SLnecRwk7hQBrEKU3bF8KwH3Z6vXUDiwGssFFc");

#[program]
pub mod descipline {
    use super::*;

    pub fn init_authority(ctx: Context<InitAuthority>) -> Result<()> {
        ctx.accounts.init_authority(&ctx.bumps)?;

        Ok(())
    }

    pub fn create_challenge(
        ctx: Context<CreateChallenge>,
        name: String,
        token_allowed: TokenAllowed,
        stake_amount: u64,
        fee: u16,
        stake_end_at: i64,
        claim_start_from: i64,
    ) -> Result<()> {
        ctx.accounts.create_challenge(
            name,
            token_allowed,
            stake_amount,
            fee,
            stake_end_at,
            claim_start_from,
            &ctx.bumps
        )?;
        
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        ctx.accounts.stake(&ctx.bumps)?;
        
        Ok(())
    }

    pub fn resolve(ctx: Context<Resolve>) -> Result<()> {
        ctx.accounts.resolve(&ctx.bumps)?;
        
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>, proof: Vec<u8>, index: u8) -> Result<()> {
        ctx.accounts.claim(proof, index)?;
        
        Ok(())
    }

    pub fn claim_and_close(ctx: Context<ClaimAndClose>, proof: Vec<u8>, index: u8) -> Result<()> {
        ctx.accounts.claim_and_close(proof, index)?;
        
        Ok(())
    }
}
