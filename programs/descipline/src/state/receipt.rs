use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Receipt {
    pub bump: u8, // closed when claimed
}
