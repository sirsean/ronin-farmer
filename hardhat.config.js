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

const AXS = '0x97a9107c1793bc407d6f527b77e7fff4d812bece';
const AXS_STAKING = '0x05b0bb3c1c320b280501b86706c3551995bc8571';
const LAND_STAKING = '0xb2a5110f163ec592f8f0d4207253d8cbc327d9fb';
const RON_LP_STAKING = '0xb9072cec557528f81dd25dc474d4d69564956e1e';
const AXS_LP_STAKING = '0x487671acdea3745b6dac3ae8d1757b44a04bfe8a';
const SLP_LP_STAKING = '0xd4640c26c1a31cd632d8ae1a96fe5ac135d1eb52';

function parseAbi(filename) {
    return JSON.parse(fs.readFileSync(filename).toString());
}

const erc20Abi = parseAbi('./abi/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json');
const axsStakingAbi = parseAbi('./abi/AXSStaking.json');
const landStakingAbi = parseAbi('./abi/LandStaking.json');
const ronLpStakingAbi = parseAbi('./abi/RonWethLPStakingPool.json');
const axsLpStakingAbi = parseAbi('./abi/AxsWethLPStakingPool.json');
const slpLpStakingAbi = parseAbi('./abi/SlpWethLPStakingPool.json');

async function getAddress(hre) {
    return hre.ethers.provider.getSigner().getAddress();
}

async function getContractAt(hre, abi, address) {
    return hre.ethers.getContractAt(abi, address, hre.ethers.provider.getSigner());
}

async function axsStakingContract(hre) {
    return getContractAt(hre, axsStakingAbi, AXS_STAKING);
}

async function landStakingContract(hre) {
    return getContractAt(hre, landStakingAbi, LAND_STAKING);
}

async function ronWethLPStakingContract(hre) {
    return getContractAt(hre, ronLpStakingAbi, RON_LP_STAKING);
}

async function axsWethLPStakingContract(hre) {
    return getContractAt(hre, axsLpStakingAbi, AXS_LP_STAKING);
}

async function slpWethLPStakingContract(hre) {
    return getContractAt(hre, slpLpStakingAbi, SLP_LP_STAKING);
}

task('ron-balance', 'Print your RON balance')
    .setAction(async (_, hre) => {
        await getAddress(hre)
            .then(address => hre.ethers.provider.getBalance(address))
            .then(b => hre.ethers.utils.formatEther(b, 'ether'))
            .then(console.log);
    });

task('axs-balance', 'AXS balance')
    .setAction(async (_, hre) => {
        await Promise.all([
            getAddress(hre),
            getContractAt(hre, erc20Abi, AXS),
        ]).then(([ address, contract ]) => contract.balanceOf(address))
            .then(b => hre.ethers.utils.formatEther(b, 'ether'))
            .then(console.log);
    });

task('axs-staked', 'AXS Staked')
    .setAction(async (_, hre) => {
        await Promise.all([
            getAddress(hre),
            axsStakingContract(hre),
        ]).then(([ address, axsStaking ]) => axsStaking.getStakingAmount(address))
            .then(b => hre.ethers.utils.formatEther(b, 'ether'))
            .then(console.log);
    });

task('axs-pending', 'AXS Pending')
    .setAction(async (_, hre) => {
        await Promise.all([
            getAddress(hre),
            axsStakingContract(hre),
        ]).then(([ address, axsStaking ]) => axsStaking.getPendingRewards(address))
            .then(b => hre.ethers.utils.formatEther(b, 'ether'))
            .then(console.log);
    });

task('land-pending', 'Land AXS Pending')
    .setAction(async (_, hre) => {
        await Promise.all([
            getAddress(hre),
            landStakingContract(hre),
        ]).then(([ address, landStaking ]) => landStaking.getPendingRewards(address))
            .then(b => hre.ethers.utils.formatEther(b, 'ether'))
            .then(console.log);
    });

task('land-claim', 'Claim AXS from staked land')
    .setAction(async (_, hre) => {
        const landStaking = await landStakingContract(hre);
        await landStaking.claimPendingRewards().then(tx => tx.wait());
    });

task('axs-restake', 'Restake AXS')
    .setAction(async (_, hre) => {
        const axsStaking = await axsStakingContract(hre);
        await axsStaking.restakeRewards().then(tx => tx.wait());
    });

task('axs-stake-all', 'Stake all your AXS')
    .setAction(async (_, hre) => {
        const address = await getAddress(hre);
        const axs = await getContractAt(hre, erc20Abi, AXS);
        const axsStaking = await axsStakingContract(hre);
        await axs.balanceOf(address).then(balance => axsStaking.stake(balance)).then(tx => tx.wait());
    });

task('axs-sweep', 'Sweep pending AXS')
    .setAction(async (_, hre) => {
        const address = await getAddress(hre);
        const axs = await getContractAt(hre, erc20Abi, AXS);
        const landStaking = await landStakingContract(hre);
        const axsStaking = await axsStakingContract(hre);
        console.log('claiming land rewards');
        await landStaking.claimPendingRewards().then(tx => tx.wait());
        console.log('restaking AXS rewards');
        await axsStaking.restakeRewards().then(tx => tx.wait());
        console.log('staking all AXS');
        await axs.balanceOf(address).then(balance => axsStaking.stake(balance)).then(tx => tx.wait());
        console.log('sweep completed');
    });

task('lp-ron-pending', 'Pending RON in RON/WETH LP staking pool')
    .setAction(async (_, hre) => {
        const address = await getAddress(hre);
        const ronPool = await ronWethLPStakingContract(hre);
        await ronPool.getPendingRewards(address)
            .then(b => hre.ethers.utils.formatEther(b, 'ether'))
            .then(console.log);
    });

task('lp-axs-pending', 'Pending RON in AXS/WETH LP staking pool')
    .setAction(async (_, hre) => {
        const address = await getAddress(hre);
        const axsPool = await axsWethLPStakingContract(hre);
        await axsPool.getPendingRewards(address)
            .then(b => hre.ethers.utils.formatEther(b, 'ether'))
            .then(console.log);
    });

task('lp-slp-pending', 'Pending RON in SLP/WETH LP staking pool')
    .setAction(async (_, hre) => {
        const address = await getAddress(hre);
        const slpPool = await slpWethLPStakingContract(hre);
        await slpPool.getPendingRewards(address)
            .then(b => hre.ethers.utils.formatEther(b, 'ether'))
            .then(console.log);
    });

task('lp-claim', 'Claim all RON from Katana farms')
    .setAction(async (_, hre) => {
        const ronPool = await ronWethLPStakingContract(hre);
        const axsPool = await axsWethLPStakingContract(hre);
        const slpPool = await slpWethLPStakingContract(hre);
        console.log('claiming from RON pool');
        await ronPool.claimPendingRewards().then(tx => tx.wait());
        console.log('claiming from AXS pool');
        await axsPool.claimPendingRewards().then(tx => tx.wait());
        console.log('claiming from SLP pool');
        await slpPool.claimPendingRewards().then(tx => tx.wait());
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
