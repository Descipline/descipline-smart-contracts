use anchor_lang::prelude::*;
use crate::{constants::Discriminators, errors::SchemaError};

/// Interface for loading Pinocchio Schema account data
pub struct SchemaInterface {
    pub credential: Pubkey,
    pub name: String,
    pub layout: Vec<u8>,
}

impl SchemaInterface {
    /// Create a new SchemaInterface from account data
    pub fn new(account_data: &[u8]) -> Result<Self> {
        // Check discriminator
        require!(account_data[0] == Discriminators::Schema as u8, SchemaError::InvalidAccountData);

        // for discriminator and credential
        let mut offset = 33;

        // Deserialize Pinocchio Schema account based on the provided structure
        require!(account_data.len() > 51, SchemaError::InvalidSchemaData);
        msg!("schema account data length: {}", account_data.len());
        
        // Extract credential
        let credential = Pubkey::new_from_array(account_data[1..33].try_into().unwrap());
        

        let name_length = u32::from_le_bytes(
            account_data[offset..offset+4].try_into().unwrap()
        ) as usize;
        msg!("name_length: {}", name_length);

        offset += 4;

        let name_bytes = &account_data[offset..offset + name_length];
        let name = String::from_utf8(name_bytes.to_vec())
            .map_err(|_| SchemaError::InvalidSchemaData)?;
        
        offset += name_length;

        let desc_length = u32::from_le_bytes(
            account_data[offset..offset+4].try_into().unwrap()
        ) as usize;
        
        offset += 4 + desc_length;

        let layout_length = u32::from_le_bytes(
            account_data[offset..offset+4].try_into().unwrap()
        ) as usize;
        
        // Read name bytes
        if account_data.len() < offset + 4 + layout_length + 6 {
            return err!(SchemaError::InvalidSchemaData);
        }
        
        // Read layout bytes
        let layout = account_data[offset..offset + layout_length].to_vec();

        Ok(Self {
            credential,
            name,
            layout,
        })
    }
    
    /// Verify that schema name matches challenge name
    pub fn verify_name(&self, challenge_name: &str) -> Result<()> {
        require!(
            self.name == challenge_name,
            SchemaError::NameMismatch
        );
        Ok(())
    }

    /// Verify that schema name matches challenge name
    pub fn verify_credential(&self, credential: Pubkey) -> Result<()> {
        require!(
            self.credential == credential,
            SchemaError::InvalidCredential
        );
        Ok(())
    }
} 