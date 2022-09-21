// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC1155.sol";
import "../src/community/FountCardCheck.sol";

contract MockFountCard is ERC1155 {
    constructor() ERC1155() {}

    function mint(address to, uint256 amount) external {
        _mint(to, 1, amount, "");
    }

    function uri(uint256) public pure override returns (string memory) {
        return "ipfs://<baseHash>/1";
    }
}

contract CustomCardCheck is FountCardCheck {
    constructor(address fountCard) FountCardCheck(fountCard) {}

    function onlyForHolders() external view onlyWhenFountCardHolder returns (bool) {
        return true;
    }

    function onlyForHoldersOfAmount(uint256 amount)
        external
        view
        onlyWhenHoldingMinFountCards(amount)
        returns (bool)
    {
        return true;
    }

    function getBalance(address owner) external view returns (uint256) {
        return _getFountCardBalance(owner);
    }

    function isHolder(address owner) external view returns (bool) {
        return _isFountCardHolder(owner);
    }
}

contract FountCardCheckTest is Test {
    CustomCardCheck private cardCheck;
    MockFountCard private fountCard;

    address private holder = mkaddr("holder");
    address private nonHolder = mkaddr("nonHolder");

    function mkaddr(string memory name) public returns (address) {
        address addr = address(uint160(uint256(keccak256(abi.encodePacked(name)))));
        vm.label(addr, name);
        return addr;
    }

    function setUp() public {
        fountCard = new MockFountCard();
        cardCheck = new CustomCardCheck(address(fountCard));
    }

    function testOnlyHolder() public {
        fountCard.mint(holder, 1);
        vm.prank(holder);
        assertEq(cardCheck.onlyForHolders(), true);

        vm.prank(nonHolder);
        vm.expectRevert(FountCardCheck.NotFountCardHolder.selector);
        cardCheck.onlyForHolders();
    }

    function testOnlyHolderOfAmount() public {
        fountCard.mint(holder, 5);
        vm.startPrank(holder);
        assertEq(cardCheck.onlyForHoldersOfAmount(0), true);
        assertEq(cardCheck.onlyForHoldersOfAmount(3), true);
        assertEq(cardCheck.onlyForHoldersOfAmount(5), true);
        vm.stopPrank();

        vm.startPrank(nonHolder);
        vm.expectRevert(
            abi.encodeWithSelector(FountCardCheck.DoesNotHoldEnoughFountCards.selector, 5, 0)
        );
        cardCheck.onlyForHoldersOfAmount(5);

        fountCard.mint(nonHolder, 1);
        vm.expectRevert(
            abi.encodeWithSelector(FountCardCheck.DoesNotHoldEnoughFountCards.selector, 5, 1)
        );
        cardCheck.onlyForHoldersOfAmount(5);

        fountCard.mint(nonHolder, 3);
        vm.expectRevert(
            abi.encodeWithSelector(FountCardCheck.DoesNotHoldEnoughFountCards.selector, 5, 4)
        );
        cardCheck.onlyForHoldersOfAmount(5);
        vm.stopPrank();
    }

    function testGetBalance() public {
        assertEq(cardCheck.getBalance(holder), 0);

        fountCard.mint(holder, 1);
        assertEq(cardCheck.getBalance(holder), 1);

        fountCard.mint(holder, 4);
        assertEq(cardCheck.getBalance(holder), 5);
    }

    function testIsHolder() public {
        assertEq(cardCheck.isHolder(holder), false);

        fountCard.mint(holder, 1);
        assertEq(cardCheck.isHolder(holder), true);

        fountCard.mint(holder, 4);
        assertEq(cardCheck.isHolder(holder), true);
    }
}
