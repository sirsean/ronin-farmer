# Ronin Farmer

Do you have your assets on Ronin staked in all the various places,
earning AXS & RON rewards, and then every 24-ish hours you have to
go to the website(s) and click like fifty buttons and wait for each
transaction to complete before clicking again? I do, and that's a
lot of clicking.

This assumes you are doing, at most, the following:

- staking land for AXS rewards
- staking AXS for AXS rewards
- staking RON/WETH LP for RON rewards
- staking AXS/WETH LP for RON rewards
- staking SLP/WETH LP for RON rewards

With this application, you can sweep your AXS rewards from land and the
AXS staking pool and restake the AXS back into the staking pool.

And you can sweep your RON rewards from the three LP staking farms, sell
half your RON for WETH, deposit all your WETH into the RON/WETH LP (along
with the other half of the RON), and stake it into the RON/WETH LP farm.

And then come back tomorrow and do it again.

# Installation

We're using Hardhat, which complained at me when I was on the wrong
version of Node, so first make sure you're on `v18.12.1` like me.

```bash
npm install
```

# Wallet File

This app needs to sign transactions with your private key and send them
to the Ronin blockchain. So, create a file at `~/.wallet` that looks like this:

```json
{
    "ronin": "https://api.roninchain.com/rpc",
    "key": "YOUR-PRIVATE-KEY",
    "ronin_farmer": {
        "min_ron_balance": 500
    }
}
```

# Check Balances

```bash
npx hardhat axs-balance
npx hardhat axs-staked
npx hardhat axs-pending
npx hardhat land-pending
npx hardhat lp-pending

# or, all at once:
npx hardhat pending
```

# Check the Current Prices

These are just the prices from the Katana LP on Ronin, unrelated to the actual
off-Ronin prices.

```bash
npx hardhat prices
```

# Sweep Your Rewards

```bash
npx hardhat axs-sweep
npx hardhat lp-sweep

# or, all at once:
npx hardhat sweep
```

# Donate

This saves you time and makes you money, so I thought about having it
take a commission. But I figure that'd be easy to circumvent and would
not make anyone happy.

Instead, I'll just ask you to consider kicking me some of the RON or AXS
you're pulling in, purely as a donation. Because you're cool.

`ronin:560ebafd8db62cbdb44b50539d65b48072b98277`
