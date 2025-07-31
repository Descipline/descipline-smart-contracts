use anchor_lang::prelude::*;

#[error_code]
pub enum GeneralError {
    #[msg("Only WSOL Or USDC Allowed")]
    NotAllowedToken,

    #[msg("Invalid Credential Authority")]
    InvalidCredentialAuth,

    #[msg("Not Allowed Attestor")]
    NotAllowedAttestor
} 