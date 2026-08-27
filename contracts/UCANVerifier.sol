// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title UCANVerifier
 * @notice Validates UCAN (User Controlled Authorization Network) delegation chains and capability attenuation
 * designed for integration with ERC-4337 Smart Account validation (validateUserOp).
 */
contract UCANVerifier {
    
    struct Capability {
        string resource;      // e.g., "lending/pool" or "lending/borrow"
        string action;        // e.g., "deposit", "borrow", "withdraw"
        uint256 maxAmount;    // Caveat: Limit on action value
    }

    struct UCANLink {
        address issuer;       // Owner or intermediate delegator
        address audience;     // Delegated party
        Capability cap;       // Rights being delegated
        uint256 expiration;   // Expiration timestamp
        bytes signature;      // Signature of the issuer verifying this link
    }

    error InvalidChainStart();
    error InvalidChainLinkage(uint256 index);
    error CapabilityViolation(uint256 index);
    error UCANExpired(uint256 index);
    error InvalidIssuerSignature(uint256 index);
    error InvalidDelegateeSignature();

    /**
     * @notice Verifies a full UCAN delegation chain from wallet owner down to the delegatee.
     * @param owner The address of the Smart Wallet owner (root delegator).
     * @param chain The array of UCAN delegation links.
     * @param txHash The transaction hash/UserOp hash being signed and validated.
     * @param delegateeSig The signature of the final delegatee on the txHash.
     */
    function verifyUCANChain(
        address owner,
        UCANLink[] calldata chain,
        bytes32 txHash,
        bytes calldata delegateeSig
    ) external view returns (bool) {
        if (chain.length == 0) revert InvalidChainStart();

        // 1. Root verification: The first delegation must be issued by the Smart Wallet Owner
        if (chain[0].issuer != owner) revert InvalidChainStart();

        // 2. Validate links, expiration, capability attenuation, and signatures
        for (uint256 i = 0; i < chain.length; i++) {
            UCANLink calldata link = chain[i];

            // A. Check Expiry
            if (block.timestamp >= link.expiration) revert UCANExpired(i);

            // B. Chain Linkage: Issuer of step N must be Audience of step N-1
            if (i > 0) {
                if (link.issuer != chain[i - 1].audience) revert InvalidChainLinkage(i);
                
                // C. Capability Attenuation: Child capabilities must be narrower or equal to parent capabilities
                if (link.cap.maxAmount > chain[i - 1].cap.maxAmount) revert CapabilityViolation(i);
                
                // Compare action and resource namespaces
                if (keccak256(bytes(link.cap.resource)) != keccak256(bytes(chain[i - 1].cap.resource)) ||
                    keccak256(bytes(link.cap.action)) != keccak256(bytes(chain[i - 1].cap.action))) {
                    revert CapabilityViolation(i);
                }
            }

            // D. Cryptographic verification of the UCAN delegation step
            bytes32 linkHash = getUCANLinkHash(link);
            address recoveredIssuer = recoverSigner(linkHash, link.signature);
            if (recoveredIssuer != link.issuer) revert InvalidIssuerSignature(i);
        }

        // 3. Delegatee Action Verification
        // The final delegatee (Audience of the last link) must have signed the UserOp hash (txHash)
        address finalDelegatee = chain[chain.length - 1].audience;
        address recoveredTxSigner = recoverSigner(txHash, delegateeSig);
        if (recoveredTxSigner != finalDelegatee) revert InvalidDelegateeSignature();

        return true;
    }

    /**
     * @notice Helper to compute the cryptographic hash of a UCAN link
     */
    function getUCANLinkHash(UCANLink calldata link) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                link.issuer,
                link.audience,
                keccak256(bytes(link.cap.resource)),
                keccak256(bytes(link.cap.action)),
                link.cap.maxAmount,
                link.expiration
            )
        );
    }

    /**
     * @notice Recovers the address that signed the hash
     */
    function recoverSigner(bytes32 hash, bytes calldata signature) public pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        // Adjust v for Ethereum standard
        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) return address(0);

        // Recover signer with Ethereum Signed Message prefix
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        return ecrecover(ethSignedHash, v, r, s);
    }
}
