const fs = require('fs');
const os = require('os');
const path = require('path');
require("@nomiclabs/hardhat-waffle");

const configPath = path.join(os.homedir(), '.wallet');
if (!fs.existsSync(configPath)) {
    console.log('config file missing, please place it at:', configPath);
    process.exit();
}
const config = JSON.parse(fs.readFileSync(configPath));

const MIN_RON_BALANCE = config.ronin_farmer?.min_ron_balance || '500';

// ERC-20 addresses on Ronin
const AXS = '0x97a9107c1793bc407d6f527b77e7fff4d812bece';
const WRON = '0xe514d9deb7966c8be0ca922de8a064264ea6bcd4';
const WETH = '0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5';

function parseAbi(filename) {
    return JSON.parse(fs.readFileSync(filename).toString());
}

async function getAddress(hre) {
    return hre.ethers.provider.getSigner().getAddress();
}

async function getContractAt(hre, abi, address) {
    return hre.ethers.getContractAt(abi, address, hre.ethers.provider.getSigner());
}

async function erc20(hre, address) {
    const abi = parseAbi('./abi/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json');
    return getContractAt(hre, abi, address);
}

async function axsStakingContract(hre) {
    const address = '0x05b0bb3c1c320b280501b86706c3551995bc8571';
    const abi = parseAbi('./abi/AXSStaking.json');
    return getContractAt(hre, abi, address);
}

async function landStakingContract(hre) {
    const address = '0xb2a5110f163ec592f8f0d4207253d8cbc327d9fb';
    const abi = parseAbi('./abi/LandStaking.json');
    return getContractAt(hre, abi, address);
}

async function ronWethLPStakingContract(hre) {
    const address = '0xb9072cec557528f81dd25dc474d4d69564956e1e';
    const abi = parseAbi('./abi/RonWethLPStakingPool.json');
    return getContractAt(hre, abi, address);
}

async function axsWethLPStakingContract(hre) {
    const address = '0x487671acdea3745b6dac3ae8d1757b44a04bfe8a';
    const abi = parseAbi('./abi/AxsWethLPStakingPool.json');
    return getContractAt(hre, abi, address);
}

async function slpWethLPStakingContract(hre) {
    const address = '0xd4640c26c1a31cd632d8ae1a96fe5ac135d1eb52';
    const abi = parseAbi('./abi/SlpWethLPStakingPool.json');
    return getContractAt(hre, abi, address);
}

async function katanaRouterContract(hre) {
    const address = '0x7d0556d55ca1a92708681e2e231733ebd922597d';
    const abi = parseAbi('./abi/KatanaRouter.json');
    return getContractAt(hre, abi, address);
}

async function ronWethLPContract(hre) {
    const address = '0x2ecb08f87f075b5769fe543d0e52e40140575ea7';
    const abi = parseAbi('./abi/KatanaLP.json');
    return getContractAt(hre, abi, address);
}

function fe(hre, num) {
    return hre.ethers.utils.formatEther(num, 'ether');
}

task('ron-balance', 'Print your RON balance')
    .setAction(async (_, hre) => {
        await getAddress(hre)
            .then(address => hre.ethers.provider.getBalance(address))
            .then(b => fe(hre, b))
            .then(console.log);
    });

task('axs-balance', 'AXS balance')
    .setAction(async (_, hre) => {
        await Promise.all([
            getAddress(hre),
            erc20(hre, AXS),
        ]).then(([ address, contract ]) => contract.balanceOf(address))
            .then(b => fe(hre, b))
            .then(console.log);
    });

task('weth-balance', 'WETH balance')
    .setAction(async (_, hre) => {
        await Promise.all([
            getAddress(hre),
            erc20(hre, WETH),
        ]).then(([ address, contract ]) => contract.balanceOf(address))
            .then(b => fe(hre, b))
            .then(console.log);
    });

task('axs-staked', 'AXS Staked')
    .setAction(async (_, hre) => {
        await Promise.all([
            getAddress(hre),
            axsStakingContract(hre),
        ]).then(([ address, axsStaking ]) => axsStaking.getStakingAmount(address))
            .then(b => fe(hre, b))
            .then(console.log);
    });

