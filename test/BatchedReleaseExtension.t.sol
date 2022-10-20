// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC721.sol";
import "../src/extensions/BatchedReleaseExtension.sol";

contract MockNFT is ERC721, BatchedReleaseExtension {
    constructor(uint256 totalTokens_, uint256 batchSize_)
        ERC721("Mock NFT", "NFT")
        BatchedReleaseExtension(totalTokens_, batchSize_)
    {}

    function doSomethingWhenActiveBatchIs(uint256 batch)
        external
        view
        onlyWhenActiveBatchIs(batch)
        returns (bool)
    {
        return true;
    }

    function doSomethingWhenTokenIsInBatch(uint256 id, uint256 batch)
        external
        view
        onlyWhenTokenIsInBatch(id, batch)
        returns (bool)
    {
        return true;
    }

    function doSomethingWhenTokenIsInActiveBatch(uint256 id)
        external
        view
        onlyWhenTokenIsInActiveBatch(id)
        returns (bool)
    {
        return true;
    }

    function mint(address to, uint256 id) external {
        _mint(to, id);
        _collectToken(id);
    }

    function mintFromActiveBatch(address to, uint256 id) external onlyWhenTokenIsInActiveBatch(id) {
        _mint(to, id);
        _collectToken(id);
    }

    function mintBatchOne(address to, uint256 id)
        external
        onlyWhenActiveBatchIs(1)
        onlyWhenTokenIsInBatch(id, 1)
    {
        _mint(to, id);
        _collectToken(id);
    }

    function mintBatchTwo(address to, uint256 id)
        external
        onlyWhenActiveBatchIs(2)
        onlyWhenTokenIsInBatch(id, 2)
    {
        _mint(to, id);
        _collectToken(id);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        return "ipfs://<baseHash>/1";
    }

    function goToNextBatch() public override {
        _goToNextBatch();
    }

    function forceSetBatch(uint256 batch) public {
        _forcefullySetBatch(batch);
    }

    function getBatchForTokenId(uint256 id) public view returns (uint256) {
        return _getBatchFromId(id);
    }

    function activeBatch() public view returns (uint256) {
        return _activeBatch;
    }
}

contract BatchedReleaseExtensionTest is Test {
    MockNFT private nft;

    address private collector = makeAddr("collector");

    uint256 private totalTokens = 15;
    uint256 private batchSize = 5;

    function setUp() public {
        nft = new MockNFT(totalTokens, batchSize);
    }

    function testActiveBatchStartsAtZero() public {
        assertEq(nft.activeBatch(), 0);
    }

    function testGoToNextBatch() public {
        assertEq(nft.activeBatch(), 0);

        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 1);

        for (uint256 i = 1; i <= batchSize; i++) {
            nft.mint(collector, i);
            assertEq(nft.activeBatch(), 1);
        }

        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 2);
    }

    function testCannotGoToNextBatchIfNotCollectedEnough() public {
        assertEq(nft.activeBatch(), 0);

        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 1);

        for (uint256 i = 1; i < batchSize; i++) {
            nft.mint(collector, i);
            assertEq(nft.activeBatch(), 1);
        }

        vm.expectRevert(BatchedReleaseExtension.CannotGoToNextBatch.selector);
        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 1);
    }

    function testCannotGoToNextBatchOnceLastBatchIsCollected() public {
        assertEq(nft.activeBatch(), 0);
        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 1);

        for (uint256 i = 1; i <= batchSize; i++) {
            nft.mint(collector, i);
            assertEq(nft.activeBatch(), 1);
        }

        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 2);

        for (uint256 i = batchSize + 1; i <= batchSize * 2; i++) {
            nft.mint(collector, i);
            assertEq(nft.activeBatch(), 2);
        }

        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 3);

        for (uint256 i = batchSize * 2 + 1; i <= batchSize * 3; i++) {
            nft.mint(collector, i);
            assertEq(nft.activeBatch(), 3);
        }

        vm.expectRevert(BatchedReleaseExtension.CannotGoToNextBatch.selector);
        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 3);
    }

    function testOnlyWhenActiveBatchIs() public {
        vm.expectRevert(BatchedReleaseExtension.NotActiveBatch.selector);
        nft.doSomethingWhenActiveBatchIs(1);

        nft.goToNextBatch();
        assertEq(nft.doSomethingWhenActiveBatchIs(1), true);

        for (uint256 i = 1; i <= batchSize; i++) {
            nft.mint(collector, i);
            assertEq(nft.activeBatch(), 1);
        }

        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 2);

        vm.expectRevert(BatchedReleaseExtension.NotActiveBatch.selector);
        nft.doSomethingWhenActiveBatchIs(1);
    }

    function testOnlyWhenTokenIsInBatch() public {
        vm.expectRevert(BatchedReleaseExtension.TokenNotInBatch.selector);
        nft.doSomethingWhenTokenIsInBatch(0, 1);

        vm.expectRevert(BatchedReleaseExtension.TokenNotInBatch.selector);
        nft.doSomethingWhenTokenIsInBatch(batchSize + 1, 1);

        assertEq(nft.doSomethingWhenTokenIsInBatch(1, 1), true);
        assertEq(nft.doSomethingWhenTokenIsInBatch(2, 1), true);
        assertEq(nft.doSomethingWhenTokenIsInBatch(3, 1), true);
        assertEq(nft.doSomethingWhenTokenIsInBatch(4, 1), true);
        assertEq(nft.doSomethingWhenTokenIsInBatch(5, 1), true);
    }

    function testOnlyWhenTokenIsInActiveBatch() public {
        assertEq(nft.activeBatch(), 0);

        vm.expectRevert(BatchedReleaseExtension.TokenNotInActiveBatch.selector);
        nft.doSomethingWhenTokenIsInActiveBatch(1);

        nft.goToNextBatch();

        assertEq(nft.doSomethingWhenTokenIsInActiveBatch(1), true);
        assertEq(nft.doSomethingWhenTokenIsInActiveBatch(2), true);
        assertEq(nft.doSomethingWhenTokenIsInActiveBatch(3), true);
        assertEq(nft.doSomethingWhenTokenIsInActiveBatch(4), true);
        assertEq(nft.doSomethingWhenTokenIsInActiveBatch(5), true);

        for (uint256 i = 1; i <= batchSize; i++) {
            nft.mint(collector, i);
            assertEq(nft.activeBatch(), 1);
        }

        nft.goToNextBatch();

        vm.expectRevert(BatchedReleaseExtension.TokenNotInActiveBatch.selector);
        nft.doSomethingWhenTokenIsInActiveBatch(1);
    }

    function testCollectFromBatchWithModifiers() public {
        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 1);

        nft.mintBatchOne(collector, 1);
        assertEq(nft.balanceOf(collector), 1);
        assertEq(nft.ownerOf(1), collector);

        for (uint256 i = 2; i <= batchSize; i++) {
            nft.mintBatchOne(collector, i);
        }

        assertEq(nft.balanceOf(collector), batchSize);

        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 2);

        for (uint256 i = batchSize + 1; i <= batchSize * 2; i++) {
            nft.mintBatchTwo(collector, i);
        }

        assertEq(nft.balanceOf(collector), batchSize * 2);
    }
}
