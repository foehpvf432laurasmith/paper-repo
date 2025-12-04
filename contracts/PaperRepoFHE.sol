// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PaperRepoFHE is SepoliaConfig {

    struct EncryptedPaper {
        uint256 id;
        euint32 encryptedTitle;
        euint32 encryptedAbstract;
        euint32 encryptedAuthorInfo;
        uint256 timestamp;
    }

    struct DecryptedPaper {
        string title;
        string abstractText;
        string authorInfo;
        bool isRevealed;
    }

    uint256 public paperCount;
    mapping(uint256 => EncryptedPaper) public encryptedPapers;
    mapping(uint256 => DecryptedPaper) public decryptedPapers;

    mapping(string => euint32) private encryptedAuthorCount;
    string[] private authorList;

    mapping(uint256 => uint256) private requestToPaperId;

    event PaperUploaded(uint256 indexed id, uint256 timestamp);
    event DecryptionRequested(uint256 indexed id);
    event PaperDecrypted(uint256 indexed id);

    modifier onlyAuthor(uint256 paperId) {
        _;
    }

    /// @notice Upload a new encrypted paper
    function uploadEncryptedPaper(
        euint32 encryptedTitle,
        euint32 encryptedAbstract,
        euint32 encryptedAuthorInfo
    ) public {
        paperCount += 1;
        uint256 newId = paperCount;

        encryptedPapers[newId] = EncryptedPaper({
            id: newId,
            encryptedTitle: encryptedTitle,
            encryptedAbstract: encryptedAbstract,
            encryptedAuthorInfo: encryptedAuthorInfo,
            timestamp: block.timestamp
        });

        decryptedPapers[newId] = DecryptedPaper({
            title: "",
            abstractText: "",
            authorInfo: "",
            isRevealed: false
        });

        emit PaperUploaded(newId, block.timestamp);
    }

    /// @notice Request decryption of a paper
    function requestPaperDecryption(uint256 paperId) public onlyAuthor(paperId) {
        EncryptedPaper storage paper = encryptedPapers[paperId];
        require(!decryptedPapers[paperId].isRevealed, "Already decrypted");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(paper.encryptedTitle);
        ciphertexts[1] = FHE.toBytes32(paper.encryptedAbstract);
        ciphertexts[2] = FHE.toBytes32(paper.encryptedAuthorInfo);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptPaper.selector);
        requestToPaperId[reqId] = paperId;

        emit DecryptionRequested(paperId);
    }

    /// @notice Callback for decrypted paper data
    function decryptPaper(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 paperId = requestToPaperId[requestId];
        require(paperId != 0, "Invalid request");

        EncryptedPaper storage ePaper = encryptedPapers[paperId];
        DecryptedPaper storage dPaper = decryptedPapers[paperId];
        require(!dPaper.isRevealed, "Already decrypted");

        FHE.checkSignatures(requestId, cleartexts, proof);

        string[] memory results = abi.decode(cleartexts, (string[]));

        dPaper.title = results[0];
        dPaper.abstractText = results[1];
        dPaper.authorInfo = results[2];
        dPaper.isRevealed = true;

        if (FHE.isInitialized(encryptedAuthorCount[dPaper.authorInfo]) == false) {
            encryptedAuthorCount[dPaper.authorInfo] = FHE.asEuint32(0);
            authorList.push(dPaper.authorInfo);
        }
        encryptedAuthorCount[dPaper.authorInfo] = FHE.add(
            encryptedAuthorCount[dPaper.authorInfo],
            FHE.asEuint32(1)
        );

        emit PaperDecrypted(paperId);
    }

    /// @notice Get decrypted paper details
    function getDecryptedPaper(uint256 paperId) public view returns (
        string memory title,
        string memory abstractText,
        string memory authorInfo,
        bool isRevealed
    ) {
        DecryptedPaper storage p = decryptedPapers[paperId];
        return (p.title, p.abstractText, p.authorInfo, p.isRevealed);
    }

    /// @notice Get encrypted author paper count
    function getEncryptedAuthorCount(string memory authorInfo) public view returns (euint32) {
        return encryptedAuthorCount[authorInfo];
    }

    /// @notice Request decryption of author paper count
    function requestAuthorCountDecryption(string memory authorInfo) public {
        euint32 count = encryptedAuthorCount[authorInfo];
        require(FHE.isInitialized(count), "Author not found");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(count);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptAuthorCount.selector);
        requestToPaperId[reqId] = bytes32ToUint(keccak256(abi.encodePacked(authorInfo)));
    }

    /// @notice Callback for decrypted author count
    function decryptAuthorCount(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 authorHash = requestToPaperId[requestId];
        string memory author = getAuthorFromHash(authorHash);

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint32 count = abi.decode(cleartexts, (uint32));
    }

    function bytes32ToUint(bytes32 b) private pure returns (uint256) {
        return uint256(b);
    }

    function getAuthorFromHash(uint256 hash) private view returns (string memory) {
        for (uint i = 0; i < authorList.length; i++) {
            if (bytes32ToUint(keccak256(abi.encodePacked(authorList[i]))) == hash) {
                return authorList[i];
            }
        }
        revert("Author not found");
    }
}
