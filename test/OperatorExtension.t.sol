// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC721.sol";
import "../src/extensions/OperatorExtension.sol";

interface IMockNFT {
    function doSomethingWhenOperator() external returns (bool);
}

contract MockNFT is IMockNFT, ERC721, OperatorExtension {
    constructor() ERC721("Mock NFT", "NFT") {}

    function doSomethingWhenOperator() external view onlyWhenOperator returns (bool) {
        return true;
    }

    function mint(address to, uint256 id) external {
        _mint(to, id);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        return "ipfs://<baseHash>/1";
    }

    function addOperator(address operator) public override {
        _addOperator(operator);
    }

    function removeOperator(address operator) public override {
        _removeOperator(operator);
    }

    function operators(address operator) public view returns (bool) {
        return _operators[operator];
    }
}

contract MockOperator {
    IMockNFT public nft;

    constructor(address nft_) {
        nft = IMockNFT(nft_);
    }

    function doSomethingAsOperator() external returns (bool) {
        return nft.doSomethingWhenOperator();
    }
}

contract OperatorExtensionTest is Test {
    MockNFT private nft;
    MockOperator private operator;

    address private collector = makeAddr("collector");

    function setUp() public {
        nft = new MockNFT();
        operator = new MockOperator(address(nft));
    }

    function testOnlyWhenOperator() public {
        // Should fail since it's not being called by an operator
        vm.expectRevert(OperatorExtension.NotOperator.selector);
        nft.doSomethingWhenOperator();

        // Should fail since operator hasn't been added to the nft contract yet
        vm.expectRevert(OperatorExtension.NotOperator.selector);
        operator.doSomethingAsOperator();

        // Set the operator on the nft contract
        nft.addOperator(address(operator));
        assertEq(nft.operators(address(operator)), true);

        // Should now be able to call operator function
        assertEq(operator.doSomethingAsOperator(), true);
    }

    function testAddOperator() public {
        assertEq(nft.operators(address(operator)), false);
        nft.addOperator(address(operator));
        assertEq(nft.operators(address(operator)), true);
    }

    function testRemoveOperator() public {
        assertEq(nft.operators(address(operator)), false);
        nft.addOperator(address(operator));
        assertEq(nft.operators(address(operator)), true);
        nft.removeOperator(address(operator));
        assertEq(nft.operators(address(operator)), false);
    }
}
