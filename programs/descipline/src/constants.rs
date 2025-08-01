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

pub const SCHEMA_NAME: &str = "OFFICIAL-PROOF-SCHEMA"; 
pub const SCHEMA_LAY_OUT: [u8; 4] = [13,13,0,13]; 
pub const ATTESTOR_NUMBER: u8 = 1;

#[repr(u8)]
pub enum SchemaDataTypes {
    U8 = 0,
    // U16 = 1,
    // U32 = 2,
    // U64 = 3,
    // U128 = 4,
    // I8 = 5,
    // I16 = 6,
    // I32 = 7,
    // I64 = 8,
    // I128 = 9,
    // Bool = 10,
    // Char = 11,
    // String = 12,
    VecU8 = 13,
    // VecU16 = 14,
    // VecU32 = 15,
    // VecU64 = 16,
    // VecU128 = 17,
    // VecI8 = 18,
    // VecI16 = 19,
    // VecI32 = 20,
    // VecI64 = 21,
    // VecI128 = 22,
    // VecBool = 23,
    // VecChar = 24,
    // VecString = 25, // Max Value
}

impl From<u8> for SchemaDataTypes {
  fn from(byte: u8) -> SchemaDataTypes {
      match byte {
          0 => SchemaDataTypes::U8,
          // 1 => SchemaDataTypes::U16,
          // 2 => SchemaDataTypes::U32,
          // 3 => SchemaDataTypes::U64,
          // 4 => SchemaDataTypes::U128,
          // 5 => SchemaDataTypes::I8,
          // 6 => SchemaDataTypes::I16,
          // 7 => SchemaDataTypes::I32,
          // 8 => SchemaDataTypes::I64,
          // 9 => SchemaDataTypes::I128,
          // 10 => SchemaDataTypes::Bool,
          // 11 => SchemaDataTypes::Char,
          // 12 => SchemaDataTypes::String,
          13 => SchemaDataTypes::VecU8,
          // 14 => SchemaDataTypes::VecU16,
          // 15 => SchemaDataTypes::VecU32,
          // 16 => SchemaDataTypes::VecU64,
          // 17 => SchemaDataTypes::VecU128,
          // 18 => SchemaDataTypes::VecI8,
          // 19 => SchemaDataTypes::VecI16,
          // 20 => SchemaDataTypes::VecI32,
          // 21 => SchemaDataTypes::VecI64,
          // 22 => SchemaDataTypes::VecI128,
          // 23 => SchemaDataTypes::VecBool,
          // 24 => SchemaDataTypes::VecChar,
          // 25 => SchemaDataTypes::VecString,
          _ => panic!("Invalid u8 for SchemaDataTypes"),
      }
  }
}

#[repr(u8)]
pub enum Discriminators {
  Credential = 0,
  Schema = 1,
  Attestation = 2,
}