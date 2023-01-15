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

const erc20Abi = JSON.parse(fs.readFileSync('./abi/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json').toString());
const axsStakingAbi = JSON.parse(fs.readFileSync('./abi/AXSStaking.json').toString());
const landStakingAbi = JSON.parse(fs.readFileSync('./abi/LandStaking.json').toString());

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
