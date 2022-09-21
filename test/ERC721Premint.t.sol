// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "../src/tokens/ERC721Premint.sol";
import {ERC721TokenReceiver} from "solmate/tokens/ERC721.sol";

contract MockERC721Premint is ERC721Premint {
    constructor(
        string memory _name,
        string memory _symbol,
        address _premintTo,
        uint256 _maxSupply
    ) ERC721Premint(_name, _symbol, _premintTo, _maxSupply) {}

    function tokenURI(uint256) public pure virtual override returns (string memory) {}

    function burn(uint256 tokenId) public virtual {
        _burn(tokenId);
    }
}

contract ERC721Recipient is ERC721TokenReceiver {
    address public operator;
    address public from;
    uint256 public id;
    bytes public data;

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _id,
        bytes calldata _data
    ) public virtual override returns (bytes4) {
        operator = _operator;
        from = _from;
        id = _id;
        data = _data;
        return ERC721TokenReceiver.onERC721Received.selector;
    }
}

contract RevertingERC721Recipient is ERC721TokenReceiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) public virtual override returns (bytes4) {
        revert(string(abi.encodePacked(ERC721TokenReceiver.onERC721Received.selector)));
    }
}

contract WrongReturnDataERC721Recipient is ERC721TokenReceiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return 0xCAFEBEEF;
    }
}

contract NonERC721Recipient {
    string public name = "NON ERC721";
}