task('axs-pending', 'AXS Pending')
    .setAction(async (_, hre) => {
        await Promise.all([
            getAddress(hre),
            axsStakingContract(hre),
        ]).then(([ address, axsStaking ]) => axsStaking.getPendingRewards(address))
            .then(b => fe(hre, b))
            .then(console.log);
    });

task('land-pending', 'Land AXS Pending')
    .setAction(async (_, hre) => {
        await Promise.all([
            getAddress(hre),
            landStakingContract(hre),
        ]).then(([ address, landStaking ]) => landStaking.getPendingRewards(address))
            .then(b => fe(hre, b))
            .then(console.log);
    });

async function landClaim(hre) {
    const landStaking = await landStakingContract(hre);
    await landStaking.estimateGas.claimPendingRewards()
        .then(gas => landStaking.claimPendingRewards({ gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
}

async function axsRestake(hre) {
    const axsStaking = await axsStakingContract(hre);
    await axsStaking.estimateGas.restakeRewards()
        .then(gas => axsStaking.restakeRewards({ gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
}

async function axsStakeAll(hre) {
    const address = await getAddress(hre);
    const axs = await erc20(hre, AXS);
    const axsStaking = await axsStakingContract(hre);
    await axs.balanceOf(address)
        .then(balance => {
            return axsStaking.estimateGas.stake(balance)
                .then(gas => axsStaking.stake(balance, { gasLimit: gas.mul(2) }))
        })
        .then(tx => tx.wait());
}

task('land-claim', 'Claim AXS from staked land')
    .setAction(async (_, hre) => {
        await landClaim(hre);
    });

task('axs-restake', 'Restake AXS')
    .setAction(async (_, hre) => {
        await axsRestake(hre);
    });

task('axs-stake-all', 'Stake all your AXS')
    .setAction(async (_, hre) => {
        await axsStakeAll(hre);
    });

task('axs-sweep', 'Sweep pending AXS')
    .setAction(async (_, hre) => {
        console.log('claiming land rewards');
        await landClaim(hre);
        console.log('restaking AXS rewards');
        await axsRestake(hre);
        console.log('staking all AXS');
        await axsStakeAll(hre);
        console.log('sweep completed');
    });

task('lp-ron-pending', 'Pending RON in RON/WETH LP staking pool')
    .setAction(async (_, hre) => {
        const address = await getAddress(hre);
        const ronPool = await ronWethLPStakingContract(hre);
        await ronPool.getPendingRewards(address)
            .then(b => fe(hre, b))
            .then(console.log);
    });

task('lp-axs-pending', 'Pending RON in AXS/WETH LP staking pool')
    .setAction(async (_, hre) => {
        const address = await getAddress(hre);
        const axsPool = await axsWethLPStakingContract(hre);
        await axsPool.getPendingRewards(address)
            .then(b => fe(hre, b))
            .then(console.log);
    });

task('lp-slp-pending', 'Pending RON in SLP/WETH LP staking pool')
    .setAction(async (_, hre) => {
        const address = await getAddress(hre);
        const slpPool = await slpWethLPStakingContract(hre);
        await slpPool.getPendingRewards(address)
            .then(b => fe(hre, b))
            .then(console.log);
    });

task('lp-pending', 'Pending RON across LP staking pools')
    .setAction(async (_, hre) => {
        const address = await getAddress(hre);
        await Promise.all([
            ronWethLPStakingContract(hre).then(c => c.getPendingRewards(address)),
            axsWethLPStakingContract(hre).then(c => c.getPendingRewards(address)),
            slpWethLPStakingContract(hre).then(c => c.getPendingRewards(address)),
        ]).then(rewards => rewards.reduce((s, r) => s.add(r), hre.ethers.BigNumber.from(0)))
            .then(b => fe(hre, b))
            .then(console.log);
    });

async function lpClaimAll(hre) {
    const ronPool = await ronWethLPStakingContract(hre);
    const axsPool = await axsWethLPStakingContract(hre);
    const slpPool = await slpWethLPStakingContract(hre);
    console.log('claiming from RON pool');
    await ronPool.estimateGas.claimPendingRewards()
        .then(gas => ronPool.claimPendingRewards({ gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
    console.log('claiming from AXS pool');
    await axsPool.estimateGas.claimPendingRewards()
        .then(gas => axsPool.claimPendingRewards({ gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
    console.log('claiming from SLP pool');
    await slpPool.estimateGas.claimPendingRewards()
        .then(gas => slpPool.claimPendingRewards({ gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
}

async function sellHalfRon(hre) {
    const address = await getAddress(hre);
    const router = await katanaRouterContract(hre);
    const lp = await ronWethLPContract(hre);
    const minRon = hre.ethers.utils.parseEther(MIN_RON_BALANCE);
    const ronBalance = await hre.ethers.provider.getBalance(address);
    if (ronBalance.lte(minRon)) {
        throw new Error(`insufficient RON: ${fe(hre, ronBalance)} < ${fe(hre, minRon)}`);
    }
    const ronToSell = ronBalance.sub(minRon).div(2);
    const [ reserve0, reserve1, reserveTimestamp ] = await lp.getReserves();
    const amountOut = await router.getAmountOut(ronToSell, reserve1, reserve0);
    const amountOutMin = amountOut.sub(amountOut.div(100).mul(2));
    console.log(`swap ${fe(hre, ronToSell)} RON for ${fe(hre, amountOutMin)}-${fe(hre, amountOut)} WETH`);
    await router.estimateGas.swapExactRONForTokens(amountOutMin, [WRON, WETH], address, reserveTimestamp + 1000, { value: ronToSell })
        .then(gas => router.swapExactRONForTokens(amountOutMin, [WRON, WETH], address, reserveTimestamp + 1000, { value: ronToSell, gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
}

async function lpAddRonWeth(hre) {
    const address = await getAddress(hre);
    const router = await katanaRouterContract(hre);
    const lp = await ronWethLPContract(hre);

    // make sure we have enough RON
    const minRon = hre.ethers.utils.parseEther(MIN_RON_BALANCE);
    const ronBalance = await hre.ethers.provider.getBalance(address);
    if (ronBalance.lte(minRon)) {
        throw new Error(`insufficient RON: ${fe(hre, ronBalance)} < ${fe(hre, minRon)}`);
    }

    // calculate how much RON & WETH to send
    const wethBalance = await erc20(hre, WETH).then(c => c.balanceOf(address));
    const [ reserve0, reserve1, reserveTimestamp ] = await lp.getReserves();
    const ronToSend = await router.getAmountIn(wethBalance, reserve1, reserve0);
    const wethMin = wethBalance.sub(wethBalance.div(100).mul(2));
    const ronMin = ronToSend.sub(ronToSend.div(100).mul(2));

    // add RON & WETH to LP
    console.log(`add LP: ${fe(hre, ronMin)}-${fe(hre, ronToSend)} RON ${fe(hre, wethMin)}-${fe(hre, wethBalance)} WETH`);
    await router.estimateGas.addLiquidityRON(WETH, wethBalance, wethMin, ronMin, address, reserveTimestamp + 1000, { value: ronToSend })
        .then(gas => router.addLiquidityRON(WETH, wethBalance, wethMin, ronMin, address, reserveTimestamp + 1000, { value: ronToSend, gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
}

async function lpStakeAll(hre) {
    const address = await getAddress(hre);
    const lp = await ronWethLPContract(hre);
    const pool = await ronWethLPStakingContract(hre);

    const lpBalance = await lp.balanceOf(address);
    console.log(`staking ${fe(hre, lpBalance)} RON/WETH LP`);
    await pool.estimateGas.stake(lpBalance)
        .then(gas => pool.stake(lpBalance, { gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
}

task('lp-claim', 'Claim all RON from Katana farms')
    .setAction(async (_, hre) => {
        await lpClaimAll(hre);
    });

task('ron-sell', 'Sell some RON for WETH')
    .setAction(async (_, hre) => {
        await sellHalfRon(hre);
    });

task('lp-add', 'Add RON/WETH liquidity and stake it to the farm')
    .setAction(async (_, hre) => {
        await lpAddRonWeth(hre);
        await lpStakeAll(hre);
    });

task('lp-sweep', 'Claim all RON from Katana farms, sell RON for WETH, deposit RON/WETH LP, stake it')
    .setAction(async (_, hre) => {
        await lpClaimAll(hre);
        await sellHalfRon(hre);
        await lpAddRonWeth(hre);
        await lpStakeAll(hre);
    });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.17",
    networks: {
        ronin: {
            url: config.ronin,
            accounts: [config.key],
        },
    },
    defaultNetwork: 'ronin',
};
