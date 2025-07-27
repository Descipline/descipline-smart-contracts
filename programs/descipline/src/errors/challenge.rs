use anchor_lang::prelude::*;

#[error_code]
pub enum ChallengeError {
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
} 