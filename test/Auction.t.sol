// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "solmate/tokens/ERC721.sol";
import "../src/sales/Auction.sol";

contract MockNFT is ERC721 {
    constructor() ERC721("Mock NFT", "NFT") {}

    function mint(address to, uint256 id) external {
        _mint(to, id);
    }

    function tokenURI(uint256) public pure override returns (string memory) {
        return "ipfs://<baseHash>/1";
    }
}

contract MockAuction is Auction {
    constructor(
        address nft_,
        uint256 reservePrice,
        uint32 duration,
        uint32 timeBuffer,
        uint32 incrementPercentage
    ) Auction(nft_, AuctionConfig(reservePrice, duration, timeBuffer, incrementPercentage)) {}

    function createAuction(uint256 id, uint256 startTime) external {
        _createAuction(id, startTime);
    }

    function cancelAuction(uint256 id) external {
        _cancelAuction(id);
    }

    function placeBid(uint256 id) external payable {
        _placeBid(id);
    }

    function settleAuction(uint256 id) external {
        _settleAuction(id);
    }
}

contract AuctionTest is Test {
    MockNFT private nft;
    MockAuction private auction;

    address private minter = makeAddr("minter");
    address private bidderA = makeAddr("bidderA");
    address private bidderB = makeAddr("bidderB");

    uint256 private reservePrice = 1 ether;
    uint32 private duration = 24 hours;
    uint32 private timeBuffer = 15 minutes;
    uint32 private incrementPercentage = 10;

    function setUp() public {
        nft = new MockNFT();
        auction = new MockAuction(
            address(nft),
            reservePrice,
            duration,
            timeBuffer,
            incrementPercentage
        );

        vm.deal(bidderA, 10 ether);
        vm.deal(bidderB, 10 ether);

        nft.mint(minter, 1);

        vm.prank(minter);
        nft.setApprovalForAll(address(auction), true);
    }

    function testCreateAuction() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;

        assertEq(nft.balanceOf(minter), 1);
        assertEq(nft.balanceOf(address(auction)), 0);
        assertEq(nft.ownerOf(id), minter);

        auction.createAuction(id, startTime);

        assertEq(auction.auctionHasStarted(id), false);
        assertEq(auction.auctionStartTime(id), startTime);
        assertEq(auction.auctionHasEnded(id), false);
        assertEq(auction.auctionEndTime(id), startTime + duration);
        assertEq(auction.auctionHighestBidder(id), address(0));
        assertEq(auction.auctionHighestBid(id), 0);
        assertEq(auction.auctionListingOwner(id), minter);
        assertEq(auction.totalActiveAuctions(), 1);

        assertEq(nft.balanceOf(minter), 0);
        assertEq(nft.balanceOf(address(auction)), 1);
        assertEq(nft.ownerOf(id), address(auction));
    }

    function testCannotCreateDuplicateAuction() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;

        auction.createAuction(id, startTime);

        vm.expectRevert(Auction.AuctionAlreadyExists.selector);
        auction.createAuction(id, startTime);
    }

    function testCannotCreateAuctionForNonExistentToken() public {
        uint256 id = 2;
        uint256 startTime = block.timestamp + 10 minutes;

        // Will revert if ERC-721 is properly implemented so that
        // `ownerOf` reverts for unminted tokens
        vm.expectRevert("NOT_MINTED");
        auction.createAuction(id, startTime);
    }

    function testCancelAuction() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;

        assertEq(nft.balanceOf(minter), 1);
        assertEq(nft.balanceOf(address(auction)), 0);
        assertEq(nft.ownerOf(id), minter);

        auction.createAuction(id, startTime);

        assertEq(auction.auctionHasStarted(id), false);
        assertEq(auction.auctionStartTime(id), startTime);
        assertEq(auction.auctionHasEnded(id), false);
        assertEq(auction.auctionEndTime(id), startTime + duration);
        assertEq(auction.auctionHighestBidder(id), address(0));
        assertEq(auction.auctionHighestBid(id), 0);
        assertEq(auction.auctionListingOwner(id), minter);
        assertEq(auction.totalActiveAuctions(), 1);

        assertEq(nft.balanceOf(minter), 0);
        assertEq(nft.balanceOf(address(auction)), 1);
        assertEq(nft.ownerOf(id), address(auction));

        auction.cancelAuction(id);

        assertEq(auction.auctionHasStarted(id), false);
        assertEq(auction.auctionStartTime(id), 0);
        assertEq(auction.auctionHasEnded(id), true);
        assertEq(auction.auctionEndTime(id), 0);
        assertEq(auction.auctionHighestBidder(id), address(0));
        assertEq(auction.auctionHighestBid(id), 0);
        assertEq(auction.auctionListingOwner(id), address(0));
        assertEq(auction.totalActiveAuctions(), 0);

        assertEq(nft.balanceOf(minter), 1);
        assertEq(nft.balanceOf(address(auction)), 0);
        assertEq(nft.ownerOf(id), minter);
    }

    function testCannotCancelAuctionThatHasStarted() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;
        auction.createAuction(id, startTime);
        vm.warp(startTime);

        vm.prank(bidderA);
        auction.placeBid{value: reservePrice}(id);

        vm.expectRevert(Auction.AuctionAlreadyStarted.selector);
        auction.cancelAuction(id);
    }

    function testPlaceBid() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;
        auction.createAuction(id, startTime);
        vm.warp(startTime);

        uint256 bidderAPrice = reservePrice;

        vm.prank(bidderA);
        auction.placeBid{value: bidderAPrice}(id);

        // Assert the auction started and the account was debited
        assertEq(bidderA.balance, 10 ether - bidderAPrice);
        assertEq(auction.auctionHasStarted(id), true);
        assertEq(auction.auctionStartTime(id), startTime);
        assertEq(auction.auctionHasEnded(id), false);
        assertEq(auction.auctionEndTime(id), startTime + duration);
        assertEq(auction.auctionHighestBidder(id), bidderA);
        assertEq(auction.auctionHighestBid(id), bidderAPrice);

        uint256 bidderBPrice = bidderAPrice + ((bidderAPrice * incrementPercentage) / 100);

        vm.prank(bidderB);
        auction.placeBid{value: bidderBPrice}(id);

        // Assert bidder B is the new highest bidder
        assertEq(auction.auctionHighestBidder(id), bidderB);
        assertEq(auction.auctionHighestBid(id), bidderBPrice);

        // Assert the refund to the previous highest bidder worked
        assertEq(bidderA.balance, 10 ether);
        assertEq(bidderB.balance, 10 ether - bidderBPrice);
    }

    function testPlaceBidExtendsDurationIfWithinTimeBuffer() public {
        uint256 id = 1;
        uint256 startTime = 1640995200;
        // uint256 startTime = block.timestamp + 10 minutes;
        auction.createAuction(id, startTime);
        vm.warp(startTime);

        vm.prank(bidderA);
        auction.placeBid{value: reservePrice}(id);

        // 5 minutes before the auction is due to end
        uint256 extendedAt = startTime + duration - 5 minutes;

        vm.warp(extendedAt);

        uint256 minBid = reservePrice + ((reservePrice * incrementPercentage) / 100);

        vm.prank(bidderB);
        auction.placeBid{value: minBid}(id);

        /**
         * Auction should now end 10 minutes later than scheduled. Bid placed 5 mins before means
         * adding a 15 minute extension from the time the bid was placed:
         * 15 mins time buffer - 5 mins before end = 10 min extension
         */
        assertEq(auction.auctionEndTime(id), extendedAt + timeBuffer);

        vm.warp(extendedAt + timeBuffer + 1);
        assertEq(auction.auctionHasEnded(id), true);
    }

    function testCannotPlaceBidIfAuctionDoesNotExist() public {
        uint256 id = 1;
        vm.prank(bidderA);
        vm.expectRevert(Auction.AuctionNotStarted.selector);
        auction.placeBid{value: reservePrice}(id);
    }

    function testCannotPlaceBidIfAuctionNotStarted() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;
        auction.createAuction(id, startTime);

        vm.prank(bidderA);
        vm.expectRevert(Auction.AuctionNotStarted.selector);
        auction.placeBid{value: reservePrice}(id);
    }

    function testCannotPlaceBidIfReserveNotMet() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;
        auction.createAuction(id, startTime);
        vm.warp(startTime);

        vm.prank(bidderA);
        vm.expectRevert(
            abi.encodeWithSelector(
                Auction.AuctionReserveNotMet.selector,
                reservePrice,
                reservePrice - 1
            )
        );
        auction.placeBid{value: reservePrice - 1}(id);
    }

    function testCannotPlaceBidIfAuctionHasEnded() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;
        auction.createAuction(id, startTime);
        vm.warp(startTime);

        vm.prank(bidderA);
        auction.placeBid{value: reservePrice}(id);

        vm.warp(startTime + duration + 1);

        vm.prank(bidderB);
        vm.expectRevert(Auction.AuctionEnded.selector);
        auction.placeBid{value: reservePrice}(id);
    }

    function testCannotPlaceSubsequentBidIfMinBidNotMet() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;
        auction.createAuction(id, startTime);
        vm.warp(startTime);

        vm.prank(bidderA);
        auction.placeBid{value: reservePrice}(id);

        vm.warp(startTime + 10 minutes);

        uint256 minBid = reservePrice + ((reservePrice * incrementPercentage) / 100);

        vm.prank(bidderB);
        vm.expectRevert(
            abi.encodeWithSelector(Auction.AuctionMinimumBidNotMet.selector, minBid, minBid - 1)
        );
        auction.placeBid{value: minBid - 1}(id);
    }

    function testSettleAuction() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;
        auction.createAuction(id, startTime);
        vm.warp(startTime);

        assertEq(nft.balanceOf(bidderA), 0);

        vm.prank(bidderA);
        auction.placeBid{value: reservePrice}(id);

        vm.warp(startTime + duration + 1);
        assertEq(auction.auctionHasEnded(id), true);

        vm.prank(bidderA);
        auction.settleAuction(id);

        // Should clean up auction
        assertEq(auction.totalActiveAuctions(), 0);

        // Should transfer the nft to the highest bidder
        assertEq(nft.balanceOf(minter), 0);
        assertEq(nft.balanceOf(address(auction)), 0);
        assertEq(nft.balanceOf(bidderA), 1);
        assertEq(nft.ownerOf(id), bidderA);
    }

    function testCannotSettleAuctionThatHasNotStarted() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;
        auction.createAuction(id, startTime);

        vm.prank(bidderA);
        vm.expectRevert(Auction.AuctionNotStarted.selector);
        auction.settleAuction(id);
    }

    function testCannotSettleAuctionThatIsNotOver() public {
        uint256 id = 1;
        uint256 startTime = block.timestamp + 10 minutes;
        auction.createAuction(id, startTime);
        vm.warp(startTime);

        vm.prank(bidderA);
        auction.placeBid{value: reservePrice}(id);

        vm.warp(startTime + duration - timeBuffer);

        vm.prank(bidderB);
        vm.expectRevert(Auction.AuctionNotOver.selector);
        auction.settleAuction(id);
    }
}
