// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "solmate/tokens/ERC721.sol";

/**
 * @author Sam King (samkingstudio.eth) for Fount Gallery
 * @title ERC721 Premint
 * @notice Extension of solmate/ERC721.sol to include preminting the total supply
 * to an address upon deployment in a gas efficient way.
 */
abstract contract ERC721Premint is ERC721 {
    /// @dev Max number of tokens that were preminted
    uint256 internal _maxTokenId;

    /// @dev Current total supply (set to _maxTokenId on init)
    uint256 internal _totalSupply;

    /// @dev The account where tokens are preminted to
    address internal _premintTo;

    /// @dev Keep track of burned token IDs
    mapping(uint256 => bool) internal _burnedTokenIds;

    /* EIP-2309 EVENTS ----------------------------------------------------- */

    event ConsecutiveTransfer(
        uint256 indexed fromTokenId,
        uint256 toTokenId,
        address indexed fromAddress,
        address indexed toAddress
    );

    /**
     * @dev Initializes the contract
     * @param name_ The ERC-721 name of the contract
     * @param symbol_ The ERC-721 symbol of the contract
     * @param premintTo_ Account to premint the total supply to
     * @param maxSupply_ The max supply of tokens to premint
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address premintTo_,
        uint256 maxSupply_
    ) ERC721(name_, symbol_) {
        _premintTo = premintTo_;
        _maxTokenId = maxSupply_;
        _totalSupply = maxSupply_;

        // Premit tokens to owner
        _balanceOf[premintTo_] = maxSupply_;
        emit ConsecutiveTransfer(1, maxSupply_, address(0), premintTo_);
    }

    /**
     * @return totalSupply The current total supply of tokens
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev {ERC721-ownerOf}.
     * - Reverts if non-existent token.
     * - Falls back to the premint account if the token has never been transferred for
     *   gas efficient preminting.
     * @param id The token id to query
     * @return owner The owner of the token id
     */
    function ownerOf(uint256 id) public view override returns (address) {
        // Token id must be within range
        require(id > 0 && id <= _maxTokenId, "NOT_MINTED");
        // Token id must not be burned
        require(!_burnedTokenIds[id], "NOT_MINTED");

        address owner = _ownerOf[id];
        return owner == address(0) ? _premintTo : owner;
    }

    /**
     * @dev Gives permission to `spender` to transfer `id` token to another account.
     * The approval is cleared when the token is transferred. Only a single account can be
     * approved at a time, so approving the zero address clears previous approvals.
     * Reverts if the caller is not the owner or is not an approved operator for the owner.
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 id) public override {
        address owner = ownerOf(id);
        require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "NOT_AUTHORIZED");
        getApproved[id] = spender;
        emit Approval(owner, spender, id);
    }

    /**
     * @dev Transfers `id` token from `from` to `to`. Clears `approved` on successful transfer.
     * Reverts if:
     * - `from` is not the current owner
     * - `to` is not the zero address
     * - the caller is not `from` or approved via {getApproved} or {isApprovedForAll}.
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 id
    ) public override {
        require(from == ownerOf(id), "WRONG_FROM");
        require(to != address(0), "INVALID_RECIPIENT");
        require(
            msg.sender == from ||
                isApprovedForAll[from][msg.sender] ||
                msg.sender == getApproved[id],
            "NOT_AUTHORIZED"
        );

        // Underflow of the sender's balance is impossible because we check for
        // ownership above and the recipient's balance can't realistically overflow.
        unchecked {
            _balanceOf[from]--;
            _balanceOf[to]++;
        }

        _ownerOf[id] = to;

        delete getApproved[id];

        emit Transfer(from, to, id);
    }

    /**
     * @dev Burns `id` token. Clears ownership data and {getApproved}. Reduces {totalSupply}
     * by one. Reverts if id is out of range or it's already been burned.
     * Emits a {Transfer} event.
     */
    function _burn(uint256 id) internal override {
        address owner = ownerOf(id);

        // Ownership check above ensures no underflow.
        unchecked {
            _balanceOf[owner]--;
            _totalSupply--;
        }

        _ownerOf[id] = address(0);
        _burnedTokenIds[id] = true;

        delete getApproved[id];

        emit Transfer(owner, address(0), id);
    }
}
