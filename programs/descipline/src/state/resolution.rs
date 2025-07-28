use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Resolution {
    pub winner_count: u8,
    pub merkle_root: Vec<u8>,
    pub winner_list_uri: Vec<u8>,
    pub unresolved_winner_count: u8,
    pub bump: u8, // closed when claimed
}