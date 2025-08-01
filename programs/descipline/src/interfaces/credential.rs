use anchor_lang::prelude::*;
use crate::{constants::Discriminators, error::DesciplineError};

/// Interface for loading Pinocchio Credential account data
pub struct CredentialInterface {
    pub authority: Pubkey,
    pub name: String,
    pub authorized_signers: Vec<Pubkey>,
}

impl CredentialInterface {
    /// Create a new CredentialInterface from account data
    pub fn new(account_data: &[u8]) -> Result<Self> {
        // Check discriminator
        require!(account_data[0] == Discriminators::Credential as u8, DesciplineError::InvalidAccountData);

        // for discriminator and authority
        let mut offset = 33;

        // Deserialize Pinocchio Credential account based on the provided structure
        require!(account_data.len() >= 73, DesciplineError::InvalidCredentialData);
        
        // Extract authority (first 32 bytes after discriminator)
        let authority = Pubkey::new_from_array(account_data[1..33].try_into().unwrap());
        
        // Read name length (4 bytes for length)
        let name_length = u32::from_le_bytes(
            account_data[offset..offset+4].try_into().unwrap()
        ) as usize;

        offset += 4;

        // Read name bytes
        let name_bytes = &account_data[offset..offset + name_length];
        let name = String::from_utf8(name_bytes.to_vec())
            .map_err(|_| DesciplineError::InvalidCredentialData)?;
        
        offset += name_length;

        // Read authorized_signers length (4 bytes for length)
        let signers_length = u32::from_le_bytes(
            account_data[offset..offset+4].try_into().unwrap()
        ) as usize;
        
        offset += 4;
        
        // Read authorized_signers (each Pubkey is 32 bytes)
        require!(account_data.len() == offset + signers_length * 32, DesciplineError::InvalidCredentialData);
        
        let mut authorized_signers = Vec::new();
        for i in 0..signers_length {
            let signer_start = offset + (i * 32);
            let signer_end = signer_start + 32;
            let signer = Pubkey::new_from_array(account_data[signer_start..signer_end].try_into().unwrap());
            authorized_signers.push(signer);
        }

        Ok(Self {
            authority,
            name,
            authorized_signers,
        })
    }
    
    /// Verify authority matches credential_authority.signer
    pub fn verify_authority(&self, signer: Pubkey) -> Result<()> {
        require!(
            self.authority == signer,
            DesciplineError::InvalidAuthority
        );
        Ok(())
    }
    
    // /// Verify layout matches expected [13,0,13]
    // pub fn verify_layout(expected_layout: &[u8]) -> Result<()> {
    //     // let expected_layout = vec![13, 0, 13];
    //     require!(
    //         self.layout == expected_layout,
    //         DesciplineError::InvalidLayout
    //     );
    //     Ok(())
    // }
    
    /// Check if signer is in authorized_signers list
    pub fn verify_authorized_signer(&self, signer: Pubkey) -> Result<()> {
        require!(
            self.authorized_signers.contains(&signer),
            DesciplineError::UnauthorizedSigner
        );
        Ok(())
    }
} 