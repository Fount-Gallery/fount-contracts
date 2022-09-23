// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC721.sol";
import "../src/extensions/BatchedReleaseExtension.sol";
import "../src/extensions/BatchedReleaseOperatorExtension.sol";

interface IMockNFT {
    function doSomethingWhenOperatorForActiveBatch() external returns (bool);

    function doSomethingWhenOperatorForBatch(uint256 batch) external returns (bool);
}

contract MockNFT is IMockNFT, ERC721, BatchedReleaseOperatorExtension {
    constructor(uint256 totalTokens_, uint256 batchSize_)
        ERC721("Mock NFT", "NFT")
        BatchedReleaseOperatorExtension(totalTokens_, batchSize_)
    {}

    function doSomethingWhenOperatorForActiveBatch()
        external
        view
        onlyWhenOperatorForActiveBatch
        returns (bool)
    {
        return true;
    }

    function doSomethingWhenOperatorForBatch(uint256 batch)
        external
        view
        onlyWhenOperatorForBatch(batch)
        returns (bool)
    {
        return true;
    }

    function mint(address to, uint256 id) external {
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

    function setBatchOperator(uint256 batch, address operator) public override {
        _setBatchOperator(batch, operator);
    }
}

contract MockOperator {
    IMockNFT public nft;

    constructor(address nft_) {
        nft = IMockNFT(nft_);
    }

    function doSomethingForActiveBatch() external returns (bool) {
        return nft.doSomethingWhenOperatorForActiveBatch();
    }

    function doSomethingForBatch(uint256 batch) external returns (bool) {
        return nft.doSomethingWhenOperatorForBatch(batch);
    }
}

contract BatchedReleaseOperatorExtensionTest is Test {
    MockNFT private nft;
    MockOperator private operator;

    address private collector = makeAddr("collector");

    uint256 private totalTokens = 15;
    uint256 private batchSize = 5;

    function setUp() public {
        nft = new MockNFT(totalTokens, batchSize);
        operator = new MockOperator(address(nft));
    }

    function testOnlyWhenOperatorForActiveBatch() public {
        assertEq(nft.activeBatch(), 0);

        // Should fail since the following aren't operators of the active batch

        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        nft.doSomethingWhenOperatorForActiveBatch();

        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        operator.doSomethingForActiveBatch();

        // Go to the next batch
        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 1);

        // Operator still hasn't been added to the approved operators yet
        // so these should still revert

        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        nft.doSomethingWhenOperatorForActiveBatch();

        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        operator.doSomethingForActiveBatch();

        // Set the operator on the nft contract
        nft.setBatchOperator(1, address(operator));
        assertEq(nft.operatorForBatch(1), address(operator));

        // Calling an operator only function directly on the nft contract should still revert
        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        nft.doSomethingWhenOperatorForActiveBatch();

        // But it should now pass if called from the operator contract
        assertEq(operator.doSomethingForActiveBatch(), true);

        // Collect tokens and move to batch 2
        for (uint256 i = 1; i <= batchSize; i++) {
            nft.mint(collector, i);
        }

        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 2);

        // No longer the currently active batch so should fail
        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        operator.doSomethingForActiveBatch();
    }

    function testOnlyWhenOperatorForBatch() public {
        assertEq(nft.activeBatch(), 0);

        // Should fail since the following aren't operators of the specified batch,\
        // and the specified batch is not active

        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        nft.doSomethingWhenOperatorForBatch(1);

        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        operator.doSomethingForBatch(1);

        // Go to the next batch
        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 1);

        // Operator still hasn't been added to the approved operators yet
        // so these should still revert

        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        nft.doSomethingWhenOperatorForBatch(1);

        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        operator.doSomethingForBatch(1);

        // Set the operator on the nft contract
        nft.setBatchOperator(1, address(operator));
        assertEq(nft.operatorForBatch(1), address(operator));

        // Calling an operator only function directly on the nft contract should still revert
        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        nft.doSomethingWhenOperatorForBatch(1);

        // But it should now pass if called from the operator contract
        assertEq(operator.doSomethingForBatch(1), true);

        // Collect tokens and move to batch 2
        for (uint256 i = 1; i <= batchSize; i++) {
            nft.mint(collector, i);
        }

        nft.goToNextBatch();
        assertEq(nft.activeBatch(), 2);

        // Second operator has not been added so this should fail
        vm.expectRevert(BatchedReleaseOperatorExtension.NotOperatorForBatch.selector);
        operator.doSomethingForBatch(2);
    }

    function testSetBatchOperator() public {
        assertEq(nft.operatorForBatch(1), address(0));
        nft.setBatchOperator(1, address(operator));
        assertEq(nft.operatorForBatch(1), address(operator));
    }

    function testCannotSetBatchOperatorForInvalidBatch() public {
        vm.expectRevert(BatchedReleaseExtension.InvalidBatch.selector);
        nft.setBatchOperator(0, address(operator));
        assertEq(nft.operatorForBatch(0), address(0));

        vm.expectRevert(BatchedReleaseExtension.InvalidBatch.selector);
        nft.setBatchOperator(4, address(operator));
        assertEq(nft.operatorForBatch(4), address(0));
    }
}
