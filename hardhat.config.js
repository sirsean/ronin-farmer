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
const USDC = '0x0b7007c13325c48911f73a2dad5fa5dcbf808adc';

// LP contracts on Ronin
const RON_USDC_LP = '0x4f7687affc10857fccd0938ecda0947de7ad3812';
const RON_SLP_LP = '0x8f1c5eda143fa3d1bea8b4e92f33562014d30e0d';
const RON_AXS_LP = '0x32d1dbb6a4275133cc49f1c61653be3998ada4ff';
const RON_WETH_LP = '0x2ecb08f87f075b5769fe543d0e52e40140575ea7';

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

async function ronAxsLPStakingContract(hre) {
    const address = '0x14327fa6a4027d8f08c0a1b7feddd178156e9527';
    const abi = parseAbi('./abi/RonWethLPStakingPool.json');
    return getContractAt(hre, abi, address);
}

async function katanaRouterContract(hre) {
    const address = '0x7d0556d55ca1a92708681e2e231733ebd922597d';
    const abi = parseAbi('./abi/KatanaRouter.json');
    return getContractAt(hre, abi, address);
}

async function katanaLPContract(hre, address) {
    const abi = parseAbi('./abi/KatanaLP.json');
    return getContractAt(hre, abi, address);
}

async function ronWethLPContract(hre) {
    return katanaLPContract(hre, RON_WETH_LP);
}

async function ronAxsLPContract(hre) {
    return katanaLPContract(hre, RON_AXS_LP);
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
        ]).then(([address, contract]) => contract.balanceOf(address))
            .then(b => fe(hre, b))
            .then(console.log);
    });

task('weth-balance', 'WETH balance')
    .setAction(async (_, hre) => {
        await Promise.all([
            getAddress(hre),
            erc20(hre, WETH),
        ]).then(([address, contract]) => contract.balanceOf(address))
            .then(b => fe(hre, b))
            .then(console.log);
    });

async function getAxsStaked(hre) {
    return Promise.all([
        getAddress(hre),
        axsStakingContract(hre),
    ]).then(([address, axsStaking]) => axsStaking.getStakingAmount(address));
}

task('axs-staked', 'AXS Staked')
    .setAction(async (_, hre) => {
        await getAxsStaked(hre)
            .then(b => fe(hre, b))
            .then(console.log);
    });

async function stakedAxsPending(hre) {
    return Promise.all([
        getAddress(hre),
        axsStakingContract(hre),
    ]).then(([address, axsStaking]) => axsStaking.getPendingRewards(address));
}

task('axs-pending', 'AXS Pending')
    .setAction(async (_, hre) => {
        await stakedAxsPending(hre)
            .then(b => fe(hre, b))
            .then(console.log);
    });

async function landPending(hre) {
    return Promise.all([
        getAddress(hre),
        landStakingContract(hre),
    ]).then(([address, landStaking]) => landStaking.getPendingRewards(address));
}

task('land-pending', 'Land AXS Pending')
    .setAction(async (_, hre) => {
        await landPending(hre)
            .then(b => fe(hre, b))
            .then(console.log);
    });

