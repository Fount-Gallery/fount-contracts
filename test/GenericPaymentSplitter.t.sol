// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "solmate/tokens/ERC721.sol";
import "solmate/tokens/ERC1155.sol";
import "../src/utils/Withdraw.sol";
import "../src/utils/GenericPaymentSplitter.sol";

contract MockSplitter is GenericPaymentSplitter {
    constructor(address[] memory payees_, uint256[] memory shares_)
        GenericPaymentSplitter(payees_, shares_)
    {}

    function releaseAllETH() public {
        _releaseAllETH();
    }

    function releaseAllToken(address tokenAddress) public {
        _releaseAllToken(tokenAddress);
    }
}

contract MockERC20 is ERC20 {
    constructor() ERC20("Token", "TKN", 18) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract GenericPaymentSplitterTest is Test {
    MockSplitter private splitter;
    MockERC20 private erc20;

    address private depositor = makeAddr("depositor");
    address private payeeA = makeAddr("payeeA");
    address private payeeB = makeAddr("payeeB");
    address private payeeC = makeAddr("payeeC");
    address[] private payees;

    uint256 private sharePayeeA = 60;
    uint256 private sharePayeeB = 30;
    uint256 private sharePayeeC = 10;
    uint256[] private shares;

    function setUp() public {
        payees = [payeeA, payeeB, payeeC];
        shares = [sharePayeeA, sharePayeeB, sharePayeeC];

        splitter = new MockSplitter(payees, shares);
        erc20 = new MockERC20();

        vm.deal(depositor, 10 ether);
    }

    function testCanReleaseAllEth() public {
        vm.prank(depositor);
        (bool success, ) = address(splitter).call{value: 1 ether}("");

        assertEq(success, true);
        assertEq(depositor.balance, 9 ether);
        assertEq(address(splitter).balance, 1 ether);

        splitter.releaseAllETH();
        assertEq(payeeA.balance, 0.6 ether);
        assertEq(payeeB.balance, 0.3 ether);
        assertEq(payeeC.balance, 0.1 ether);
        assertEq(address(splitter).balance, 0);
    }

    function testCanReleaseAllTokens() public {
        erc20.mint(address(splitter), 100);
        assertEq(erc20.balanceOf(address(splitter)), 100);

        splitter.releaseAllToken(address(erc20));
        assertEq(erc20.balanceOf(payeeA), 60);
        assertEq(erc20.balanceOf(payeeB), 30);
        assertEq(erc20.balanceOf(payeeC), 10);
        assertEq(erc20.balanceOf(address(splitter)), 0);
    }
}
