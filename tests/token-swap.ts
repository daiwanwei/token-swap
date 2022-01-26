import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {TokenSwap} from '../target/types/token_swap';
import {TOKEN_PROGRAM_ID, Token} from "@solana/spl-token";
import {PublicKey, SystemProgram, Transaction, Connection, Commitment} from '@solana/web3.js';
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import {assert} from "chai";

describe('token-swap', () => {
    const commitment: Commitment = 'processed';
    const connection = new Connection(
        "http://localhost:8899",
        {commitment},
    );
    const options = anchor.Provider.defaultOptions();
    const wallet = NodeWallet.local();
    const provider = new anchor.Provider(connection, wallet, options);
    anchor.setProvider(provider);


    let program = anchor.workspace.TokenSwap as Program<TokenSwap>;
    let annAccount = anchor.web3.Keypair.generate()
    let weiAccount = anchor.web3.Keypair.generate()
    let annTokenAccountTW
    let annTokenAccountUS

    let weiTokenAccountTW, weiTokenAccountUS

    let tokenTW, tokenUS

    let vaultAccount;
    let vaultAccountBump;

    beforeEach(async function () {
        let tokenPublisher = anchor.web3.Keypair.generate()
        // Airdropping tokens to a payer.
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(tokenPublisher.publicKey, 10000000000),
            "processed"
        );

        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(annAccount.publicKey, 10000000000),
            "processed"
        );

        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(weiAccount.publicKey, 10000000000),
            "processed"
        );

        tokenTW = await Token.createMint(
            connection,
            tokenPublisher,
            tokenPublisher.publicKey,
            null,
            0,
            TOKEN_PROGRAM_ID
        );

        tokenUS = await Token.createMint(
            connection,
            tokenPublisher,
            tokenPublisher.publicKey,
            null,
            0,
            TOKEN_PROGRAM_ID
        );

        annTokenAccountTW = await tokenTW.createAccount(annAccount.publicKey);
        weiTokenAccountTW = await tokenTW.createAccount(weiAccount.publicKey);

        annTokenAccountUS = await tokenUS.createAccount(annAccount.publicKey);
        weiTokenAccountUS = await tokenUS.createAccount(weiAccount.publicKey);

        const tokenTWTotal=10000
        const tokenUSTotal=10000

        await tokenTW.mintTo(
            annTokenAccountTW,
            tokenPublisher.publicKey,
            [tokenPublisher],
            tokenTWTotal
        );

        await tokenUS.mintTo(
            weiTokenAccountUS,
            tokenPublisher.publicKey,
            [tokenPublisher],
            tokenUSTotal
        );

        let tokenTWInfoOfAnn = await tokenTW.getAccountInfo(annTokenAccountTW);
        let tokenUSInfoOfWei = await tokenUS.getAccountInfo(weiTokenAccountUS);

        assert.ok(tokenTWInfoOfAnn.amount.toNumber() == tokenTWTotal);
        assert.ok(tokenUSInfoOfWei.amount.toNumber() == tokenUSTotal);
    })

    it('initialize', async () => {
        // Add your test here.
        const tx = await program.rpc.initialize({});
        console.log("Your transaction signature", tx);
    });

    it('create order', async () => {

        [vaultAccount, vaultAccountBump] = await PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("token-seed"))],
            program.programId
        );
        const orderAccount = anchor.web3.Keypair.generate();
        const offerAmount=100;
        const expectAmount=200;
        await program.rpc.createOrder(
            vaultAccountBump,
            new anchor.BN(offerAmount),
            new anchor.BN(expectAmount),
            {
                accounts: {
                    proponent: annAccount.publicKey,
                    tokenVaultAccount: vaultAccount,
                    mintAccount: tokenTW.publicKey,
                    tokenDepositAccount: annTokenAccountTW,
                    tokenReceiveAccount: annTokenAccountUS,
                    orderAccount: orderAccount.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                    tokenProgram: TOKEN_PROGRAM_ID,
                },
                instructions: [
                    await program.account.orderAccount.createInstruction(orderAccount),
                ],
                signers: [orderAccount, annAccount],
            }
        );

        let tokenTWInfoOfVault = await tokenTW.getAccountInfo(vaultAccount);

        let order = await program.account.orderAccount.fetch(
            orderAccount.publicKey
        );

        assert.ok(tokenTWInfoOfVault.owner.equals(program.programId));

        // Check that the values in the escrow account match what we expect.
        assert.ok(order.proponent.equals(annAccount.publicKey));
        assert.ok(order.offerAmount.toNumber() == offerAmount);
        assert.ok(order.expectAmount.toNumber() == expectAmount);
        assert.ok(order.tokenDepositAccount.equals(annTokenAccountTW));
        assert.ok(order.tokenReceiveAccount.equals(annTokenAccountUS));

    });
});
