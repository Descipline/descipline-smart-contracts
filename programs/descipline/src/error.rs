use anchor_lang::prelude::*;

#[error_code]
pub enum DesciplineError {
    // -------- General --------
    #[msg("Only WSOL or USDC allowed")]
    NotAllowedToken,
    #[msg("Invalid credential authority")]
    InvalidCredentialAuthority,
    #[msg("Not allowed attestor")]
    InvalidAttestor,

    // -------- Credential --------
    #[msg("Invalid credential data")]
    InvalidCredentialData,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
    #[msg("Too many signers (only one allowed)")]
    TooManySigners,

    // -------- Schema --------
    #[msg("Schema is paused")]
    SchemaPaused,
    #[msg("Invalid schema hash")]
    InvalidSchemaHash,
    #[msg("Invalid verification key hash")]
    InvalidVerificationKeyHash,
    #[msg("Invalid schema structure")]
    InvalidSchema,
    #[msg("Invalid schema data")]
    InvalidSchemaData,
    #[msg("Schema name does not match challenge name")]
    NameMismatch,
    #[msg("Invalid layout")]
    InvalidLayout,
    #[msg("Invalid Discriminator")]
    InvalidAccountData,
    #[msg("Invalid credential authority")]
    InvalidCredential,

    // -------- Attestation --------
    #[msg("Invalid attestation data")]
    InvalidAttestationData,
    #[msg("Credential mismatch")]
    CredentialMismatch,
    #[msg("Challenge mismatch")]
    ChallengeMismatch,
    #[msg("Schema mismatch")]
    SchemaMismatch,
    #[msg("Invalid data layout")]
    InvalidDataLayout,
    #[msg("Unauthorized signers")]
    UnauthorizedSigners,

    // -------- Challenge --------
    #[msg("Challenge has already ended")]
    ChallengeEnded,
    #[msg("Challenge has not started yet")]
    ChallengeNotStarted,
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Invalid fee percentage")]
    InvalidFeePercentage,
    #[msg("Challenge not found")]
    ChallengeNotFound,

    // -------- Stake --------
    #[msg("Stake has ended")]
    StakeEnded,
    #[msg("Insufficient token balance")]
    InsufficientToken,
    #[msg("Stake failed")]
    StakeFailed,

    // -------- Claim --------
    #[msg("Claim period has not started")]
    ClaimNotStarted,
    #[msg("Claim failed")]
    ClaimFailed,
    #[msg("Not in whitelist")]
    NotInWhitelist,
    #[msg("Last claim should close challenge")]
    ShouldCloseChallenge,
    #[msg("Challenge should not be closed")]
    InvalidCloseChallenge,

    // -------- Common --------
    #[msg("Invalid discriminator")]
    InvalidDiscriminator,
}