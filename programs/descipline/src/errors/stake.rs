use anchor_lang::prelude::*;

#[error_code]
pub enum StakeError {
    #[msg("Stake Ended")]
    StakeEnded,

    #[msg("Insufficient Token")]
    InsufficientToken,

    #[msg("Stake Failed")]
    StakeFailed
}