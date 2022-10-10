// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC721.sol";
import "../src/extensions/ERC721EditionsExtension.sol";

contract MockNFT is ERC721, ERC721EditionsExtension {
    constructor(uint256 editionsPerToken_)
        ERC721("Mock NFT", "NFT")
        ERC721EditionsExtension(editionsPerToken_)
    {}

    function tokenURI(uint256) public pure override returns (string memory) {
        return "ipfs://<baseHash>/1";
    }
}

contract ERC721EditionsExtensionTest is Test {
    MockNFT private nft;

    address private collector = makeAddr("collector");

    uint256 private editionSize = 5;

    function setUp() public {
        nft = new MockNFT(editionSize);
    }

    function testTokenIdToBaseId() public {
        vm.expectRevert(ERC721EditionsExtension.InvalidId.selector);
        nft.tokenIdToBaseId(0);

        assertEq(nft.tokenIdToBaseId(1), 1);
        assertEq(nft.tokenIdToBaseId(2), 1);
        assertEq(nft.tokenIdToBaseId(3), 1);
        assertEq(nft.tokenIdToBaseId(4), 1);
        assertEq(nft.tokenIdToBaseId(5), 1);
        assertEq(nft.tokenIdToBaseId(6), 2);
        assertEq(nft.tokenIdToBaseId(7), 2);
        assertEq(nft.tokenIdToBaseId(8), 2);
        assertEq(nft.tokenIdToBaseId(9), 2);
        assertEq(nft.tokenIdToBaseId(10), 2);
        assertEq(nft.tokenIdToBaseId(11), 3);
    }

    function testTokenIdToEditionNumber() public {
        vm.expectRevert(ERC721EditionsExtension.InvalidId.selector);
        nft.tokenIdToEditionNumber(0);

        assertEq(nft.tokenIdToEditionNumber(1), 1);
        assertEq(nft.tokenIdToEditionNumber(2), 2);
        assertEq(nft.tokenIdToEditionNumber(3), 3);
        assertEq(nft.tokenIdToEditionNumber(4), 4);
        assertEq(nft.tokenIdToEditionNumber(5), 5);
        assertEq(nft.tokenIdToEditionNumber(6), 1);
        assertEq(nft.tokenIdToEditionNumber(7), 2);
        assertEq(nft.tokenIdToEditionNumber(8), 3);
        assertEq(nft.tokenIdToEditionNumber(9), 4);
        assertEq(nft.tokenIdToEditionNumber(10), 5);
        assertEq(nft.tokenIdToEditionNumber(11), 1);
    }

    function testTokenIdToEditionInfo() public {
        vm.expectRevert(ERC721EditionsExtension.InvalidId.selector);
        nft.tokenIdToEditionInfo(0);

        for (uint256 i = 1; i <= 12; i++) {
            (uint256 baseId, uint256 editionNumber) = nft.tokenIdToEditionInfo(i);
            uint256 expectedBaseId = ((i - 1) / editionSize) + 1;
            uint256 expectedEditionNumber = (i % editionSize) == 0
                ? editionSize
                : (i % editionSize);

            assertEq(baseId, expectedBaseId);
            assertEq(editionNumber, expectedEditionNumber);
        }
    }

    function testEditionInfoTokTokenId() public {
        vm.expectRevert(ERC721EditionsExtension.InvalidId.selector);
        nft.editionInfoToTokenId(0, 1);

        vm.expectRevert(ERC721EditionsExtension.InvalidId.selector);
        nft.editionInfoToTokenId(1, 0);

        assertEq(nft.editionInfoToTokenId(1, 1), 1);
        assertEq(nft.editionInfoToTokenId(1, 2), 2);
        assertEq(nft.editionInfoToTokenId(1, 3), 3);
        assertEq(nft.editionInfoToTokenId(1, 4), 4);
        assertEq(nft.editionInfoToTokenId(1, 5), 5);
        assertEq(nft.editionInfoToTokenId(2, 1), 6);
        assertEq(nft.editionInfoToTokenId(2, 2), 7);
        assertEq(nft.editionInfoToTokenId(2, 3), 8);
        assertEq(nft.editionInfoToTokenId(2, 4), 9);
        assertEq(nft.editionInfoToTokenId(2, 5), 10);
        assertEq(nft.editionInfoToTokenId(3, 1), 11);
    }
}
