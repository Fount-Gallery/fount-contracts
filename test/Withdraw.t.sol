// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../src/utils/Withdraw.sol";

contract MockWithdrawable is Withdraw {
    constructor() {}

    function deposit() external payable {}

    function withdrawETH(address to) public override {
        _withdrawETH(to);
    }

    function withdrawToken(address tokenAddress, address to) public override {
        _withdrawToken(tokenAddress, to);
    }
}

contract MockERC20 is ERC20 {
    constructor() ERC20("Token", "TKN", 18) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract WithdrawTest is Test {
    MockWithdrawable private withdrawable;
    MockERC20 private token;

    address private owner = makeAddr("owner");
    address private collector = makeAddr("collector");

    function setUp() public {
        withdrawable = new MockWithdrawable();
        token = new MockERC20();
        vm.deal(collector, 10 ether);
    }

    function testCanWithdrawEth() public {
        vm.prank(collector);
        withdrawable.deposit{value: 1 ether}();

        assertEq(collector.balance, 9 ether);
        assertEq(address(withdrawable).balance, 1 ether);

        withdrawable.withdrawETH(owner);
        assertEq(owner.balance, 1 ether);
        assertEq(address(withdrawable).balance, 0);
    }

    function testCannotWithdrawEthToSelf() public {
        vm.prank(collector);
        withdrawable.deposit{value: 1 ether}();

        vm.expectRevert(Withdraw.WithdrawFailed.selector);
        withdrawable.withdrawETH(address(withdrawable));
    }

    function testCannotWithdrawEthWithZeroBalance() public {
        vm.expectRevert(Withdraw.ZeroBalance.selector);
        withdrawable.withdrawETH(owner);
    }

    function testCannotWithdrawEthWithZeroBalanceFuzz(address to) public {
        vm.assume(to != address(0));
        vm.assume(to != address(withdrawable));
        vm.expectRevert(Withdraw.ZeroBalance.selector);
        withdrawable.withdrawETH(to);
    }

    function testCanWithdrawTokens() public {
        assertEq(token.balanceOf(address(withdrawable)), 0);
        assertEq(token.balanceOf(owner), 0);

        token.mint(address(withdrawable), 100);
        assertEq(token.balanceOf(address(withdrawable)), 100);

        withdrawable.withdrawToken(address(token), owner);
        assertEq(token.balanceOf(address(withdrawable)), 0);
        assertEq(token.balanceOf(owner), 100);
    }

    function testCanWithdrawTokensFuzz(address to, uint256 amount) public {
        vm.assume(to != address(0));
        vm.assume(to != address(withdrawable));
        vm.assume(amount > 0);

        assertEq(token.balanceOf(address(withdrawable)), 0);
        assertEq(token.balanceOf(to), 0);

        token.mint(address(withdrawable), amount);
        assertEq(token.balanceOf(address(withdrawable)), amount);

        withdrawable.withdrawToken(address(token), to);
        assertEq(token.balanceOf(address(withdrawable)), 0);
        assertEq(token.balanceOf(to), amount);
    }

    function testCannotWithdrawTokensWithZeroBalance() public {
        vm.expectRevert(Withdraw.ZeroBalance.selector);
        withdrawable.withdrawToken(address(token), owner);
    }

    function testCannotWithdrawTokensWithZeroBalanceFuzz(address to) public {
        vm.assume(to != address(0));
        vm.expectRevert(Withdraw.ZeroBalance.selector);
        withdrawable.withdrawToken(address(token), to);
    }
}
