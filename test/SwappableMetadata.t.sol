// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC721.sol";
import "openzeppelin/utils/Strings.sol";
import "../src/extensions/SwappableMetadata.sol";

interface IMetadata {
    function tokenURI(uint256 id) external view returns (string memory);
}

contract MockMetadata is IMetadata {
    using Strings for uint256;

    function tokenURI(uint256 id) public pure returns (string memory) {
        return string.concat("ipfs://<baseHash>/", id.toString());
    }
}

contract MockMetadataTwo is IMetadata {
    using Strings for uint256;

    function tokenURI(uint256 id) public pure returns (string memory) {
        return string.concat("ipfs://<newBaseHash>/", id.toString());
    }
}

contract MockNFT is ERC721, SwappableMetadata {
    uint256 public basePrice;

    constructor(address metadata_) ERC721("Mock NFT", "NFT") SwappableMetadata(metadata_) {}

    function setMetadataAddress(address metadata_) public override {
        _setMetadataAddress(metadata_);
    }

    function lockMetadata() public {
        _lockMetadata();
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        return IMetadata(metadata).tokenURI(id);
    }
}

contract SwappableMetadataTest is Test {
    MockMetadata private metadata;
    MockNFT private nft;

    function setUp() public {
        metadata = new MockMetadata();
        nft = new MockNFT(address(metadata));
    }

    function testSetsCorrectMetadataUponDeploy() public {
        assertEq(nft.tokenURI(1), "ipfs://<baseHash>/1");
        assertEq(nft.tokenURI(2), "ipfs://<baseHash>/2");
    }

    function testSetsCorrectMetadata() public {
        assertEq(nft.tokenURI(1), "ipfs://<baseHash>/1");

        MockMetadataTwo meta = new MockMetadataTwo();
        nft.setMetadataAddress(address(meta));
        assertEq(nft.tokenURI(1), "ipfs://<newBaseHash>/1");
    }

    function testCannotSetMetadataWhenLocked() public {
        assertEq(nft.isMetadataLocked(), false);
        nft.lockMetadata();
        assertEq(nft.isMetadataLocked(), true);

        MockMetadataTwo meta = new MockMetadataTwo();
        vm.expectRevert(SwappableMetadata.MetadataLocked.selector);
        nft.setMetadataAddress(address(meta));
    }
}
