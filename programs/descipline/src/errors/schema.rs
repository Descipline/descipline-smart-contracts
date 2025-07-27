use anchor_lang::prelude::*;

#[error_code]
pub enum SchemaError {
    #[msg("Invalid credential authority")]
    InvalidCredential,
    
    #[msg("Schema is paused")]
    SchemaPaused,
    
    #[msg("Invalid schema hash")]
    InvalidSchemaHash,
    
    #[msg("Invalid verification key hash")]
    InvalidVerificationKey,
    
    #[msg("Invalid schema structure")]
    InvalidSchema,
    
    #[msg("Invalid schema data")]
    InvalidSchemaData,
    
    #[msg("Schema name does not match challenge name")]
    NameMismatch,

    #[msg("Invalid layout")]
    InvalidLayout,
} 