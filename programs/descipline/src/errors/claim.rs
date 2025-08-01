use anchor_lang::prelude::*;

#[error_code]
pub enum ClaimError {
    #[msg("Claim Not Start")]
    ClaimNotStart,

    #[msg("Claim Failed")]
    ClaimFailed,

    #[msg("Not In Whitelist")]
    NotInWhitelist,

    #[msg("Last Cliam Close Challenge")]
    ShouldCloseChallenge,

    #[msg("Challenge Should Not Be Closed")]
    InvalidCloseChallenge
}