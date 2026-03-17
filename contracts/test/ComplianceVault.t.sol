// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ComplianceVault} from "../src/ComplianceVault.sol";

contract ComplianceVaultTest is Test {
    ComplianceVault public vault;
    address public owner = address(this);
    address public creAddress = makeAddr("cre");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        vault = new ComplianceVault(owner);
        vault.setCREAddress(creAddress);
    }

    // --- Deposit Tests ---

    function test_deposit_success() public {
        vm.deal(creAddress, 1 ether);
        vm.prank(creAddress);
        vault.deposit{value: 0.5 ether}(alice);

        assertEq(vault.getBalance(alice), 0.5 ether);
        assertEq(vault.totalDeposits(), 0.5 ether);
    }

    function test_deposit_reverts_if_not_cre() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(ComplianceVault.OnlyCRE.selector);
        vault.deposit{value: 0.5 ether}(alice);
    }

    function test_deposit_reverts_if_zero_amount() public {
        vm.prank(creAddress);
        vm.expectRevert(ComplianceVault.ZeroAmount.selector);
        vault.deposit{value: 0}(alice);
    }

    function test_deposit_multiple_users() public {
        vm.deal(creAddress, 2 ether);

        vm.prank(creAddress);
        vault.deposit{value: 0.5 ether}(alice);

        vm.prank(creAddress);
        vault.deposit{value: 0.3 ether}(bob);

        assertEq(vault.getBalance(alice), 0.5 ether);
        assertEq(vault.getBalance(bob), 0.3 ether);
        assertEq(vault.totalDeposits(), 0.8 ether);
    }

    function test_deposit_emits_event() public {
        vm.deal(creAddress, 1 ether);
        vm.prank(creAddress);

        vm.expectEmit(true, false, false, true);
        emit ComplianceVault.Deposit(alice, 0.5 ether, block.timestamp);

        vault.deposit{value: 0.5 ether}(alice);
    }

    // --- Withdrawal Tests ---

    function test_withdraw_success() public {
        // Setup: deposit first
        vm.deal(creAddress, 1 ether);
        vm.prank(creAddress);
        vault.deposit{value: 0.5 ether}(alice);

        // Withdraw
        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        vault.withdraw(0.3 ether);

        assertEq(vault.getBalance(alice), 0.2 ether);
        assertEq(alice.balance, balanceBefore + 0.3 ether);
    }

    function test_withdraw_reverts_if_insufficient_balance() public {
        vm.prank(alice);
        vm.expectRevert(ComplianceVault.InsufficientBalance.selector);
        vault.withdraw(1 ether);
    }

    function test_withdraw_reverts_if_zero_amount() public {
        vm.prank(alice);
        vm.expectRevert(ComplianceVault.ZeroAmount.selector);
        vault.withdraw(0);
    }

    // --- Access Control Tests ---

    function test_setCREAddress_only_owner() public {
        address newCRE = makeAddr("newCRE");
        vault.setCREAddress(newCRE);
        assertEq(vault.creAddress(), newCRE);
    }

    function test_setCREAddress_reverts_if_not_owner() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setCREAddress(makeAddr("newCRE"));
    }

    function test_setCREAddress_emits_event() public {
        address newCRE = makeAddr("newCRE");

        vm.expectEmit(true, true, false, false);
        emit ComplianceVault.CREAddressUpdated(creAddress, newCRE);

        vault.setCREAddress(newCRE);
    }
}
