import React, { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import "./App.css";

// Import ABIs
import DepositTokenABI from "./abis/DepositToken.json";
import ReserveRegistryABI from "./abis/ReserveRegistry.json";
import GovernanceControllerABI from "./abis/GovernanceController.json";

function App() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState(null);
  const [reserveRatio, setReserveRatio] = useState("0");
  const [gasEstimate, setGasEstimate] = useState("Not available");
  const [zkVerified, setZkVerified] = useState(false);
  const [amount, setAmount] = useState("");
  const [recentTxs, setRecentTxs] = useState([]);
  const [network, setNetwork] = useState("");
  const [contracts, setContracts] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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
    setReserveRatio("0");
    setGasEstimate("Not available");
    setZkVerified(false);
    setAmount("");
    setRecentTxs([]);
    setNetwork("");
    setContracts({});
  }, []);

  // Load balance, network, contracts and reserve ratio
  useEffect(() => {
    if (signer && account && provider) {
      const loadData = async () => {
        try {
          // Get balance
          const bal = await provider.getBalance(account);
          setBalance(parseFloat(ethers.formatEther(bal)));

          // Get network
          const net = await provider.getNetwork();
          setNetwork(net.name);

          // Load contract addresses from localhost
          try {
            const response = await fetch("./contract-addresses/localhost.json");
            if (!response.ok) throw new Error("Contracts not deployed");
            const addresses = await response.json();

            // Initialize contract instances
            const depositToken = new ethers.Contract(
              addresses.DepositToken,
              DepositTokenABI,
              signer
            );
            const reserveRegistry = new ethers.Contract(
              addresses.ReserveRegistry,
              ReserveRegistryABI,
              provider
            );
            const governance = new ethers.Contract(
              addresses.GovernanceController,
              GovernanceControllerABI,
              provider
            );

            setContracts({
              depositToken,
              reserveRegistry,
              governance,
              addresses,
            });

            // Get reserve ratio
            const ratio = await reserveRegistry.reserveRatio();
            const ratioPercent = parseFloat(ethers.formatEther(ratio)) * 100;
            setReserveRatio(ratioPercent.toFixed(2));

            // Simulate ZK verification (in real app, this would be from user input)
            setZkVerified(true);
          } catch (err) {
            console.warn("Contracts not yet deployed:", err.message);
            setZkVerified(false);
          }
        } catch (err) {
          console.error("Failed to load contract data:", err);
        }
      };

      loadData();
      const interval = setInterval(loadData, 5000); // Refresh every 5s
      return () => clearInterval(interval);
    }
  }, [signer, account, provider]);

  // Mint Handler
  const handleMint = async () => {
    if (!amount || !contracts.depositToken) {
      alert("Enter amount or connect wallet with contracts");
      return;
    }

    setIsLoading(true);
    try {
      const amountWei = ethers.parseEther(amount);
      const dummyProof = "0x00"; // In production, generate actual zk proof

      const tx = await contracts.depositToken.mint(
        account,
        amountWei,
        dummyProof
      );
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setRecentTxs([
          `✓ Minted ${amount} dUSD (${receipt.hash.slice(0, 6)}...)`,
          ...recentTxs,
        ]);
        setAmount("");
        console.log("Mint successful:", receipt.hash);
      }
    } catch (err) {
      const errorMsg = err.reason || err.message;
      setRecentTxs([`✗ Mint failed: ${errorMsg}`, ...recentTxs]);
      console.error("Mint failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Redeem Handler
  const handleRedeem = async () => {
    if (!amount || !contracts.depositToken) {
      alert("Enter amount or connect wallet with contracts");
      return;
    }

    setIsLoading(true);
    try {
      const amountWei = ethers.parseEther(amount);
      const tx = await contracts.depositToken.redeem(amountWei);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setRecentTxs([
          `✓ Redeemed ${amount} dUSD (${receipt.hash.slice(0, 6)}...)`,
          ...recentTxs,
        ]);
        setAmount("");
        console.log("Redeem successful:", receipt.hash);
      }
    } catch (err) {
      const errorMsg = err.reason || err.message;
      setRecentTxs([`✗ Redeem failed: ${errorMsg}`, ...recentTxs]);
      console.error("Redeem failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger force pause if reserve is low
  const handleForcePause = async () => {
    if (!contracts.depositToken) {
      alert("Connect wallet with contracts first");
      return;
    }

    setIsLoading(true);
    try {
      const tx = await contracts.depositToken.forcePause();
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setRecentTxs([
          `✓ Force pause triggered (${receipt.hash.slice(0, 6)}...)`,
          ...recentTxs,
        ]);
        console.log("Force pause successful:", receipt.hash);
      }
    } catch (err) {
      const errorMsg = err.reason || err.message;
      setRecentTxs([`✗ Force pause failed: ${errorMsg}`, ...recentTxs]);
      console.error("Force pause failed:", err);
    } finally {
      setIsLoading(false);
    }
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
        placeholder="Amount in dUSD"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={isLoading}
      />

      {!account ? (
        <button onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <>
          <button onClick={handleMint} disabled={isLoading}>
            {isLoading ? "Processing..." : "Mint"}
          </button>
          <button onClick={handleRedeem} disabled={isLoading}>
            {isLoading ? "Processing..." : "Redeem"}
          </button>
          {parseFloat(reserveRatio) < 100 && (
            <button
              onClick={handleForcePause}
              disabled={isLoading}
              style={{ background: "#ff6b6b" }}
            >
              {isLoading ? "Processing..." : "Force Pause"}
            </button>
          )}
        </>
      )}

      <div className="status">
        <p>
          <b>Balance:</b>{" "}
          {balance !== null ? `${balance.toFixed(4)} ETH` : "Loading..."}
        </p>
        <p>
          <b>Reserve Ratio:</b> {reserveRatio}%
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
