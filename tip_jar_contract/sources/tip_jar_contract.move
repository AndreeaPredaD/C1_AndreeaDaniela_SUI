/// Module: tip_jar_contract
/// A simple tip jar that transfers tips directly to the owner.
/// Only statistics are stored in the contract; tips are sent immediately.

module tip_jar_contract::tip_jar_contract {

    // -------------------------
    // Imports
    // -------------------------
    use sui::coin::{Coin, value};
    use sui::event;
    use sui::tx_context::sender;
    use sui::sui::SUI;

    // -------------------------
    // Constants
    // -------------------------
    const EInvalidTipAmount: u64 = 1;
    const ENotOwner: u64 = 2;
    const MIN_TIP: u64 = 1; // Minimum allowed tip amount

    // -------------------------
    // TipJar object
    // -------------------------
    public struct TipJar has key {
        id: object::UID,
        owner: address,
        total_tips_received: u64,
        tip_count: u64,
    }

    // -------------------------
    // Events
    // -------------------------
    public struct TipSent has copy, drop {
        tipper: address,
        amount: u64,
        total_tips: u64,
        tip_count: u64,
    }

    public struct TipJarCreated has copy, drop {
        tip_jar_id: object::ID,
        owner: address,
    }

    // -------------------------
    // Create a new TipJar
    // -------------------------
    public fun create_tip_jar(ctx: &mut TxContext) {
        let owner = sender(ctx);
        let tip_jar = TipJar {
            id: object::new(ctx),
            owner,
            total_tips_received: 0,
            tip_count: 0,
        };

        let tip_jar_id = object::id(&tip_jar);

        // Emit creation event
        event::emit(TipJarCreated {
            tip_jar_id,
            owner,
        });

        // Share the tip jar so anyone can send tips
        transfer::share_object(tip_jar);
    }

    // -------------------------
    // Tip functions
    // -------------------------
    public fun send_tip(tip_jar: &mut TipJar, payment: Coin<SUI>, ctx: &mut TxContext) {
        let tip_amount = value(&payment);

        // Check for minimum tip
        assert!(tip_amount >= MIN_TIP, EInvalidTipAmount);

        // Transfer payment directly to the tip jar owner
        transfer::public_transfer(payment, tip_jar.owner);

        // Update statistics
        tip_jar.total_tips_received = tip_jar.total_tips_received + tip_amount;
        tip_jar.tip_count = tip_jar.tip_count + 1;

        // Emit event for tracking
        event::emit(TipSent {
            tipper: sender(ctx),
            amount: tip_amount,
            total_tips: tip_jar.total_tips_received,
            tip_count: tip_jar.tip_count,
        });
    }

    // -------------------------
    // Owner-only functions
    // -------------------------
    public fun reset_stats(tip_jar: &mut TipJar, caller: address) {
        assert!(tip_jar.owner == caller, ENotOwner);
        tip_jar.total_tips_received = 0;
        tip_jar.tip_count = 0;
    }

    public fun change_owner(tip_jar: &mut TipJar, new_owner: address, caller: address) {
        assert!(tip_jar.owner == caller, ENotOwner);
        tip_jar.owner = new_owner;
    }

    // -------------------------
    // View functions
    // -------------------------
    public fun get_total_tips(tip_jar: &TipJar): u64 {
        tip_jar.total_tips_received
    }

    public fun get_tip_count(tip_jar: &TipJar): u64 {
        tip_jar.tip_count
    }

    public fun get_owner(tip_jar: &TipJar): address {
        tip_jar.owner
    }

    public fun is_owner(tip_jar: &TipJar, addr: address): bool {
        tip_jar.owner == addr
    }

    // -------------------------
    // Test-only functions
    // -------------------------
    #[test_only]
    public fun create_for_testing(ctx: &mut TxContext) {
        create_tip_jar(ctx);
    }
}
