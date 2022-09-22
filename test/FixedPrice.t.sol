// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC721.sol";
import "../src/sales/FixedPrice.sol";

contract MockNFT is ERC721, FixedPrice {
    uint256 public basePrice;

    constructor(uint256 basePrice_) ERC721("Mock NFT", "NFT") {
        basePrice = basePrice_;
    }

    function purchase(address to, uint256 id) external payable onlyWithCorrectPayment(basePrice) {
        _mint(to, id);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        return "ipfs://<baseHash>/1";
    }
}

contract FixedPriceTest is Test {
    MockNFT private nft;

    address private collector = makeAddr("collector");

    uint256 private price = 1 ether;

    function setUp() public {
        nft = new MockNFT(price);
        vm.deal(collector, 10 ether);
    }

    function testOnlyWithCorrectPayment() public {
        vm.startPrank(collector);

        assertEq(nft.balanceOf(collector), 0);

        vm.expectRevert(
            abi.encodeWithSelector(FixedPrice.IncorrectPayment.selector, price, price / 2)
        );
        nft.purchase{value: price / 2}(collector, 1);

        vm.expectRevert(
            abi.encodeWithSelector(FixedPrice.IncorrectPayment.selector, price, price + 1)
        );
        nft.purchase{value: price + 1}(collector, 1);

        nft.purchase{value: price}(collector, 1);
        assertEq(nft.balanceOf(collector), 1);
        assertEq(nft.ownerOf(1), collector);
        assertEq(collector.balance, 10 ether - price);

        vm.stopPrank();
    }
}
