// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "solmate/tokens/ERC721.sol";
import "solmate/tokens/ERC1155.sol";
import "../src/utils/Withdraw.sol";

contract MockWithdrawable is Withdraw, ERC721TokenReceiver, ERC1155TokenReceiver {
    constructor() {}

    function depositETH() external payable {}

    function withdrawETH(address to) public {
        _withdrawETH(to);
    }

    function withdrawToken(address tokenAddress, address to) public {
        _withdrawToken(tokenAddress, to);
    }

    function withdrawERC721Token(
        address tokenAddress,
        uint256 id,
        address to
    ) public {
        _withdrawERC721Token(tokenAddress, id, to);
    }

    function withdrawERC1155Token(
        address tokenAddress,
        uint256 id,
        uint256 amount,
        address to
    ) public {
        _withdrawERC1155Token(tokenAddress, id, amount, to);
    }
}

contract MockERC20 is ERC20 {
    constructor() ERC20("Token", "TKN", 18) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockERC721 is ERC721 {
    constructor() ERC721("NFT", "NFT") {}

    function mint(address to, uint256 id) external {
        _mint(to, id);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        return "mockURI";
    }
}

contract MockERC1155 is ERC1155 {
    constructor() ERC1155() {}

    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external {
        _mint(to, id, amount, "");
    }

    function uri(uint256) public pure override returns (string memory) {
        return "mockURI";
    }
}

contract WithdrawTest is Test {
    MockWithdrawable private withdrawable;
    MockERC20 private erc20;
    MockERC721 private erc721;
    MockERC1155 private erc1155;

    address private owner = makeAddr("owner");
    address private collector = makeAddr("collector");

    function setUp() public {
        withdrawable = new MockWithdrawable();
        erc20 = new MockERC20();
        erc721 = new MockERC721();
        erc1155 = new MockERC1155();
        vm.deal(collector, 10 ether);
    }

    function testCanWithdrawEth() public {
        vm.prank(collector);
        withdrawable.depositETH{value: 1 ether}();

        assertEq(collector.balance, 9 ether);
        assertEq(address(withdrawable).balance, 1 ether);

        withdrawable.withdrawETH(owner);
        assertEq(owner.balance, 1 ether);
        assertEq(address(withdrawable).balance, 0);
    }

    function testCannotWithdrawEthToSelf() public {
        vm.prank(collector);
        withdrawable.depositETH{value: 1 ether}();

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

    function testCanWithdrawERC20Tokens() public {
        assertEq(erc20.balanceOf(address(withdrawable)), 0);
        assertEq(erc20.balanceOf(owner), 0);

        erc20.mint(address(withdrawable), 100);
        assertEq(erc20.balanceOf(address(withdrawable)), 100);

        withdrawable.withdrawToken(address(erc20), owner);
        assertEq(erc20.balanceOf(address(withdrawable)), 0);
        assertEq(erc20.balanceOf(owner), 100);
    }

    function testCanWithdrawERC20TokensFuzz(address to, uint256 amount) public {
        vm.assume(to != address(0));
        vm.assume(to != address(withdrawable));
        vm.assume(amount > 0);

        assertEq(erc20.balanceOf(address(withdrawable)), 0);
        assertEq(erc20.balanceOf(to), 0);

        erc20.mint(address(withdrawable), amount);
        assertEq(erc20.balanceOf(address(withdrawable)), amount);

        withdrawable.withdrawToken(address(erc20), to);
        assertEq(erc20.balanceOf(address(withdrawable)), 0);
        assertEq(erc20.balanceOf(to), amount);
    }

    function testCannotWithdrawERC20TokensWithZeroBalance() public {
        vm.expectRevert(Withdraw.ZeroBalance.selector);
        withdrawable.withdrawToken(address(erc20), owner);
    }

    function testCannotWithdrawERC20TokensWithZeroBalanceFuzz(address to) public {
        vm.assume(to != address(0));
        vm.expectRevert(Withdraw.ZeroBalance.selector);
        withdrawable.withdrawToken(address(erc20), to);
    }

    function testCanWithdrawERC721Tokens() public {
        assertEq(erc721.balanceOf(address(withdrawable)), 0);
        assertEq(erc721.balanceOf(owner), 0);

        erc721.mint(address(withdrawable), 1);
        assertEq(erc721.balanceOf(address(withdrawable)), 1);

        withdrawable.withdrawERC721Token(address(erc721), 1, owner);
        assertEq(erc721.balanceOf(address(withdrawable)), 0);
        assertEq(erc721.balanceOf(owner), 1);
        assertEq(erc721.ownerOf(1), owner);
    }

    function testCanWithdrawERC721TokensFuzz(address to, uint256 id) public {
        vm.assume(to != address(0));
        vm.assume(to != address(withdrawable));
        vm.assume(id > 0);

        assertEq(erc721.balanceOf(address(withdrawable)), 0);
        assertEq(erc721.balanceOf(to), 0);

        erc721.mint(address(withdrawable), id);
        assertEq(erc721.balanceOf(address(withdrawable)), 1);
        assertEq(erc721.ownerOf(id), address(withdrawable));

        withdrawable.withdrawERC721Token(address(erc721), id, to);
        assertEq(erc721.balanceOf(address(withdrawable)), 0);
        assertEq(erc721.balanceOf(to), 1);
        assertEq(erc721.ownerOf(id), to);
    }

    function testCannotWithdrawERC721TokensWithZeroBalance() public {
        erc721.mint(address(this), 1);

        vm.expectRevert(Withdraw.ZeroBalance.selector);
        withdrawable.withdrawERC721Token(address(erc721), 1, owner);
    }

    function testCannotWithdrawERC721TokensWithZeroBalanceFuzz(uint256 id, address to) public {
        vm.assume(to != address(0));
        vm.assume(id != 0);
        erc721.mint(address(this), id);

        vm.expectRevert(Withdraw.ZeroBalance.selector);
        withdrawable.withdrawERC721Token(address(erc721), id, to);
    }

    function testCanWithdrawERC1155Tokens() public {
        uint256 id = 1;
        uint256 amount = 5;

        assertEq(erc1155.balanceOf(address(withdrawable), id), 0);
        assertEq(erc1155.balanceOf(owner, id), 0);

        erc1155.mint(address(withdrawable), id, amount);
        assertEq(erc1155.balanceOf(address(withdrawable), id), amount);

        withdrawable.withdrawERC1155Token(address(erc1155), id, amount, owner);
        assertEq(erc1155.balanceOf(address(withdrawable), id), 0);
        assertEq(erc1155.balanceOf(owner, id), amount);
    }

    function testCanWithdrawERC1155TokensFuzz(
        address to,
        uint256 id,
        uint256 amount
    ) public {
        vm.assume(to != address(0));
        vm.assume(to != address(withdrawable));
        vm.assume(id > 0);
        vm.assume(amount > 0);

        assertEq(erc1155.balanceOf(address(withdrawable), id), 0);
        assertEq(erc1155.balanceOf(owner, id), 0);

        erc1155.mint(address(withdrawable), id, amount);
        assertEq(erc1155.balanceOf(address(withdrawable), id), amount);

        withdrawable.withdrawERC1155Token(address(erc1155), id, amount, owner);
        assertEq(erc1155.balanceOf(address(withdrawable), id), 0);
        assertEq(erc1155.balanceOf(owner, id), amount);
    }

    function testCannotWithdrawERC1155TokensWithLowBalance() public {
        erc1155.mint(address(withdrawable), 1, 5);

        vm.expectRevert(Withdraw.BalanceTooLow.selector);
        withdrawable.withdrawERC1155Token(address(erc1155), 1, 10, owner);
    }

    function testCannotWithdrawERC1155TokensWithLowBalanceFuzz(
        uint256 id,
        uint256 amount,
        address to
    ) public {
        vm.assume(to != address(0));
        vm.assume(id != 0);
        vm.assume(amount > 5);
        erc1155.mint(address(withdrawable), id, amount - 1);

        vm.expectRevert(Withdraw.BalanceTooLow.selector);
        withdrawable.withdrawERC1155Token(address(erc1155), id, amount, to);
    }

    function testCannotWithdrawERC1155TokensWithZeroBalance() public {
        vm.expectRevert(Withdraw.ZeroBalance.selector);
        withdrawable.withdrawERC1155Token(address(erc1155), 1, 10, owner);
    }

    function testCannotWithdrawERC1155TokensWithZeroBalanceFuzz(
        uint256 id,
        uint256 amount,
        address to
    ) public {
        vm.assume(to != address(0));
        vm.assume(id != 0);
        vm.assume(amount != 0);

        vm.expectRevert(Withdraw.ZeroBalance.selector);
        withdrawable.withdrawERC1155Token(address(erc1155), id, amount, to);
    }
}
