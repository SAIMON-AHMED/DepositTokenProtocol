# Tests

71 tests across 5 files. Run with `npx hardhat test`.

| File                                 | Count | What it covers                                                           |
| ------------------------------------ | ----- | ------------------------------------------------------------------------ |
| DepositToken.test.js                 | 21    | Dual-κ mint/redeem, zk-proof checks, Mode A/B transfers, `checkReserves` |
| GovernanceController.test.js         | 17    | State machine transitions, Type 1/2 pauses, 72 h expiry, role guards     |
| ReserveOracle.test.js                | 13    | Staleness, deviation, multi-oracle median aggregation                    |
| deploy.test.js                       | 5     | Deployment wiring and parameter verification                             |
| integration/DepositTokenFlow.test.js | 15    | End-to-end lifecycle                                                     |

A `zkVerifierMock` stands in for the real Groth16 verifier so tests stay deterministic.
