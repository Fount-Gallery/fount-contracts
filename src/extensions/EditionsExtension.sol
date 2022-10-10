// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

/**
 * @author Sam King (samkingstudio.eth) for Fount Gallery
 * @title ERC-721 based editions extension
 * @notice Adds support for edition based token ids for ERC-721 contracts
 */
abstract contract EditionsExtension {
    /* ------------------------------------------------------------------------
                                   S T O R A G E
    ------------------------------------------------------------------------ */

    /// @dev Total number of editions per base token
    uint256 internal _editionsPerToken;

    /// @dev The maximum number of base tokens that are available
    uint256 internal _maxBaseTokenId;

    /// @dev Keeps track of collected editions for a given base token ID
    mapping(uint256 => uint256) internal _editionsCollectedForBaseId;

    /* ------------------------------------------------------------------------
                                    E R R O R S
    ------------------------------------------------------------------------ */

    error InvalidTokenId();
    error InvalidBaseId();
    error InvalidEditionNumber();
    error EditionSoldOut();

    /* ------------------------------------------------------------------------
                                 M O D I F I E R S
    ------------------------------------------------------------------------ */

    /**
     * @dev Only when there are still editions available for a given base token ID
     */
    modifier onlyWhenEditionsAvailable(uint256 baseId) {
        if (baseId == 0 || baseId > _maxBaseTokenId) revert InvalidBaseId();
        if (_editionsCollectedForBaseId[baseId] == _editionsPerToken) revert EditionSoldOut();
        _;
    }

    /* ------------------------------------------------------------------------
                                      I N I T
    ------------------------------------------------------------------------ */

    /**
     * @param editionsPerToken_ The total number of editions per base token
     * @param maxBaseTokenId_ The total number of base tokens available
     */
    constructor(uint256 editionsPerToken_, uint256 maxBaseTokenId_) {
        _editionsPerToken = editionsPerToken_;
        _maxBaseTokenId = maxBaseTokenId_;
    }

    /* ------------------------------------------------------------------------
                          C O L L E C T   E D I T I O N S
    ------------------------------------------------------------------------ */

    /**
     * @notice Mark the next edition of a base token ID as collected
     * @dev To prevent editions being collected more than once, you'll have to add
     * your own checks when collecting, usually using `onlyWhenEditionsAvailable()`.
     * @param baseId The base token id that was collected
     */
    function _collectEdition(uint256 baseId) internal {
        _editionsCollectedForBaseId[baseId]++;
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
        if (id == 0) revert InvalidTokenId();

        // Save on multiple SLOADs
        uint256 editionsPerToken = _editionsPerToken;

        unchecked {
            baseId = ((id - 1) / editionsPerToken) + 1;
            uint256 remainder = id % editionsPerToken;
            editionNumber = remainder == 0 ? editionsPerToken : remainder;
        }
    }

    /**
     * @notice Converts edition information into a standard token ID.
     * For example, if editions per token is 5, then:
     *   `baseId`        = 2
     *   `editionNumber` = 3
     *   `id`            = 8
     *
     * @param baseId The base token id of `id`
     * @param editionNumber The edition number of `id`
     * @return id The standard token id to convert
     */
    function editionInfoToTokenId(uint256 baseId, uint256 editionNumber)
        public
        view
        virtual
        returns (uint256 id)
    {
        return _editionInfoToTokenId(baseId, editionNumber);
    }

    /**
     * @dev Internal function to convert edition information into a token ID.
     * Reverts if `baseId` or `editionNumber` is zero since this assumes token ids and
     * editions start at 1.
     *
     * @param baseId The base token id of `id`
     * @param editionNumber The edition number of `id`
     * @return id The standard token id to convert
     */
    function _editionInfoToTokenId(uint256 baseId, uint256 editionNumber)
        internal
        view
        returns (uint256 id)
    {
        // Revert if using zero as a token id
        if (baseId == 0) revert InvalidBaseId();
        if (editionNumber == 0) revert InvalidEditionNumber();

        // Save on multiple SLOADs
        uint256 editionsPerToken = _editionsPerToken;

        unchecked {
            id = ((baseId - 1) * editionsPerToken) + editionNumber;
        }
    }
}