contract ERC721PremintTest is Test {
    MockERC721Premint private token;

    uint256 private maxSupply = 10000;
    address private minter = mkaddr("minter");
    address private operator = mkaddr("operator");
    address private collector = mkaddr("collector");

    function mkaddr(string memory name) public returns (address) {
        address addr = address(uint160(uint256(keccak256(abi.encodePacked(name)))));
        vm.label(addr, name);
        return addr;
    }

    function setUp() public {
        token = new MockERC721Premint("Token", "TKN", minter, maxSupply);
    }

    function invariantMetadata() public {
        assertEq(token.name(), "Token");
        assertEq(token.symbol(), "TKN");
    }

    function testMint() public {
        assertEq(token.balanceOf(minter), maxSupply);
        assertEq(token.ownerOf(8), minter);
    }

    function testBurn() public {
        token.burn(8);
        assertEq(token.balanceOf(minter), maxSupply - 1);

        vm.expectRevert("NOT_MINTED");
        token.ownerOf(8);
    }

    function testApprove() public {
        vm.prank(minter);
        token.approve(minter, 8);
        assertEq(token.getApproved(8), minter);
    }

    function testApproveBurn() public {
        vm.prank(minter);
        token.approve(minter, 8);

        token.burn(8);

        assertEq(token.balanceOf(minter), maxSupply - 1);
        assertEq(token.getApproved(8), address(0));

        vm.expectRevert("NOT_MINTED");
        token.ownerOf(8);
    }

    function testApproveAll() public {
        vm.prank(minter);
        token.setApprovalForAll(operator, true);
        assertEq(token.isApprovedForAll(minter, operator), true);
    }

    function testTransferFrom() public {
        vm.prank(minter);
        token.approve(address(this), 8);

        token.transferFrom(minter, collector, 8);

        assertEq(token.getApproved(8), address(0));
        assertEq(token.ownerOf(8), collector);
        assertEq(token.balanceOf(collector), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);
    }

    function testTransferFromSelf() public {
        vm.prank(minter);
        token.transferFrom(minter, collector, 8);

        assertEq(token.getApproved(8), address(0));
        assertEq(token.ownerOf(8), collector);
        assertEq(token.balanceOf(collector), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);
    }

    function testTransferFromApproveAll() public {
        vm.prank(minter);
        token.setApprovalForAll(address(this), true);

        token.transferFrom(minter, collector, 8);

        assertEq(token.getApproved(8), address(0));
        assertEq(token.ownerOf(8), collector);
        assertEq(token.balanceOf(collector), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);
    }

    function testSafeTransferFromSelf() public {
        vm.prank(minter);
        token.safeTransferFrom(minter, collector, 8);

        assertEq(token.getApproved(8), address(0));
        assertEq(token.ownerOf(8), collector);
        assertEq(token.balanceOf(collector), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);
    }

    function testSafeTransferFromToEOA() public {
        vm.prank(minter);
        token.setApprovalForAll(address(this), true);

        token.safeTransferFrom(minter, collector, 8);

        assertEq(token.getApproved(8), address(0));
        assertEq(token.ownerOf(8), collector);
        assertEq(token.balanceOf(collector), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);
    }

    function testSafeTransferFromToERC721Recipient() public {
        ERC721Recipient recipient = new ERC721Recipient();

        vm.prank(minter);
        token.setApprovalForAll(address(this), true);

        token.safeTransferFrom(minter, address(recipient), 8);

        assertEq(token.getApproved(8), address(0));
        assertEq(token.ownerOf(8), address(recipient));
        assertEq(token.balanceOf(address(recipient)), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);

        assertEq(recipient.operator(), address(this));
        assertEq(recipient.from(), minter);
        assertEq(recipient.id(), 8);
        assertEq(recipient.data(), "");
    }

    function testSafeTransferFromToERC721RecipientWithData() public {
        ERC721Recipient recipient = new ERC721Recipient();

        vm.prank(minter);
        token.setApprovalForAll(address(this), true);

        token.safeTransferFrom(minter, address(recipient), 8, "custom data");

        assertEq(token.getApproved(8), address(0));
        assertEq(token.ownerOf(8), address(recipient));
        assertEq(token.balanceOf(address(recipient)), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);

        assertEq(recipient.operator(), address(this));
        assertEq(recipient.from(), minter);
        assertEq(recipient.id(), 8);
        assertEq(recipient.data(), "custom data");
    }

    function testCannotBurnUnMinted() public {
        vm.expectRevert("NOT_MINTED");
        token.burn(maxSupply + 1);
    }

    function testCannotDoubleBurn() public {
        token.burn(8);
        vm.expectRevert("NOT_MINTED");
        token.burn(8);
    }

    function testCannotApproveUnMinted() public {
        vm.expectRevert("NOT_MINTED");
        token.approve(minter, maxSupply * 2);
    }

    function testCannotApproveUnAuthorized() public {
        vm.expectRevert("NOT_AUTHORIZED");
        token.approve(collector, 8);
    }

    function testCannotTransferFromUnOwned() public {
        vm.expectRevert("WRONG_FROM");
        token.transferFrom(address(0xFEED), minter, 8);
    }

    function testCannotTransferFromToZero() public {
        vm.expectRevert("INVALID_RECIPIENT");
        token.transferFrom(minter, address(0), 8);
    }

    function testCannotTransferFromNotOwner() public {
        vm.expectRevert("NOT_AUTHORIZED");
        token.transferFrom(minter, collector, 8);
    }

    function testCannotSafeTransferFromToNonERC721Recipient() public {
        NonERC721Recipient recipient = new NonERC721Recipient();
        vm.prank(minter);
        vm.expectRevert();
        token.safeTransferFrom(minter, address(recipient), 8);
    }

    function testCannotSafeTransferFromToNonERC721RecipientWithData() public {
        NonERC721Recipient recipient = new NonERC721Recipient();
        vm.prank(minter);
        vm.expectRevert();
        token.safeTransferFrom(minter, address(recipient), 8, "custom data");
    }

    function testCannotSafeTransferFromToRevertingERC721Recipient() public {
        RevertingERC721Recipient recipient = new RevertingERC721Recipient();
        vm.prank(minter);
        vm.expectRevert(ERC721TokenReceiver.onERC721Received.selector);
        token.safeTransferFrom(minter, address(recipient), 8);
    }

    function testCannotSafeTransferFromToRevertingERC721RecipientWithData() public {
        RevertingERC721Recipient recipient = new RevertingERC721Recipient();
        vm.prank(minter);
        vm.expectRevert(ERC721TokenReceiver.onERC721Received.selector);
        token.safeTransferFrom(minter, address(recipient), 8, "custom data");
    }

    function testCannotSafeTransferFromToERC721RecipientWithWrongReturnData() public {
        WrongReturnDataERC721Recipient recipient = new WrongReturnDataERC721Recipient();
        vm.prank(minter);
        vm.expectRevert("UNSAFE_RECIPIENT");
        token.safeTransferFrom(minter, address(recipient), 8);
    }

    function testCannotSafeTransferFromToERC721RecipientWithWrongReturnDataWithData() public {
        WrongReturnDataERC721Recipient recipient = new WrongReturnDataERC721Recipient();
        vm.prank(minter);
        vm.expectRevert("UNSAFE_RECIPIENT");
        token.safeTransferFrom(minter, address(recipient), 8, "custom data");
    }

    function testCannotBalanceOfZeroAddress() public {
        vm.expectRevert("ZERO_ADDRESS");
        token.balanceOf(address(0));
    }

    function testCannotOwnUnminted() public {
        vm.expectRevert("NOT_MINTED");
        token.ownerOf(maxSupply * 2);
    }

    function testMetadata(string memory name, string memory symbol) public {
        MockERC721Premint nft = new MockERC721Premint(name, symbol, minter, maxSupply);
        assertEq(nft.name(), name);
        assertEq(nft.symbol(), symbol);
    }

    function testBurn(uint256 id) public {
        vm.assume(id > 0 && maxSupply > id);
        token.burn(id);
        vm.expectRevert("NOT_MINTED");
        token.ownerOf(id);
    }

    function testApprove(uint256 id) public {
        vm.assume(id > 0 && maxSupply > id);
        vm.prank(minter);
        token.approve(minter, id);
        assertEq(token.getApproved(id), minter);
    }

    function testApproveBurn(uint256 id) public {
        vm.assume(id > 0 && maxSupply > id);
        vm.prank(minter);
        token.approve(minter, id);

        token.burn(id);

        assertEq(token.balanceOf(minter), maxSupply - 1);
        assertEq(token.getApproved(id), address(0));

        vm.expectRevert("NOT_MINTED");
        token.ownerOf(id);
    }

    function testApproveAll(address to, bool approved) public {
        vm.assume(to != address(0));

        vm.prank(minter);
        token.setApprovalForAll(to, approved);
        assertEq(token.isApprovedForAll(minter, to), approved);
    }

    function testTransferFrom(uint256 id, address to) public {
        vm.assume(id > 0 && maxSupply > id);
        vm.assume(to != address(0));

        vm.prank(minter);
        token.approve(address(this), id);

        token.transferFrom(minter, to, id);

        assertEq(token.getApproved(id), address(0));
        assertEq(token.ownerOf(id), to);
        assertEq(token.balanceOf(to), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);
    }

    function testTransferFromSelf(uint256 id, address to) public {
        vm.assume(id > 0 && maxSupply > id);
        vm.assume(to != address(0));

        vm.prank(minter);
        token.transferFrom(minter, to, id);

        assertEq(token.getApproved(id), address(0));
        assertEq(token.ownerOf(id), to);
        assertEq(token.balanceOf(to), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);
    }

    function testTransferFromApproveAll(uint256 id, address to) public {
        vm.assume(id > 0 && maxSupply > id);
        vm.assume(to != address(0));

        vm.prank(minter);
        token.setApprovalForAll(address(this), true);

        vm.prank(minter);
        token.transferFrom(minter, to, id);

        assertEq(token.getApproved(id), address(0));
        assertEq(token.ownerOf(id), to);
        assertEq(token.balanceOf(to), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);
    }

    function testSafeTransferFromToEOA(uint256 id, address to) public {
        vm.assume(id > 0 && maxSupply > id);
        vm.assume(to != address(0));

        if (uint256(uint160(to)) <= 18 || to.code.length > 0) return;

        vm.prank(minter);
        token.setApprovalForAll(address(this), true);

        vm.prank(minter);
        token.safeTransferFrom(minter, to, id);

        assertEq(token.getApproved(id), address(0));
        assertEq(token.ownerOf(id), to);
        assertEq(token.balanceOf(to), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);
    }

    function testSafeTransferFromToERC721Recipient(uint256 id) public {
        vm.assume(id > 0 && maxSupply > id);

        ERC721Recipient recipient = new ERC721Recipient();

        vm.prank(minter);
        token.setApprovalForAll(address(this), true);

        token.safeTransferFrom(minter, address(recipient), id);

        assertEq(token.getApproved(id), address(0));
        assertEq(token.ownerOf(id), address(recipient));
        assertEq(token.balanceOf(address(recipient)), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);

        assertEq(recipient.operator(), address(this));
        assertEq(recipient.from(), minter);
        assertEq(recipient.id(), id);
        assertEq(recipient.data(), "");
    }

    function testSafeTransferFromToERC721RecipientWithData(uint256 id, bytes calldata data) public {
        vm.assume(id > 0 && maxSupply > id);

        ERC721Recipient recipient = new ERC721Recipient();

        vm.prank(minter);
        token.setApprovalForAll(address(this), true);

        token.safeTransferFrom(minter, address(recipient), id, data);

        assertEq(token.getApproved(id), address(0));
        assertEq(token.ownerOf(id), address(recipient));
        assertEq(token.balanceOf(address(recipient)), 1);
        assertEq(token.balanceOf(minter), maxSupply - 1);

        assertEq(recipient.operator(), address(this));
        assertEq(recipient.from(), minter);
        assertEq(recipient.id(), id);
        assertEq(recipient.data(), data);
    }

    function testCannotBurnUnMinted(uint256 id) public {
        vm.assume(id > maxSupply);
        vm.expectRevert("NOT_MINTED");
        token.burn(id);
    }

    function testCannotDoubleBurn(uint256 id) public {
        vm.assume(id > 0 && maxSupply > id);
        token.burn(id);
        vm.expectRevert("NOT_MINTED");
        token.burn(id);
    }

    function testCannotApproveUnMinted(uint256 id, address to) public {
        vm.assume(id > maxSupply);
        vm.expectRevert("NOT_MINTED");
        token.approve(to, id);
    }

    function testCannotApproveUnAuthorized(
        address owner,
        uint256 id,
        address to
    ) public {
        vm.assume(id > 0 && maxSupply > id);
        vm.assume(owner != address(0) || owner != address(this));
        vm.expectRevert("NOT_AUTHORIZED");
        token.approve(to, id);
    }

    function testCannotTransferFromUnOwned(
        address from,
        address to,
        uint256 id
    ) public {
        vm.assume(id > 0 && maxSupply > id);
        vm.expectRevert("WRONG_FROM");
        token.transferFrom(from, to, id);
    }

    function testCannotTransferFromToZero(uint256 id) public {
        vm.assume(id > 0 && maxSupply > id);
        vm.expectRevert("INVALID_RECIPIENT");
        token.transferFrom(minter, address(0), id);
    }

    function testCannotTransferFromNotOwner(
        address from,
        address to,
        uint256 id
    ) public {
        vm.assume(id > 0 && maxSupply > id);
        vm.assume(to != address(0));
        vm.assume(from != minter && from != address(0));
        vm.prank(from);
        vm.expectRevert("NOT_AUTHORIZED");
        token.transferFrom(minter, to, id);
    }

    function testCannotSafeTransferFromToNonERC721Recipient(uint256 id) public {
        vm.assume(id > 0 && maxSupply > id);
        NonERC721Recipient recipient = new NonERC721Recipient();
        vm.prank(minter);
        vm.expectRevert();
        token.safeTransferFrom(minter, address(recipient), id);
    }

    function testCannotSafeTransferFromToNonERC721RecipientWithData(uint256 id, bytes calldata data)
        public
    {
        vm.assume(id > 0 && maxSupply > id);
        NonERC721Recipient recipient = new NonERC721Recipient();
        vm.prank(minter);
        vm.expectRevert();
        token.safeTransferFrom(minter, address(recipient), id, data);
    }

    function testCannotSafeTransferFromToRevertingERC721Recipient(uint256 id) public {
        vm.assume(id > 0 && maxSupply > id);
        RevertingERC721Recipient recipient = new RevertingERC721Recipient();
        vm.prank(minter);
        vm.expectRevert(ERC721TokenReceiver.onERC721Received.selector);
        token.safeTransferFrom(minter, address(recipient), id);
    }

    function testCannotSafeTransferFromToRevertingERC721RecipientWithData(
        uint256 id,
        bytes calldata data
    ) public {
        vm.assume(id > 0 && maxSupply > id);
        RevertingERC721Recipient recipient = new RevertingERC721Recipient();
        vm.prank(minter);
        vm.expectRevert(ERC721TokenReceiver.onERC721Received.selector);
        token.safeTransferFrom(minter, address(recipient), id, data);
    }

    function testCannotSafeTransferFromToERC721RecipientWithWrongReturnData(uint256 id) public {
        vm.assume(id > 0 && maxSupply > id);
        WrongReturnDataERC721Recipient recipient = new WrongReturnDataERC721Recipient();
        vm.prank(minter);
        vm.expectRevert("UNSAFE_RECIPIENT");
        token.safeTransferFrom(minter, address(recipient), id);
    }

    function testCannotSafeTransferFromToERC721RecipientWithWrongReturnDataWithData(
        uint256 id,
        bytes calldata data
    ) public {
        vm.assume(id > 0 && maxSupply > id);
        WrongReturnDataERC721Recipient recipient = new WrongReturnDataERC721Recipient();
        vm.prank(minter);
        vm.expectRevert("UNSAFE_RECIPIENT");
        token.safeTransferFrom(minter, address(recipient), id, data);
    }
}
