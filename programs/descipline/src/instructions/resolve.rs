use anchor_lang::prelude::*;

use crate::{
    state::{Challenge, Resolution}, 
    interfaces::{AttestationInterface},
    constants::{SCHEMA_LAY_OUT}, 
    errors::{ResolveError},
};


// tx signer == attestor in challenge - done
// attestor in challenge == attestation signer - done
// store resolution account with merkle root, winner_count, winner_list_uri

#[derive(Accounts)]
pub struct Resolve<'info> {
  #[account(
    mut,
    constraint = attestor.key() == challenge.attestor.key() @ ResolveError::InvalidAttestor
  )]
  pub attestor: Signer<'info>,


  #[account(
    seeds = [b"challenge", challenge.initiator.key().as_ref(), challenge.name.as_str().as_bytes()],
    bump = challenge.bump,
  )]
  pub challenge: Account<'info, Challenge>,

  #[account(
    init,
    payer = attestor,
    seeds = [b"resolution", challenge.key().as_ref()],
    bump,
    space = 8 + Resolution::INIT_SPACE
  )]
  pub resolution: Account<'info, Resolution>,

  /// CHECK: manually verified attestation structure
  pub attestation: UncheckedAccount<'info>,

  pub system_program: Program<'info, System>,
}

impl<'info> Resolve<'info> {
  pub fn resolve(
    &mut self,
    bumps: &ResolveBumps,
  ) -> Result<()> {

    let attestation_data = self.attestation.try_borrow_data()?;
    let attestation = AttestationInterface::new(&attestation_data)?;
    
    attestation.verify_signer(&self.attestor.key())?;
    let attestation_fields = attestation.verify_layout_and_parse(SCHEMA_LAY_OUT.to_vec()).unwrap();

    let root_raw_bytes: [u8; 36] = attestation_fields[0].clone().try_into().unwrap();
    let root_hash: [u8; 32] = root_raw_bytes[4..].try_into().unwrap();// [4..].try_into().unwrap();
    // root_hash = root_hash[4:];
    let winner_count: u8 =  attestation_fields[1][0];
    let winner_list_uri = attestation_fields[2].clone(); // first 4 bytes are length

    // verify(root_hash, );

    self.resolution.set_inner(
      Resolution {
        root_hash,
        winner_count,
        winner_notclaim_count: winner_count,
        winner_list_uri,
        bump: bumps.resolution
      }
    );
    Ok(())
  }
}