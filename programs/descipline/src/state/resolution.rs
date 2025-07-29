use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Resolution {
    pub root_hash: [u8; 32],
    pub winner_count: u8,
    pub winner_notclaim_count: u8,
    #[max_len(128)]
    pub winner_list_uri: Vec<u8>,
    pub bump: u8, // closed when claimed
}