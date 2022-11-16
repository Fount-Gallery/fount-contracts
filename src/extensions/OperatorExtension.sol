// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

/**
 * @author Sam King (samkingstudio.eth) for Fount Gallery
 * @title  Operator extension
 * @notice To be used by contracts that use the operator pattern for collecting tokens
 *         e.g. a separate contract handles collecting tokens.
 */
abstract contract OperatorExtension {
    /* ------------------------------------------------------------------------
                                   S T O R A G E
    ------------------------------------------------------------------------ */

    /**
     * @notice Contracts that have approval to operate on the base contract
     * @dev Operator contract address => approved
     */
    mapping(address => bool) internal _operators;

    /* ------------------------------------------------------------------------
                                    E R R O R S
    ------------------------------------------------------------------------ */

    error NotOperator();

    /* ------------------------------------------------------------------------
                                    E V E N T S
    ------------------------------------------------------------------------ */

    /**
     * @dev When an operator is added
     * @param operator The operator address
     * @param approved If the operator is approved or not
     */
    event OperatorSet(address indexed operator, bool indexed approved);

    /* ------------------------------------------------------------------------
                                 M O D I F I E R S
    ------------------------------------------------------------------------ */

    /**
     * @dev Modifier that only allows an operator to call
     */
    modifier onlyWhenOperator() {
        if (!_operators[msg.sender]) revert NotOperator();
        _;
    }

    /* ------------------------------------------------------------------------
                                     A D M I N
    ------------------------------------------------------------------------ */

    /**
     * @notice Sets an operator
     * @dev Allows the use of the `onlyWhenOperator()` modifier if approved.
     * @param operator The operator contract address to set
     * @param approved If the operator is approved or not
     */
    function _setOperator(address operator, bool approved) internal {
        _operators[operator] = approved;
        emit OperatorSet(operator, approved);
    }

    /**
     * @dev Force implementation of `setOperator`.
     * Can be overriden to pre-approve token transfers using `isApprovedForAll` for example.
     */
    function setOperator(address operator, bool approved) public virtual;

    /* ------------------------------------------------------------------------
                                   G E T T E R S
    ------------------------------------------------------------------------ */

    /**
     * @notice Checks if an address is an approved operator
     * @param operator The operator address
     * @return isOperator If the address is an approved operator
     */
    function isOperator(address operator) external view returns (bool) {
        return _operators[operator];
    }
}
