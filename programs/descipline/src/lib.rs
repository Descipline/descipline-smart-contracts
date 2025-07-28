#![allow(unexpected_cfgs)]
#![allow(deprecated)]
pub mod instructions;
pub mod state;
pub mod interfaces;
pub mod constants;
pub mod errors;
pub mod utils;

use anchor_lang::prelude::*;
pub use instructions::*;
pub use constants::*;
pub use errors::*;
pub use utils::*;

declare_id!("EDQPhoxuBdRmcQhCAtTxVcbqrErmR9WgtsQF3z3BLW9M");

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
}
