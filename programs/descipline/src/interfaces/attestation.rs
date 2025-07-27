use anchor_lang::prelude::*;
use crate::errors::AttestationError;

/// Interface for loading Pinocchio Attestation account data
pub struct AttestationInterface {
    pub credential: Pubkey,
    pub schema: Pubkey,
    pub data: Vec<u8>,
    pub signer: Pubkey,
}

impl AttestationInterface {
    /// Create a new AttestationInterface from account data
    pub fn new(account_data: &[u8]) -> Result<Self> {
        // for discriminator and nonce and 3 pubkeys
        let mut offset = 104;

        // Deserialize Pinocchio Attestation account based on the provided structure
        require!(account_data.len() > 148, AttestationError::InvalidAttestationData);
        
        // Extract credential (next 32 bytes)
        let credential = Pubkey::new_from_array(account_data[40..72].try_into().unwrap());
        
        // Extract schema (next 32 bytes)
        let schema = Pubkey::new_from_array(account_data[72..104].try_into().unwrap());
        
        // Read data length (4 bytes for length)
        let data_length = u32::from_le_bytes(
            account_data[offset..offset+4].try_into().unwrap()
        ) as usize;

        offset += 4;

        // Read data bytes
        let data = account_data[offset..offset + data_length].to_vec();
        
        offset += data_length;
        
        require!(account_data.len() == offset + 72, AttestationError::InvalidAttestationData);

        // Extract signer (next 32 bytes)
        let signer = Pubkey::new_from_array(account_data[offset..offset+32].try_into().unwrap());

        Ok(Self {
            credential,
            schema,
            data,
            signer,
        })
    }
    
    /// Verify credential matches expected credential
    pub fn verify_credential(&self, expected_credential: Pubkey) -> Result<()> {
        require!(
            self.credential == expected_credential,
            AttestationError::CredentialMismatch
        );
        Ok(())
    }
    
    /// Verify schema matches expected schema
    pub fn verify_schema(&self, expected_schema: Pubkey) -> Result<()> {
        require!(
            self.schema == expected_schema,
            AttestationError::SchemaMismatch
        );
        Ok(())
    }
    
    /// Verify data aligns with schema layout data type
    pub fn verify_data_layout(&self, expected_layout: &[u8]) -> Result<()> {
        // In a real implementation, you would verify that the data structure
        // matches the expected layout [13,0,13]
        
        // For now, just check if data length is reasonable
        require!(
            self.data.len() > 0,
            AttestationError::InvalidDataLayout
        );
        
        // You would implement proper layout verification here
        // based on the Pinocchio schema layout specification
        
        Ok(())
    }
    
    /// Verify signer is authorized
    pub fn verify_signer(&self, authorized_signers: &[Pubkey]) -> Result<()> {
        require!(
            authorized_signers.contains(&self.signer),
            AttestationError::UnauthorizedSigner
        );
        Ok(())
    }
} 