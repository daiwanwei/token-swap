use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, SetAuthority, TokenAccount, Transfer};


declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_swap {
    use spl_token::instruction::AuthorityType;
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }

    pub fn create_order(
        ctx: Context<CreateOrder>,
        vault_account_bump: u8,
        offer_amount: u64,
        expect_amount: u64,
    ) -> ProgramResult {

        ctx.accounts.order_account.proponent = *ctx.accounts.proponent.key;
        ctx.accounts.order_account.token_deposit_account = *ctx
            .accounts
            .token_deposit_account
            .to_account_info()
            .key;
        ctx.accounts.order_account.token_receive_account = *ctx
            .accounts
            .token_receive_account
            .to_account_info()
            .key;
        ctx.accounts.order_account.offer_amount = offer_amount;
        ctx.accounts.order_account.expect_amount = expect_amount;

        // let (vault_authority, _vault_authority_bump) =
        //     Pubkey::find_program_address(&[ESCROW_PDA_SEED], ctx.program_id);
        token::set_authority(
            ctx.accounts.context_for_set_Authority(),
            AuthorityType::AccountOwner,
            Some(*ctx.program_id),
        )?;

        token::transfer(
            ctx.accounts.context_for_transfer(),
            ctx.accounts.order_account.offer_amount,
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
#[instruction(vault_account_bump: u8, offer_amount: u64)]
pub struct CreateOrder<'info> {
    #[account(mut, signer)]
    pub proponent: AccountInfo<'info>,
    #[account(
    mut,
    constraint = token_deposit_account.amount >= offer_amount
    )]
    pub token_deposit_account: Account<'info, TokenAccount>,
    pub token_receive_account: Account<'info, TokenAccount>,
    #[account(zero)]
    pub order_account: Box<Account<'info, OrderAccount>>,
    #[account(
    init,
    seeds = [b"token-seed".as_ref()],
    bump = vault_account_bump,
    payer = proponent,
    token::mint = mint_account,
    token::authority = proponent,
    )]
    pub token_vault_account: Account<'info, TokenAccount>,
    pub mint_account: Account<'info, Mint>,

    pub system_program: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct OrderAccount {
    pub proponent: Pubkey,
    pub token_deposit_account: Pubkey,
    pub token_receive_account: Pubkey,
    pub offer_amount: u64,
    pub expect_amount: u64,
}

impl<'info> CreateOrder<'info> {
    fn context_for_transfer(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self
                .token_deposit_account
                .to_account_info()
                .clone(),
            to: self.token_vault_account.to_account_info().clone(),
            authority:self.proponent.to_account_info().clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }

    fn context_for_set_Authority(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
        let cpi_accounts = SetAuthority {
            account_or_mint: self.token_vault_account.to_account_info().clone(),
            current_authority: self.proponent.clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }
}