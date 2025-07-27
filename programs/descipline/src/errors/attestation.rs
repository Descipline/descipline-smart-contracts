use anchor_lang::prelude::*;

#[error_code]
pub enum AttestationError {
    #[msg("Invalid attestation data")]
    InvalidAttestationData,
    #[msg("Credential mismatch")]
    CredentialMismatch,
    #[msg("Schema mismatch")]
    SchemaMismatch,
    #[msg("Invalid data layout")]
    InvalidDataLayout,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
} 