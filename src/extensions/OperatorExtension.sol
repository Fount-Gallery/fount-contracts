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
    mapping(address => bool) public operators;

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
     */
    event OperatorAdded(address indexed operator);

    /**
     * @dev When an operator is removed
     * @param operator The operator address
     */
    event OperatorRemoved(address indexed operator);

    /* ------------------------------------------------------------------------
                                 M O D I F I E R S
    ------------------------------------------------------------------------ */

    /**
     * @dev Modifier that only allows an operator to call
     */
    modifier onlyWhenOperator() {
        if (!operators[msg.sender]) revert NotOperator();
        _;
    }

    /* ------------------------------------------------------------------------
                                     A D M I N
    ------------------------------------------------------------------------ */

    /**
     * @notice Adds an operator
     * @dev Allows the use of the `onlyWhenOperator()` modifier.
     * @param operator The operator contract address to add
     */
    function _addOperator(address operator) internal {
        operators[operator] = true;
        emit OperatorAdded(operator);
    }

    /**
     * @dev Force implementation of `addOperator`.
     * Can be overriden to pre-approve token transfers using `isApprovedForAll` for example.
     */
    function addOperator(address operator) public virtual;

    /**
     * @notice Removes an operator
     * @dev Removes the use of the `onlyWhenOperator()` modifier for the operator
     * @param operator The operator contract address to remove
     */
    function _removeOperator(address operator) internal {
        operators[operator] = false;
        emit OperatorRemoved(operator);
    }

    /**
     * @dev Force implementation of `removeOperator`.
     */
    function removeOperator(address operator) public virtual;
}
