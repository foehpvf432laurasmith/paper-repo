# Decentralized Academic Paper Repository (Privacy-Preserving)

A privacy-first decentralized academic paper repository that leverages full homomorphic encryption (FHE) and Web3 technologies. Researchers can upload papers and define complex access policies, such as allowing access only to authors of future papers citing the current work. The platform ensures that sensitive academic content remains encrypted while still enabling controlled sharing and knowledge discovery.

## Project Background

Traditional academic publishing systems often face challenges including:

* Centralized access: Publishers control access and can restrict who sees certain papers
* Privacy concerns: Sensitive research data may be exposed to unauthorized parties
* Citation dependency: Tracking and enforcing access based on citation chains is complex
* Inefficient sharing: Collaboration across institutions may be hindered by trust barriers

This repository addresses these issues by using FHE to allow encrypted papers to be processed and access-controlled without exposing raw content.

## Features

### Core Functionality

* **Encrypted Paper Upload**: Authors upload papers encrypted using FHE.
* **Citation-Based Access Control**: Access can be conditioned on citation relationships, ensuring only relevant future authors can view certain papers.
* **Immutable Storage**: Papers stored on decentralized networks like IPFS remain tamper-proof.
* **Transparent Access Logs**: FHE enables verification of access rules without revealing paper content.

### Privacy & Security

* **Client-Side Encryption**: Papers are encrypted before leaving the author's device.
* **Fine-Grained Policies**: Access can be restricted dynamically based on encrypted citation data.
* **Zero-Knowledge Processing**: All computations on encrypted papers are performed without decryption, preserving confidentiality.
* **Auditability**: Access requests and grants are logged in an immutable, auditable manner.

### Collaboration & Knowledge Exchange

* Facilitates secure collaboration among researchers across institutions.
* Encourages open yet controlled sharing of academic knowledge.
* Reduces the risk of intellectual property leaks while maintaining accessibility.

## Architecture

### Smart Contracts (fhEVM)

* Manage encrypted paper submissions and metadata
* Enforce complex access policies using FHE
* Track citation relationships in an encrypted form
* Provide auditable access control logic

### Frontend Application

* Interactive UI for paper submission, browsing, and citation verification
* Handles client-side encryption and FHE operations
* Visualizes citation graphs without exposing raw paper content
* Allows researchers to query access status securely

## Technology Stack

### Blockchain

* **fhEVM**: Executes smart contracts with FHE-based computation
* **Solidity**: Smart contract logic
* **IPFS**: Decentralized storage for encrypted papers

### Frontend

* React + TypeScript for dynamic user interface
* State management for encrypted metadata
* Visualization libraries for citation graphs

### FHE Integration

* Enables encrypted policy evaluation and citation checks
* Allows secure computation on encrypted academic data
* Ensures privacy of both papers and user activity

## Installation

### Prerequisites

* Node.js 18+
* npm / yarn / pnpm
* Ethereum-compatible wallet (optional for certain operations)

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure fhEVM and IPFS nodes
4. Run the frontend: `npm start`

## Usage

* **Upload Paper**: Encrypt and submit a paper along with metadata
* **Define Access Policies**: Specify citation-based access conditions
* **Browse Papers**: View papers you have access to
* **Check Citations**: Validate encrypted citation relationships
* **Audit Access**: Review access logs without revealing paper content

## Security Features

* Full homomorphic encryption ensures that raw paper content is never exposed
* Immutable decentralized storage prevents tampering
* Access control rules enforced on encrypted data
* Auditable logs for transparency and accountability

## Roadmap

* Enhance FHE computations for more complex citation-based rules
* Integrate multi-chain deployment for wider accessibility
* Develop analytics for encrypted citation networks
* Mobile-friendly UI for easier access and collaboration
* Support for additional document formats and metadata

## Conclusion

This platform reimagines academic publishing with privacy-preserving, decentralized technologies. By leveraging FHE, it enables secure, auditable, and citation-aware sharing of scholarly work, ensuring knowledge can flow freely while sensitive research remains protected.
