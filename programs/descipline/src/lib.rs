#![allow(unexpected_cfgs)]
#![allow(deprecated)]
use anchor_lang::prelude::*;

declare_id!("descip1111111111111111111111111111111111111");

#[program]
pub mod descipline {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
