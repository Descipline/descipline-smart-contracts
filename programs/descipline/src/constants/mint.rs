use anchor_lang::prelude::*;

#[derive(Debug)]
pub struct TokenInfo {
  pub token: TokenAllowed,
  pub mint: Pubkey,
  pub decimals: u8,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TokenAllowed {
  WSOL,
  USDC,
}

pub const WSOL: TokenInfo = TokenInfo {
  token: TokenAllowed::WSOL,
  mint: pubkey!("So11111111111111111111111111111111111111112"),
  decimals: 9,
};

pub const USDC: TokenInfo = TokenInfo {
  token: TokenAllowed::USDC,
  mint: pubkey!("4NQMuSBhVrqTh8FMv5AbHvADVwHSnxrHNERPdAFu5B8p"),
  decimals: 6,
};

impl anchor_lang::Space for TokenAllowed {
    const INIT_SPACE: usize = 1; // 1 byte for the enum discriminant
}

impl TokenAllowed {
    pub fn mint(&self) -> Pubkey {
        match self {
            TokenAllowed::WSOL => WSOL.mint,
            TokenAllowed::USDC => USDC.mint,
        }
    }

    pub fn decimals(&self) -> u8 {
        match self {
            TokenAllowed::WSOL => WSOL.decimals,
            TokenAllowed::USDC => USDC.decimals,
        }
    }
}