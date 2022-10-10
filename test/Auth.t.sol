// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "../src/auth/Auth.sol";

contract MockAuth is Auth {
    constructor(address owner_, address admin_) Auth(owner_, admin_) {}

    bool public flag;

    function updateFlagOwner() public virtual onlyOwner {
        flag = true;
    }

    function updateFlagAdmin() public virtual onlyAdmin {
        flag = true;
    }

    function updateFlagOwnerOrAdmin() public virtual onlyOwnerOrAdmin {
        flag = true;
    }
}

contract AuthTest is Test {
    MockAuth private mockAuth;

    address private ownerA = makeAddr("ownerA");
    address private ownerB = makeAddr("ownerB");
    address private adminA = makeAddr("adminA");
    address private adminB = makeAddr("adminB");

    function setUp() public {
        mockAuth = new MockAuth(ownerA, adminA);
    }

    function testOwner() public {
        assertEq(mockAuth.owner(), ownerA);
        assertEq(mockAuth.admins(adminA), true);
    }

    function testCallableByOwner() public {
        assertEq(mockAuth.flag(), false);
        vm.prank(ownerA);
        mockAuth.updateFlagOwner();
        assertEq(mockAuth.flag(), true);
    }

    function testCallableByAdmin() public {
        assertEq(mockAuth.flag(), false);
        vm.prank(adminA);
        mockAuth.updateFlagAdmin();
        assertEq(mockAuth.flag(), true);
    }

    function testCallableByBothOwner() public {
        assertEq(mockAuth.flag(), false);
        vm.prank(ownerA);
        mockAuth.updateFlagOwnerOrAdmin();
        assertEq(mockAuth.flag(), true);
    }

    function testCallableByBothAdmin() public {
        assertEq(mockAuth.flag(), false);
        vm.prank(adminA);
        mockAuth.updateFlagOwnerOrAdmin();
        assertEq(mockAuth.flag(), true);
    }

    function testCannotCallIfNotOwnerOrAdmin() public {
        assertEq(mockAuth.flag(), false);

        vm.expectRevert("UNAUTHORIZED");
        mockAuth.updateFlagOwner();
        assertEq(mockAuth.flag(), false);

        vm.expectRevert("UNAUTHORIZED");
        mockAuth.updateFlagAdmin();
        assertEq(mockAuth.flag(), false);

        vm.expectRevert("UNAUTHORIZED");
        mockAuth.updateFlagOwnerOrAdmin();
        assertEq(mockAuth.flag(), false);
    }

    function testSetOwner() public {
        assertEq(mockAuth.owner(), ownerA);
        vm.prank(ownerA);
        mockAuth.setOwner(ownerB);
        assertEq(mockAuth.owner(), ownerB);

        vm.expectRevert("UNAUTHORIZED");
        mockAuth.setOwner(ownerA);
    }

    function testAddAmin() public {
        assertEq(mockAuth.admins(adminB), false);
        vm.prank(ownerA);
        mockAuth.addAdmin(adminB);
        assertEq(mockAuth.admins(adminB), true);

        vm.expectRevert("UNAUTHORIZED");
        mockAuth.addAdmin(adminB);
    }

    function testRemoveAdmin() public {
        assertEq(mockAuth.admins(adminA), true);
        vm.prank(ownerA);
        mockAuth.removeAdmin(adminA);
        assertEq(mockAuth.admins(adminA), false);

        vm.expectRevert("UNAUTHORIZED");
        mockAuth.removeAdmin(adminB);
    }
}
