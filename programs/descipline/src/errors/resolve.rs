use anchor_lang::prelude::*;

#[error_code]
pub enum ResolveError {
  #[msg("Invalid attestor")]
  InvalidAttestor,
}