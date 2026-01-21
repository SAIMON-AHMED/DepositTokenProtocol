# Quick Start: View Your Web Page

## 3-Step Setup

### Step 1: Open PowerShell Terminal #1

```powershell
cd c:\Users\saimo\DepositTokenProtocol
npx hardhat node
```

**Wait for output showing:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

**👉 KEEP THIS TERMINAL OPEN - Don't close it!**

---

### Step 2: Open PowerShell Terminal #2 (NEW TERMINAL)

```powershell
cd c:\Users\saimo\DepositTokenProtocol
npx hardhat run scripts/deploy.js --network localhost
```

**Wait for:**
```
DepositToken deployed at: 0x...
All contracts deployed and linked. Ready to test or verify.
Contract addresses written to frontend/contract-addresses/localhost.json
```

**👉 This terminal can close after this completes**

---

### Step 3: Open PowerShell Terminal #3 (NEW TERMINAL)

```powershell
cd c:\Users\saimo\DepositTokenProtocol\frontend
npm install
npm start
```

**Wait for:**
```
Compiled successfully!
Local:            http://localhost:3000
```

**Browser will open automatically - if not, go to:** http://localhost:3000

---

## Your Web Page is Now Running! 🎉

### Next: Connect MetaMask

1. **Open MetaMask** in your browser
2. **Add Hardhat Network:**
   - Click Network dropdown (top left)
   - Click "Add Network"
   - Enter:
     - Network Name: `Hardhat`
     - RPC URL: `http://127.0.0.1:8545`
     - Chain ID: `1337`
   - Save

3. **Use Test Account:**
   - Copy any account from Terminal #1 output (e.g., `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)
   - Import to MetaMask using the private key shown

4. **Click "Connect Wallet"** on your web page

---

## Done! Now You Can:

✅ Mint tokens  
✅ Redeem tokens  
✅ Monitor reserve ratio  
✅ Trigger force pause  
✅ See live transactions

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Browser doesn't open | Go to http://localhost:3000 manually |
| "Can't connect" error | Make sure Terminal #1 (hardhat node) is running |
| MetaMask not connecting | Switch to "Hardhat" network in MetaMask |
| "Network error" | Restart Terminal #1: Close and run `npx hardhat node` again |

---

**Ready? Start with Terminal #1!** 🚀
