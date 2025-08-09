import React, { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import "./App.css";

function App() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState(null);
  const [reserveRatio, setReserveRatio] = useState("100%");
  const [gasEstimate, setGasEstimate] = useState("Not available");
  const [zkVerified, setZkVerified] = useState(false);
  const [amount, setAmount] = useState("");
  const [recentTxs, setRecentTxs] = useState([]);
  const [network, setNetwork] = useState("");

  // Connect Wallet Handler
  const connectWallet = useCallback(async () => {
    if (isConnecting) return;
    setIsConnecting(true);

    if (!window.ethereum) {
      alert("Please install MetaMask!");
      setIsConnecting(false);
      return;
    }

    try {
      const tempProvider = new ethers.BrowserProvider(window.ethereum);
      await tempProvider.send("eth_requestAccounts", []);
      const tempSigner = await tempProvider.getSigner();
      const address = await tempSigner.getAddress();

      setProvider(tempProvider);
      setSigner(tempSigner);
      setAccount(address);
      console.log("Wallet connected:", address);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  // Disconnect Wallet Handler
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount("");
    setBalance(null);
    setReserveRatio("100%");
    setGasEstimate("Not available");
    setZkVerified(false);
    setAmount("");
    setRecentTxs([]);
    setNetwork("");
  }, []);

  // Load balance, network, and ZK status when connected
  useEffect(() => {
    if (signer && account && provider) {
      const loadData = async () => {
        const bal = await provider.getBalance(account);
        setBalance(parseFloat(ethers.formatEther(bal)));

        const net = await provider.getNetwork();
        setNetwork(net.name);

        // Simulate ZK verification
        setTimeout(() => setZkVerified(true), 2000);
      };

      loadData();
    }
  }, [signer, account, provider]);

  // Mint Handler
  const handleMint = () => {
    if (!amount) return alert("Enter amount");
    const tx = `Minted ${amount} dUSD`;
    setRecentTxs([tx, ...recentTxs]);
    setAmount("");
  };

  // Redeem Handler
  const handleRedeem = () => {
    if (!amount) return alert("Enter amount");
    const tx = `Redeemed ${amount} dUSD`;
    setRecentTxs([tx, ...recentTxs]);
    setAmount("");
  };

  return (
    <div className="container">
      {account && (
        <button className="disconnect-button" onClick={disconnectWallet}>
          Disconnect
        </button>
      )}

      <h1>Deposit Token Protocol</h1>
      <h2>Dashboard</h2>

      <input
        type="text"
        placeholder="Amount in ETH"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {!account ? (
        <button onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <>
          <button onClick={handleMint}>Mint</button>
          <button onClick={handleRedeem}>Redeem</button>
        </>
      )}

      <div className="status">
        <p>
          <b>Balance:</b>{" "}
          {balance !== null ? `${balance.toFixed(4)} ETH` : "Loading..."}
        </p>
        <p>
          <b>Reserve Ratio:</b> {reserveRatio}
        </p>
        <p>
          <b>Gas Estimate:</b> {gasEstimate}
        </p>
        <p>
          <b>ZK Verification:</b> {zkVerified ? "Verified" : "Checking..."}
        </p>
        <p>
          <b>Network:</b> {network ? `Ethereum ${network}` : "Loading..."}
        </p>
      </div>

      <div className="eth-balance-bar">
        <div
          className="eth-balance-bar-inner"
          style={{ width: balance ? `${Math.min(balance * 10, 100)}%` : "0%" }}
        />
      </div>

      <div className="wallet-info">
        {account && (
          <span>
            <b>Connected:</b> {account}
          </span>
        )}
      </div>

      <div className="transaction-log">
        <strong>Recent Transactions:</strong>
        <ul>
          {recentTxs.length === 0 ? (
            <li>No recent transactions</li>
          ) : (
            recentTxs.map((tx, idx) => <li key={idx}>{tx}</li>)
          )}
        </ul>
      </div>
    </div>
  );
}

export default App;
