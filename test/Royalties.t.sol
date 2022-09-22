// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC721.sol";
import "../src/utils/Royalties.sol";

contract MockNFT is ERC721, Royalties {
    uint256 public basePrice;

    constructor(address royaltiesReceiver, uint256 royaltiesAmount)
        ERC721("Mock NFT", "NFT")
        Royalties(royaltiesReceiver, royaltiesAmount)
    {}

    function setRoyaltyInfo(address receiver, uint256 amount) external {
        _setRoyaltyInfo(receiver, amount);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, IERC165)
        returns (bool)
    {
        return interfaceId == ROYALTY_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        return "ipfs://<baseHash>/1";
    }
}

contract RoyaltiesTest is Test {
    MockNFT private nft;

    address private owner = makeAddr("owner");
    uint256 private royaltyAmount = 10_00; // 10%

    function setUp() public {
        nft = new MockNFT(owner, royaltyAmount);
    }

    function testRoyaltyInfo() public {
        (address receiver, uint256 amount) = nft.royaltyInfo(1, 10 ether);
        assertEq(receiver, owner);
        assertEq(amount, 1 ether);
    }

    function testSetRoyaltyInfo() public {
        nft.setRoyaltyInfo(owner, 20_00);
        (address receiver, uint256 amount) = nft.royaltyInfo(1, 10 ether);
        assertEq(receiver, owner);
        assertEq(amount, 2 ether);
    }

    function testSetRoyaltyInfoFuzz(address receiver_, uint256 amount_) public {
        vm.assume(100_00 > amount_);
        nft.setRoyaltyInfo(receiver_, amount_);
        (address receiver, uint256 amount) = nft.royaltyInfo(1, 10 ether);
        assertEq(receiver, receiver_);
        assertEq(amount, (10 ether * amount_) / 10000);
    }

    function testCannotSetMoreThan100PercentRoyalty() public {
        vm.expectRevert(Royalties.MoreThanOneHundredPercentRoyalty.selector);
        nft.setRoyaltyInfo(owner, 100_01);
    }
}
