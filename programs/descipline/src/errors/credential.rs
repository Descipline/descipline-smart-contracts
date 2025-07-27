use anchor_lang::prelude::*;

#[error_code]
pub enum CredentialError {
    #[msg("Invalid credential data")]
    InvalidCredentialData,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
    #[msg("Only allow one signer")]
    TooManySigners,
} 