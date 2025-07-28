use anchor_lang::prelude::*;
use crate::{constants::{Discriminators, SchemaDataTypes}, errors::AttestationError};

#[inline]
fn get_size_of_vec(offset: usize, element_size: usize, data: &Vec<u8>) -> usize {
    let len = u32::from_le_bytes(data[offset..offset + 4].try_into().unwrap()) as usize;
    4 + len * element_size
}

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
        // Check discriminator
        require!(account_data[0] == Discriminators::Attestation as u8, AttestationError::InvalidAccountData);

        // for discriminator and nonce and 3 pubkeys
        let mut offset = 97;

        // Deserialize Pinocchio Attestation account based on the provided structure
        require!(account_data.len() > 141, AttestationError::InvalidAttestationData);
        
        // Extract credential (next 32 bytes)
        let credential = Pubkey::new_from_array(account_data[33..65].try_into().unwrap());
        
        // Extract schema (next 32 bytes)
        let schema = Pubkey::new_from_array(account_data[65..97].try_into().unwrap());
        
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
    
    pub fn verify_layout(&self, layout: Vec<u8>) -> Result<()> {
        // Iterate over the data and ensure there are no overflows.
        // If we do not overflow and match with the end of the data,
        // then we can assume the data is valid for the schema.
        let mut data_offset = 0;
        for data_type in layout {
            let schema_data_type: SchemaDataTypes = data_type.into();
            match schema_data_type {
                // u8
                SchemaDataTypes::U8 => data_offset += 1,

                // Vec<u8> -> Vec<u128>
                SchemaDataTypes::VecU8 => {
                    data_offset += get_size_of_vec(data_offset, 1, &self.data)
                }
            }

            // Check data size at end of each iteration and error if offset exceeds the data length.
            if data_offset > self.data.len() {
                return Err(AttestationError::InvalidAttestationData.into());
            }
        }
        if data_offset != self.data.len() {
            return Err(AttestationError::InvalidAttestationData.into());
        }
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