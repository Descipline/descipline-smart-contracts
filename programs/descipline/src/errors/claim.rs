use anchor_lang::prelude::*;

#[error_code]
pub enum ClaimError {
    #[msg("Claim Not Start")]
    ClaimNotStart,

    #[msg("Claim Failed")]
    ClaimFailed,
}