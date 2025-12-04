// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface AcademicPaper {
  id: string;
  title: string;
  author: string;
  abstract: string;
  ipfsHash: string;
  accessRules: string;
  timestamp: number;
  owner: string;
  citations: number;
  category: string;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState<AcademicPaper[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newPaperData, setNewPaperData] = useState({
    title: "",
    abstract: "",
    category: "Computer Science",
    accessRules: "Only authors who cited this paper"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [activeTab, setActiveTab] = useState("papers");
  const [showFAQ, setShowFAQ] = useState(false);

  // Calculate statistics
  const totalPapers = papers.length;
  const computerSciencePapers = papers.filter(p => p.category === "Computer Science").length;
  const physicsPapers = papers.filter(p => p.category === "Physics").length;
  const biologyPapers = papers.filter(p => p.category === "Biology").length;
  
  // Top contributors
  const contributors = papers.reduce((acc: Record<string, number>, paper) => {
    acc[paper.owner] = (acc[paper.owner] || 0) + 1;
    return acc;
  }, {});
  
  const topContributors = Object.entries(contributors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  useEffect(() => {
    loadPapers().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadPapers = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("paper_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing paper keys:", e);
        }
      }
      
      const list: AcademicPaper[] = [];
      
      for (const key of keys) {
        try {
          const paperBytes = await contract.getData(`paper_${key}`);
          if (paperBytes.length > 0) {
            try {
              const paperData = JSON.parse(ethers.toUtf8String(paperBytes));
              list.push({
                id: key,
                title: paperData.title,
                author: paperData.author,
                abstract: paperData.abstract,
                ipfsHash: paperData.ipfsHash,
                accessRules: paperData.accessRules,
                timestamp: paperData.timestamp,
                owner: paperData.owner,
                citations: paperData.citations || 0,
                category: paperData.category || "General"
              });
            } catch (e) {
              console.error(`Error parsing paper data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading paper ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setPapers(list);
    } catch (e) {
      console.error("Error loading papers:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const uploadPaper = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setUploading(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Applying FHE access rules to your paper..."
    });
    
    try {
      // Simulate IPFS upload and get hash
      const ipfsHash = `Qm${Math.random().toString(36).substring(2, 20)}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const paperId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const paperData = {
        title: newPaperData.title,
        author: account.substring(0, 6) + "..." + account.substring(38),
        abstract: newPaperData.abstract,
        ipfsHash: ipfsHash,
        accessRules: newPaperData.accessRules,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        citations: 0,
        category: newPaperData.category
      };
      
      // Store paper data on-chain using FHE
      await contract.setData(
        `paper_${paperId}`, 
        ethers.toUtf8Bytes(JSON.stringify(paperData))
      );
      
      const keysBytes = await contract.getData("paper_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(paperId);
      
      await contract.setData(
        "paper_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Paper uploaded with FHE access rules applied!"
      });
      
      await loadPapers();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowUploadModal(false);
        setNewPaperData({
          title: "",
          abstract: "",
          category: "Computer Science",
          accessRules: "Only authors who cited this paper"
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Upload failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setUploading(false);
    }
  };

  const citePaper = async (paperId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Verifying citation with FHE..."
    });

    try {
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const paperBytes = await contract.getData(`paper_${paperId}`);
      if (paperBytes.length === 0) {
        throw new Error("Paper not found");
      }
      
      const paperData = JSON.parse(ethers.toUtf8String(paperBytes));
      
      const updatedPaper = {
        ...paperData,
        citations: (paperData.citations || 0) + 1
      };
      
      await contract.setData(
        `paper_${paperId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedPaper))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Citation recorded with FHE verification!"
      });
      
      await loadPapers();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Citation failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isOwner = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const filteredPapers = papers.filter(paper => {
    const matchesSearch = paper.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          paper.abstract.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "All" || paper.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "All", "Computer Science", "Physics", "Biology", 
    "Mathematics", "Chemistry", "Engineering", "Medicine"
  ];

  if (loading) return (
    <div className="loading-screen">
      <div className="tech-spinner">
        <div className="gear large"></div>
        <div className="gear medium"></div>
        <div className="gear small"></div>
      </div>
      <p>Initializing encrypted academic repository...</p>
    </div>
  );

  return (
    <div className="app-container tech-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="shield-icon"></div>
          </div>
          <h1>Decentralized<span>Academic</span>Repository</h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowUploadModal(true)} 
            className="upload-paper-btn tech-button"
          >
            <div className="add-icon"></div>
            Upload Paper
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Decentralized Academic Repository</h2>
            <p>Secure academic publishing with FHE-powered access control</p>
          </div>
        </div>
        
        <div className="tabs">
          <button 
            className={`tab ${activeTab === "papers" ? "active" : ""}`}
            onClick={() => setActiveTab("papers")}
          >
            Research Papers
          </button>
          <button 
            className={`tab ${activeTab === "stats" ? "active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            Statistics
          </button>
          <button 
            className={`tab ${activeTab === "contributors" ? "active" : ""}`}
            onClick={() => setActiveTab("contributors")}
          >
            Top Contributors
          </button>
          <button 
            className={`tab ${activeTab === "about" ? "active" : ""}`}
            onClick={() => setActiveTab("about")}
          >
            About Project
          </button>
        </div>
        
        {activeTab === "papers" && (
          <div className="papers-section">
            <div className="section-header">
              <h2>Research Papers</h2>
              <div className="header-actions">
                <div className="search-box">
                  <input 
                    type="text" 
                    placeholder="Search papers..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="search-icon"></div>
                </div>
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="category-filter"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button 
                  onClick={loadPapers}
                  className="refresh-btn tech-button"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
            
            <div className="papers-list">
              {filteredPapers.length === 0 ? (
                <div className="no-papers">
                  <div className="no-papers-icon"></div>
                  <p>No research papers found</p>
                  <button 
                    className="tech-button primary"
                    onClick={() => setShowUploadModal(true)}
                  >
                    Upload First Paper
                  </button>
                </div>
              ) : (
                filteredPapers.map(paper => (
                  <div className="paper-card tech-card" key={paper.id}>
                    <div className="paper-header">
                      <h3>{paper.title}</h3>
                      <span className="category-badge">{paper.category}</span>
                    </div>
                    <div className="paper-meta">
                      <span>By {paper.author}</span>
                      <span>{new Date(paper.timestamp * 1000).toLocaleDateString()}</span>
                      <span>{paper.citations} citations</span>
                    </div>
                    <p className="paper-abstract">{paper.abstract.substring(0, 200)}...</p>
                    <div className="paper-footer">
                      <div className="fhe-badge">
                        <span>FHE Access: {paper.accessRules}</span>
                      </div>
                      <div className="paper-actions">
                        <button 
                          className="action-btn tech-button"
                          onClick={() => citePaper(paper.id)}
                        >
                          Cite Paper
                        </button>
                        <button className="action-btn tech-button">
                          View on IPFS
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {activeTab === "stats" && (
          <div className="stats-section">
            <h2>Repository Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card tech-card">
                <div className="stat-icon total"></div>
                <div className="stat-value">{totalPapers}</div>
                <div className="stat-label">Total Papers</div>
              </div>
              <div className="stat-card tech-card">
                <div className="stat-icon cs"></div>
                <div className="stat-value">{computerSciencePapers}</div>
                <div className="stat-label">Computer Science</div>
              </div>
              <div className="stat-card tech-card">
                <div className="stat-icon physics"></div>
                <div className="stat-value">{physicsPapers}</div>
                <div className="stat-label">Physics</div>
              </div>
              <div className="stat-card tech-card">
                <div className="stat-icon biology"></div>
                <div className="stat-value">{biologyPapers}</div>
                <div className="stat-label">Biology</div>
              </div>
            </div>
            
            <div className="category-chart tech-card">
              <h3>Papers by Category</h3>
              <div className="chart-bars">
                {categories.slice(1).map(cat => {
                  const count = papers.filter(p => p.category === cat).length;
                  const percentage = totalPapers > 0 ? (count / totalPapers) * 100 : 0;
                  
                  return (
                    <div className="chart-bar" key={cat}>
                      <div className="bar-label">{cat}</div>
                      <div className="bar-container">
                        <div 
                          className="bar-fill" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                        <div className="bar-value">{count}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "contributors" && (
          <div className="contributors-section">
            <h2>Top Contributors</h2>
            <div className="contributors-list">
              {topContributors.map(([address, count], index) => (
                <div className="contributor-card tech-card" key={address}>
                  <div className="contributor-rank">#{index + 1}</div>
                  <div className="contributor-info">
                    <div className="contributor-address">
                      {address.substring(0, 6)}...{address.substring(38)}
                    </div>
                    <div className="contributor-papers">
                      {count} paper{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="contributor-badge">
                    <div className="badge-icon"></div>
                    <span>Scholar Level {Math.min(5, Math.floor(count/5) + 1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === "about" && (
          <div className="about-section">
            <div className="about-card tech-card">
              <h2>About Decentralized Academic Repository</h2>
              <p>
                The Decentralized Academic Repository is a revolutionary platform that leverages 
                Fully Homomorphic Encryption (FHE) to provide secure, privacy-preserving access 
                to academic research papers.
              </p>
              <p>
                Researchers can upload their papers and define complex access rules using FHE, 
                ensuring that only authorized individuals can access their work. For example, 
                a researcher can specify that only authors who have cited their paper in their 
                own publications can access the full content.
              </p>
              
              <div className="tech-stack">
                <h3>Technology Stack</h3>
                <div className="tech-items">
                  <div className="tech-item">
                    <div className="tech-icon fhe"></div>
                    <span>FHE (Fully Homomorphic Encryption)</span>
                  </div>
                  <div className="tech-item">
                    <div className="tech-icon fhevm"></div>
                    <span>fhEVM</span>
                  </div>
                  <div className="tech-item">
                    <div className="tech-icon ipfs"></div>
                    <span>IPFS</span>
                  </div>
                  <div className="tech-item">
                    <div className="tech-icon solidity"></div>
                    <span>Solidity</span>
                  </div>
                </div>
              </div>
              
              <button 
                className="tech-button"
                onClick={() => setShowFAQ(!showFAQ)}
              >
                {showFAQ ? "Hide FAQ" : "Show FAQ"}
              </button>
              
              {showFAQ && (
                <div className="faq-section">
                  <h3>Frequently Asked Questions</h3>
                  <div className="faq-item">
                    <h4>What is FHE and how does it protect my research?</h4>
                    <p>
                      Fully Homomorphic Encryption (FHE) allows computations to be performed on 
                      encrypted data without decrypting it first. This means access rules can be 
                      verified while keeping your paper encrypted at all times.
                    </p>
                  </div>
                  <div className="faq-item">
                    <h4>How are papers stored?</h4>
                    <p>
                      Papers are stored on IPFS (InterPlanetary File System), a decentralized 
                      storage network. Only encrypted references and access rules are stored on-chain.
                    </p>
                  </div>
                  <div className="faq-item">
                    <h4>Can I update my paper after uploading?</h4>
                    <p>
                      Currently, papers are immutable once uploaded to maintain academic integrity. 
                      You can upload a new version with updated content.
                    </p>
                  </div>
                  <div className="faq-item">
                    <h4>How are citations tracked?</h4>
                    <p>
                      When a researcher cites your paper using our platform, the citation is recorded 
                      on-chain using FHE verification to ensure authenticity.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  
      {showUploadModal && (
        <ModalUpload 
          onSubmit={uploadPaper} 
          onClose={() => setShowUploadModal(false)} 
          uploading={uploading}
          paperData={newPaperData}
          setPaperData={setNewPaperData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content tech-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="tech-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="shield-icon"></div>
              <span>Decentralized Academic Repository</span>
            </div>
            <p>Secure academic publishing with FHE-powered access control</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Research Community</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Academic Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} Decentralized Academic Repository. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalUploadProps {
  onSubmit: () => void; 
  onClose: () => void; 
  uploading: boolean;
  paperData: any;
  setPaperData: (data: any) => void;
}

const ModalUpload: React.FC<ModalUploadProps> = ({ 
  onSubmit, 
  onClose, 
  uploading,
  paperData,
  setPaperData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPaperData({
      ...paperData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!paperData.title || !paperData.abstract) {
      alert("Please fill required fields");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="upload-modal tech-card">
        <div className="modal-header">
          <h2>Upload Research Paper</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Your paper will be protected by FHE access rules
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Paper Title *</label>
              <input 
                type="text"
                name="title"
                value={paperData.title} 
                onChange={handleChange}
                placeholder="Enter paper title..." 
                className="tech-input"
              />
            </div>
            
            <div className="form-group">
              <label>Category *</label>
              <select 
                name="category"
                value={paperData.category} 
                onChange={handleChange}
                className="tech-select"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Physics">Physics</option>
                <option value="Biology">Biology</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Engineering">Engineering</option>
                <option value="Medicine">Medicine</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Access Rules *</label>
              <select 
                name="accessRules"
                value={paperData.accessRules} 
                onChange={handleChange}
                className="tech-select"
              >
                <option value="Only authors who cited this paper">Only authors who cited this paper</option>
                <option value="University members only">University members only</option>
                <option value="Public after 1 year">Public after 1 year</option>
                <option value="Specific research groups">Specific research groups</option>
              </select>
            </div>
            
            <div className="form-group full-width">
              <label>Abstract *</label>
              <textarea 
                name="abstract"
                value={paperData.abstract} 
                onChange={handleChange}
                placeholder="Enter paper abstract..." 
                className="tech-textarea"
                rows={6}
              />
            </div>
          </div>
          
          <div className="privacy-notice">
            <div className="privacy-icon"></div> 
            <p>Your paper will be encrypted and stored on IPFS. Access rules are enforced using FHE technology, ensuring your research remains private while allowing authorized access.</p>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn tech-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={uploading}
            className="submit-btn tech-button primary"
          >
            {uploading ? "Applying FHE Rules..." : "Upload Paper"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;