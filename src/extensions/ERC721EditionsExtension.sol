// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

/**
 * @author Sam King (samkingstudio.eth) for Fount Gallery
 * @title ERC-721 editions extension
 * @notice Adds support for edition based token ids for ERC-721 contracts
 */
abstract contract ERC721EditionsExtension {
    /* ------------------------------------------------------------------------
                                   S T O R A G E
    ------------------------------------------------------------------------ */

    /// @dev Total number of editions per base token
    uint256 internal _editionsPerToken;

    /* ------------------------------------------------------------------------
                                    E R R O R S
    ------------------------------------------------------------------------ */

    error InvalidId();

    /* ------------------------------------------------------------------------
                                      I N I T
    ------------------------------------------------------------------------ */

    /**
     * @param editionsPerToken_ The total number of editions per base token
     */
    constructor(uint256 editionsPerToken_) {
        _editionsPerToken = editionsPerToken_;
    }

    /* ------------------------------------------------------------------------
                                I D   G E T T E R S
    ------------------------------------------------------------------------ */

    /**
     * @notice Converts a standard token id into it's base token id.
     * For example, if editions per token is 5, then:
     *   `id`     = 6
     *   `baseId` = 2
     *
     * @param id The standard token id to convert
     * @return baseId The base token id of `id`
     */
    function tokenIdToBaseId(uint256 id) public view virtual returns (uint256 baseId) {
        (baseId, ) = _tokenIdToEditionInfo(id);
    }

    /**
     * @notice Converts a standard token id into it's edition number.
     * For example, if editions per token is 5, then:
     *   `id`            = 8
     *   `editionNumber` = 3
     *
     * @param id The standard token id to convert
     * @return editionNumber The edition number of `id`
     */
    function tokenIdToEditionNumber(uint256 id)
        public
        view
        virtual
        returns (uint256 editionNumber)
    {
        (, editionNumber) = _tokenIdToEditionInfo(id);
    }

    /**
     * @notice Converts a standard token id into it's edition related parts.
     * For example, if editions per token is 5, then:
     *   `id`            = 8
     *   `baseId`        = 2
     *   `editionNumber` = 3
     *
     * Token ID: 8
     * Example title: "NFT #2 (Edition 3 of 5)"
     *
     * @param id The standard token id to convert
     * @return baseId The base token id of `id`
     * @return editionNumber The edition number of `id`
     */
    function tokenIdToEditionInfo(uint256 id)
        public
        view
        virtual
        returns (uint256 baseId, uint256 editionNumber)
    {
        return _tokenIdToEditionInfo(id);
    }

    /**
     * @dev Internal function to convert a standard token id into it's edition related parts.
     * Reverts if `id` is zero since this assumes token ids start at 1.
     *
     * @param id The standard token id to convert
     * @return baseId The base token id of `id`
     * @return editionNumber The edition number of `id`
     */
    function _tokenIdToEditionInfo(uint256 id)
        internal
        view
        returns (uint256 baseId, uint256 editionNumber)
    {
        // Revert if using zero as a token id
        if (id == 0) revert InvalidId();

        // Save on multiple SLOADs
        uint256 editionsPerToken = _editionsPerToken;

        unchecked {
            baseId = ((id - 1) / editionsPerToken) + 1;
            uint256 remainder = id % editionsPerToken;
            editionNumber = remainder == 0 ? editionsPerToken : remainder;
        }
    }
}