async function landClaim(hre) {
    console.log('claiming land rewards');
    const landStaking = await landStakingContract(hre);
    await landStaking.estimateGas.claimPendingRewards()
        .then(gas => landStaking.claimPendingRewards({ gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
}

async function axsRestake(hre) {
    console.log('restaking AXS rewards');
    const axsStaking = await axsStakingContract(hre);
    await axsStaking.estimateGas.restakeRewards()
        .then(gas => axsStaking.restakeRewards({ gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
}

async function axsStakeAll(hre) {
    console.log('staking all AXS');
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
        await landClaim(hre);
        await axsRestake(hre);
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

task('lp-axs-pending', 'Pending RON in RON/AXS LP staking pool')
    .setAction(async (_, hre) => {
        const address = await getAddress(hre);
        const axsPool = await ronAxsLPStakingContract(hre);
        await axsPool.getPendingRewards(address)
            .then(b => fe(hre, b))
            .then(console.log);
    });

async function lpPending(hre) {
    const address = await getAddress(hre);
    return Promise.all([
        ronWethLPStakingContract(hre).then(c => c.getPendingRewards(address)),
        ronAxsLPStakingContract(hre).then(c => c.getPendingRewards(address)),
    ]).then(rewards => rewards.reduce((s, r) => s.add(r), hre.ethers.BigNumber.from(0)));
}

task('lp-pending', 'Pending RON across LP staking pools')
    .setAction(async (_, hre) => {
        await lpPending(hre)
            .then(b => fe(hre, b))
            .then(console.log);
    });

task('pending', 'All pending rewards across land, LP, staking')
    .setAction(async (_, hre) => {
        await Promise.all([
            lpPending(hre),
            landPending(hre),
            stakedAxsPending(hre),
        ]).then(([lp, land, stakedAxs]) => {
            console.log('Land:', fe(hre, land), 'AXS');
            console.log('Stake:', fe(hre, stakedAxs), 'AXS');
            console.log('LP:', fe(hre, lp), 'RON');
        });
    });

async function lpClaimAll(hre) {
    const ronPool = await ronWethLPStakingContract(hre);
    const axsPool = await ronAxsLPStakingContract(hre);
    console.log('claiming from RON pool');
    await ronPool.estimateGas.claimPendingRewards()
        .then(gas => ronPool.claimPendingRewards({ gasLimit: gas.mul(2) }))
        .then(tx => tx.wait());
    console.log('claiming from AXS pool');
    await axsPool.estimateGas.claimPendingRewards()
        .then(gas => axsPool.claimPendingRewards({ gasLimit: gas.mul(2) }))
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
    const [reserve0, reserve1, reserveTimestamp] = await lp.getReserves();
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
    const [reserve0, reserve1, reserveTimestamp] = await lp.getReserves();
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

task('sweep', 'Claim all pending AXS & RON, restake AXS, sell RON for WETH, deposit/stake RON/WETH LP')
    .setAction(async (_, hre) => {
        await landClaim(hre);
        await axsRestake(hre);
        await axsStakeAll(hre);
        await lpClaimAll(hre);
        await sellHalfRon(hre);
        await lpAddRonWeth(hre);
        await lpStakeAll(hre);
        console.log('sweep completed');
    });

function adjustDecimals(hre, number, decimals) {
    const res = hre.ethers.utils.formatUnits(number, decimals);
    return Math.round(res * 1e4) / 1e4;
}

async function poolPrices(hre, lpAddress) {
    const lp = await katanaLPContract(hre, lpAddress);
    const [token0Address, token1Address] = await Promise.all([lp.token0(), lp.token1()]);
    const token0 = await erc20(hre, token0Address);
    const token1 = await erc20(hre, token1Address);
    const [token0Symbol, token0Decimals] = await Promise.all([token0.symbol(), token0.decimals()]);
    const [token1Symbol, token1Decimals] = await Promise.all([token1.symbol(), token1.decimals()]);
    const [reserve0, reserve1] = await lp.getReserves().then(([r0, r1, _]) => {
        return [
            r0.div(hre.ethers.BigNumber.from(10).pow(token0Decimals)),
            r1.div(hre.ethers.BigNumber.from(10).pow(token1Decimals)),
        ];
    });
    return [
        {
            inSymbol: token0Symbol,
            inAddr: token0Address,
            outSymbol: token1Symbol,
            outAddr: token1Address,
            price: reserve0.toNumber() / reserve1.toNumber(),
        },
        {
            inSymbol: token1Symbol,
            inAddr: token1Address,
            outSymbol: token0Symbol,
            outAddr: token0Address,
            price: reserve1.toNumber() / reserve0.toNumber(),
        },
    ];
}

async function buildPriceBook(hre) {
    return Promise.all([RON_USDC_LP, RON_SLP_LP, RON_AXS_LP, RON_WETH_LP].map(addr => poolPrices(hre, addr)))
        .then(all => all.flat());
}

// return the price, in terms of inSymbol, of the outSymbol token
function getPrice(book, inSymbol, outSymbol) {
    if (inSymbol == 'RON') {
        return getPrice(book, 'WRON', outSymbol);
    } else if (outSymbol == 'RON') {
        return getPrice(book, inSymbol, 'WRON');
    } else if (inSymbol == outSymbol) {
        return 1;
    } else if (inSymbol != 'WRON' && outSymbol != 'WRON') {
        const step0 = book.filter(p => p.inSymbol == inSymbol && p.outSymbol == 'WRON')[0];
        const step1 = book.filter(p => p.inSymbol == 'WRON' && p.outSymbol == outSymbol)[0];
        return step0.price * step1.price;
    } else if (inSymbol == 'WRON' || outSymbol == 'WRON') {
        const step0 = book.filter(p => p.inSymbol == inSymbol && p.outSymbol == outSymbol)[0];
        return step0.price;
    }
}

async function lpStakedBalance(hre, book, lpStakingContract, lpContract) {
    const address = await getAddress(hre);
    // get number of LP tokens staked
    const stakingAmount = await lpStakingContract.getStakingAmount(address);
    // get total supply of LP tokens
    const lpTotalSupply = await lpContract.totalSupply();
    // calculate percentage of LP owned
    const lpPercentageOwned = adjustDecimals(hre, stakingAmount, 18) / adjustDecimals(hre, lpTotalSupply, 18);
    // get reserves of each token
    const [reserveToken0, reserveToken1] = await lpContract.getReserves();
    // get tokens
    const [token0Addr, token1Addr] = await Promise.all([
        lpContract.token0(),
        lpContract.token1(),
    ]);
    const token0 = await erc20(hre, token0Addr).then(c => Promise.all([c.symbol(), c.decimals()])).then(([symbol, decimals]) => ({ symbol, decimals }));;
    const token1 = await erc20(hre, token1Addr).then(c => Promise.all([c.symbol(), c.decimals()])).then(([symbol, decimals]) => ({ symbol, decimals }));;
    // multiply by owned-percentage to determine number of coins owned
    const ownedToken0 = adjustDecimals(hre, reserveToken0, token0.decimals) * lpPercentageOwned;
    const ownedToken1 = adjustDecimals(hre, reserveToken1, token1.decimals) * lpPercentageOwned;
    // multiply by price of each to determine dollar value
    const valueToken0 = ownedToken0 * getPrice(book, 'USDC', token0.symbol);
    const valueToken1 = ownedToken1 * getPrice(book, 'USDC', token1.symbol);
    return {
        token0,
        token1,
        ownedToken0: ownedToken0,
        ownedToken1: ownedToken1,
        valueToken0: valueToken0,
        valueToken1: valueToken1,
        totalValue: valueToken0 + valueToken1,
    };
}

task('prices', 'Check the liquidity pools to get the prices of the Ronin tokens')
    .setAction(async (_, hre) => {
        const book = await buildPriceBook(hre);
        console.log('ETH/USD', getPrice(book, 'USDC', 'WETH'));
        console.log('RON/USD', getPrice(book, 'USDC', 'RON'));
        console.log('AXS/USD', getPrice(book, 'USDC', 'AXS'));
        console.log('SLP/USD', getPrice(book, 'USDC', 'SLP'));
        console.log('RON/ETH', getPrice(book, 'WETH', 'RON'));
        console.log('AXS/ETH', getPrice(book, 'WETH', 'AXS'));
    });

task('portfolio', 'Get all your Ronin balances and positions, with prices')
    .setAction(async (_, hre) => {
        const book = await buildPriceBook(hre);
        const address = await getAddress(hre);
        // RON balance
        const ronBalance = await hre.ethers.provider.getBalance(address).then(b => adjustDecimals(hre, b, 18));
        console.log('RON', ronBalance, ronBalance * getPrice(book, 'USDC', 'RON'));
        // AXS staked
        const axsStaked = await getAxsStaked(hre).then(b => adjustDecimals(hre, b, 18));
        console.log('AXS Staked', axsStaked, axsStaked * getPrice(book, 'USDC', 'AXS'));
        // AXS pending
        const axsPending = await stakedAxsPending(hre).then(b => adjustDecimals(hre, b, 18));
        console.log('AXS Staked Pending', axsPending, axsPending * getPrice(book, 'USDC', 'AXS'));
        const axsLandPending = await landPending(hre).then(b => adjustDecimals(hre, b, 18));
        console.log('AXS Land Pending', axsLandPending, axsLandPending * getPrice(book, 'USDC', 'AXS'));
        // RON/WETH LP, staked
        await Promise.all([
            ronWethLPStakingContract(hre),
            ronWethLPContract(hre),
        ])
            .then(([lpStakingContract, lpContract]) => lpStakedBalance(hre, book, lpStakingContract, lpContract))
            .then(lp => {
                console.log(`RON/WETH LP ${lp.token0.symbol}: ${lp.ownedToken0} ${lp.token1.symbol}: ${lp.ownedToken1} $${lp.totalValue}`);
            });
        // RON/WETH LP, pending
        const ronWethLPStakedPending = await ronWethLPStakingContract(hre).then(c => c.getPendingRewards(address)).then(b => adjustDecimals(hre, b, 18));
        console.log('RON/WETH LP Pending RON', ronWethLPStakedPending, ronWethLPStakedPending * getPrice(book, 'USDC', 'RON'));
        // RON/AXS LP, staked
        await Promise.all([
            ronAxsLPStakingContract(hre),
            ronAxsLPContract(hre),
        ])
            .then(([lpStakingContract, lpContract]) => lpStakedBalance(hre, book, lpStakingContract, lpContract))
            .then(lp => {
                console.log(`RON/AXS LP ${lp.token0.symbol}: ${lp.ownedToken0} ${lp.token1.symbol}: ${lp.ownedToken1} $${lp.totalValue}`);
            });
        // RON/AXS LP, pending
        const ronAxsLPStakedPending = await ronAxsLPStakingContract(hre).then(c => c.getPendingRewards(address)).then(b => adjustDecimals(hre, b, 18));
        console.log('RON/AXS LP Pending RON', ronAxsLPStakedPending, ronAxsLPStakedPending * getPrice(book, 'USDC', 'RON'));
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