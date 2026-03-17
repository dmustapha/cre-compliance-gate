// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ComplianceVault} from "../src/ComplianceVault.sol";

/// @title Debug-phase tests: edge cases, security, integration
/// @notice Added by debug skill — does NOT modify build's tests
contract ComplianceVaultDebugTest is Test {
    ComplianceVault public vault;
    address public owner = address(this);
    address public creAddress = makeAddr("cre");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        vault = new ComplianceVault(owner);
        vault.setCREAddress(creAddress);
    }

    // ========== EDGE CASES: deposit ==========

    /// @notice Deposit for address(0) — should succeed (no guard in contract)
    function test_deposit_addressZero() public {
        vm.deal(creAddress, 1 ether);
        vm.prank(creAddress);
        vault.deposit{value: 0.1 ether}(address(0));
        assertEq(vault.getBalance(address(0)), 0.1 ether);
    }

    /// @notice Deposit with maximum uint value worth of ETH (gas)
    function test_deposit_largeAmount() public {
        uint256 largeAmount = 1000 ether;
        vm.deal(creAddress, largeAmount);
        vm.prank(creAddress);
        vault.deposit{value: largeAmount}(alice);
        assertEq(vault.getBalance(alice), largeAmount);
        assertEq(vault.totalDeposits(), largeAmount);
    }

    /// @notice Multiple deposits to same user accumulate
    function test_deposit_accumulates() public {
        vm.deal(creAddress, 10 ether);

        vm.prank(creAddress);
        vault.deposit{value: 1 ether}(alice);

        vm.prank(creAddress);
        vault.deposit{value: 2 ether}(alice);

        vm.prank(creAddress);
        vault.deposit{value: 3 ether}(alice);

        assertEq(vault.getBalance(alice), 6 ether);
        assertEq(vault.totalDeposits(), 6 ether);
    }

    // ========== EDGE CASES: withdraw ==========

    /// @notice Withdraw exact full balance (boundary)
    function test_withdraw_exactBalance() public {
        vm.deal(creAddress, 1 ether);
        vm.prank(creAddress);
        vault.deposit{value: 1 ether}(alice);

        vm.prank(alice);
        vault.withdraw(1 ether);
        assertEq(vault.getBalance(alice), 0);
        assertEq(vault.totalDeposits(), 0);
    }

    /// @notice Withdraw more than balance reverts
    function test_withdraw_overBalance() public {
        vm.deal(creAddress, 1 ether);
        vm.prank(creAddress);
        vault.deposit{value: 0.5 ether}(alice);

        vm.prank(alice);
        vm.expectRevert(ComplianceVault.InsufficientBalance.selector);
        vault.withdraw(0.5 ether + 1);
    }

    /// @notice Double withdraw — second should fail
    function test_withdraw_doubleDrain() public {
        vm.deal(creAddress, 1 ether);
        vm.prank(creAddress);
        vault.deposit{value: 1 ether}(alice);

        vm.prank(alice);
        vault.withdraw(1 ether);

        vm.prank(alice);
        vm.expectRevert(ComplianceVault.InsufficientBalance.selector);
        vault.withdraw(1);
    }

    /// @notice User who never deposited cannot withdraw
    function test_withdraw_noDeposit() public {
        vm.prank(bob);
        vm.expectRevert(ComplianceVault.InsufficientBalance.selector);
        vault.withdraw(1);
    }

    // ========== REENTRANCY CHECK ==========

    /// @notice Reentrancy attempt on withdraw
    function test_withdraw_reentrancy() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(vault));

        // Fund the attacker via CRE deposit
        vm.deal(creAddress, 2 ether);
        vm.prank(creAddress);
        vault.deposit{value: 1 ether}(address(attacker));

        // Attack should fail — withdraw updates state before call
        // Due to checks-effects-interactions pattern, reentrancy drains
        // only if balance wasn't zeroed. Let's verify the balance is correct.
        vm.prank(address(attacker));
        // The attacker tries to withdraw and re-enter
        // Since state is updated before the external call, the second
        // withdraw attempt will revert with InsufficientBalance
        attacker.attack(1 ether);

        // After attack, attacker should only have withdrawn 1 ether (not more)
        assertEq(vault.getBalance(address(attacker)), 0);
    }

    // ========== ACCESS CONTROL ==========

    /// @notice setCREAddress to address(0) — allowed (effectively disabling deposits)
    function test_setCREAddress_toZero() public {
        vault.setCREAddress(address(0));
        assertEq(vault.creAddress(), address(0));
    }

    /// @notice After CRE address change, old CRE cannot deposit
    function test_deposit_afterCREChange() public {
        address newCRE = makeAddr("newCRE");
        vault.setCREAddress(newCRE);

        vm.deal(creAddress, 1 ether);
        vm.prank(creAddress);
        vm.expectRevert(ComplianceVault.OnlyCRE.selector);
        vault.deposit{value: 0.5 ether}(alice);
    }

    /// @notice New CRE can deposit after change
    function test_deposit_newCREWorks() public {
        address newCRE = makeAddr("newCRE");
        vault.setCREAddress(newCRE);

        vm.deal(newCRE, 1 ether);
        vm.prank(newCRE);
        vault.deposit{value: 0.5 ether}(alice);
        assertEq(vault.getBalance(alice), 0.5 ether);
    }

    // ========== RECEIVE FUNCTION ==========

    /// @notice Contract can receive ETH directly via receive()
    function test_receive_directETH() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool success,) = address(vault).call{value: 0.5 ether}("");
        assertTrue(success);
        // Direct ETH doesn't increase any user's balance or totalDeposits
        assertEq(vault.totalDeposits(), 0);
        assertEq(address(vault).balance, 0.5 ether);
    }

    // ========== EVENT EMISSION ==========

    /// @notice Withdrawal emits correct event
    function test_withdraw_emitsEvent() public {
        vm.deal(creAddress, 1 ether);
        vm.prank(creAddress);
        vault.deposit{value: 1 ether}(alice);

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit ComplianceVault.Withdrawal(alice, 0.5 ether, block.timestamp);
        vault.withdraw(0.5 ether);
    }

    /// @notice CREAddressUpdated event on setCREAddress
    function test_setCREAddress_eventValues() public {
        address newCRE = makeAddr("newCRE2");
        vm.expectEmit(true, true, false, false);
        emit ComplianceVault.CREAddressUpdated(creAddress, newCRE);
        vault.setCREAddress(newCRE);
    }

    // ========== STATE CONSISTENCY ==========

    /// @notice totalDeposits tracks correctly across multiple deposits + withdrawals
    function test_totalDeposits_consistency() public {
        vm.deal(creAddress, 10 ether);

        vm.prank(creAddress);
        vault.deposit{value: 3 ether}(alice);

        vm.prank(creAddress);
        vault.deposit{value: 2 ether}(bob);

        assertEq(vault.totalDeposits(), 5 ether);

        vm.prank(alice);
        vault.withdraw(1 ether);

        assertEq(vault.totalDeposits(), 4 ether);

        vm.prank(bob);
        vault.withdraw(2 ether);

        assertEq(vault.totalDeposits(), 2 ether);
        assertEq(vault.getBalance(alice), 2 ether);
        assertEq(vault.getBalance(bob), 0);
    }

    // ========== FUZZ TESTS ==========

    /// @notice Fuzz deposit amount
    function testFuzz_deposit(uint96 amount) public {
        vm.assume(amount > 0);
        vm.deal(creAddress, uint256(amount));
        vm.prank(creAddress);
        vault.deposit{value: uint256(amount)}(alice);
        assertEq(vault.getBalance(alice), uint256(amount));
    }

    /// @notice Fuzz withdraw — cannot withdraw more than deposited
    function testFuzz_withdrawBounded(uint96 depositAmt, uint96 withdrawAmt) public {
        vm.assume(depositAmt > 0);
        vm.assume(withdrawAmt > 0);

        vm.deal(creAddress, uint256(depositAmt));
        vm.prank(creAddress);
        vault.deposit{value: uint256(depositAmt)}(alice);

        if (withdrawAmt > depositAmt) {
            vm.prank(alice);
            vm.expectRevert(ComplianceVault.InsufficientBalance.selector);
            vault.withdraw(uint256(withdrawAmt));
        } else {
            vm.prank(alice);
            vault.withdraw(uint256(withdrawAmt));
            assertEq(vault.getBalance(alice), uint256(depositAmt) - uint256(withdrawAmt));
        }
    }
}

/// @notice Helper contract for reentrancy testing
contract ReentrancyAttacker {
    ComplianceVault public vault;
    uint256 public attackCount;

    constructor(address _vault) {
        vault = ComplianceVault(payable(_vault));
    }

    function attack(uint256 amount) external {
        attackCount = 0;
        vault.withdraw(amount);
    }

    receive() external payable {
        attackCount++;
        if (attackCount < 3) {
            try vault.withdraw(msg.value) {} catch {}
        }
    }
}
