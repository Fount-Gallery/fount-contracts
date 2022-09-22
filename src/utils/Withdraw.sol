// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "openzeppelin/token/ERC20/IERC20.sol";

/**
 * @author Sam King (samkingstudio.eth) for Fount Gallery
 * @title  Withdraw ETH and tokens module
 * @notice Allows the withdrawal of ETH and ERC20 tokens
 */
abstract contract Withdraw {
    /* ------------------------------------------------------------------------
                                    E R R O R S
    ------------------------------------------------------------------------ */

    error CannotWithdrawToZeroAddress();
    error WithdrawFailed();
    error ZeroBalance();

    /* ------------------------------------------------------------------------
                                  W I T H D R A W
    ------------------------------------------------------------------------ */

    function withdrawETH(address to) public virtual;

    function _withdrawETH(address to) internal {
        // Prevent withdrawing to the zero address
        if (to == address(0)) revert CannotWithdrawToZeroAddress();

        // Check there is eth to withdraw
        uint256 balance = address(this).balance;
        if (balance == 0) revert ZeroBalance();

        // Transfer funds
        (bool success, ) = payable(to).call{value: balance}("");
        if (!success) revert WithdrawFailed();
    }

    function withdrawToken(address tokenAddress, address to) public virtual;

    function _withdrawToken(address tokenAddress, address to) internal {
        // Prevent withdrawing to the zero address
        if (to == address(0)) revert CannotWithdrawToZeroAddress();

        // Check there are tokens to withdraw
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        if (balance == 0) revert ZeroBalance();

        // Transfer tokens
        bool success = IERC20(tokenAddress).transfer(to, balance);
        if (!success) revert WithdrawFailed();
    }
}
