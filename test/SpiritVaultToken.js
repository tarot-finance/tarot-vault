const VaultToken = artifacts.require("VaultToken");
const MockERC20 = artifacts.require("MockERC20");
const SpiritMasterChef = artifacts.require(
  "contracts/spirit/SpiritMasterChef.sol:SpiritMasterChef"
);
const SpiritFactory = artifacts.require(
  "contracts/spirit/SpiritFactory.sol:SpiritFactory"
);
const SpiritRouter = artifacts.require(
  "contracts/spirit/SpiritRouter.sol:SpiritRouter"
);
const UniswapV2Pair = artifacts.require(
  "contracts/uniswap/UniswapV2Pair.sol:UniswapV2Pair"
);
const VaultTokenFactory = artifacts.require("VaultTokenFactory");

const { BN } = require("@openzeppelin/test-helpers");

async function rpc(request) {
  return new Promise((okay, fail) =>
    web3.currentProvider.send(request, (err, res) =>
      err ? fail(err) : okay(res)
    )
  );
}

function address(n) {
  return `0x${n.toString(16).padStart(40, "0")}`;
}

const toWei = (amount, decimal = 18) => {
  return new BN(amount).mul(new BN(10).pow(new BN(decimal)));
};

async function blockNumber() {
  let { result: num } = await rpc({ method: "eth_blockNumber" });
  return parseInt(num);
}

contract("Spirit VaultToken Test", function (accounts) {
  const [alice, bob, john] = accounts;

  let vaultToken, masterChef, rewardsToken, underlyingToken;
  let vaultTokenFactory;
  let token0, token1, weth;
  let router, factory;
  let bobBalanceBefore, bobBalanceAfter;

  let poolDepositFeeBps = 0;

  let poolStartBlock = 0;

  before("deploying contracts", async () => {
    rewardsToken = await MockERC20.new("Rewards Token", "RTK");
    weth = await MockERC20.new("Wrapped Eth", "WETH");

    await rewardsToken.mint(john, toWei(1000000));

    token0 = rewardsToken;
    token1 = weth;

    await token0.mint(alice, toWei(100000));
    await token1.mint(alice, toWei(100000));

    await token0.mint(bob, toWei(100000));
    await token1.mint(bob, toWei(100000));

    console.log("Token0 deployed at ", token0.address);
    console.log("Token1 deployed at ", token1.address);

    factory = await SpiritFactory.new(alice, false);
    console.log("SpiritFactory deployed at ", factory.address);

    await factory.createPair(token0.address, token1.address);

    const pair = await factory.getPair(token0.address, token1.address);
    console.log("Created pair at ", pair);

    masterChef = await SpiritMasterChef.new(
      rewardsToken.address,
      john,
      address(0),
      toWei(10),
      0,
      { from: john }
    );
    console.log("SpiritMasterChef deployed at ", masterChef.address);
    await rewardsToken.transfer(masterChef.address, toWei(1000000), {
      from: john,
    });

    const rewardBalance = await rewardsToken.balanceOf(masterChef.address);
    console.log(
      "Reward token balance of masterChef contract is ",
      rewardBalance.toString()
    );

    await masterChef.add(100, pair, poolDepositFeeBps, false, { from: john });

    poolStartBlock = await blockNumber();
    console.log("Pool start block: ", poolStartBlock);

    router = await SpiritRouter.new(factory.address, weth.address);
    console.log("SpiritRouter deployed at ", router.address);

    await token0.approve(router.address, toWei(10000));
    await token1.approve(router.address, toWei(10000));

    await router.addLiquidity(
      token0.address,
      token1.address,
      toWei(10000),
      toWei(10000),
      0,
      0,
      alice,
      16250578290
    );

    await token0.approve(router.address, toWei(40000), { from: bob });
    await token1.approve(router.address, toWei(40000), { from: bob });

    await router.addLiquidity(
      token0.address,
      token1.address,
      toWei(40000),
      toWei(40000),
      0,
      0,
      bob,
      16250578290,
      { from: bob }
    );

    underlyingToken = await UniswapV2Pair.at(pair);

    vaultTokenFactory = await VaultTokenFactory.new(
      router.address,
      masterChef.address,
      rewardsToken.address,
      997
    );
    console.log("VaultTokenFactory deployed at ", vaultTokenFactory.address);
  });

  it("Before. createVaultToken should work", async () => {
    const _pid = 0;
    await vaultTokenFactory.createVaultToken(_pid);
    const allVaultTokensLength = await vaultTokenFactory.allVaultTokensLength();
    assert(allVaultTokensLength.toString() === "1", "createVaultToken error");
  });

  it("1. VaultToken Mint Test", async () => {
    const _pid = 0;
    const vaultTokenAddress = await vaultTokenFactory.getVaultToken(_pid);
    vaultToken = await VaultToken.at(vaultTokenAddress);
    console.log("Vault Token created at ", vaultToken.address);

    console.log("============== Alice mint ===========");
    const aliceBalanceBefore = await underlyingToken.balanceOf(alice);
    console.log(
      "Alice's underlying token balance is ",
      aliceBalanceBefore.toString()
    );

    await underlyingToken.transfer(vaultToken.address, aliceBalanceBefore);

    console.log("==== Alice's staking is being permanently locked ======");
    await vaultToken.mint(alice);

    const aliceVaultTokenBalance = await vaultToken.balanceOf(alice);

    const minimum_liquidity = await vaultToken.MINIMUM_LIQUIDITY();

    expect(aliceBalanceBefore.toString()).to.equal(
      aliceVaultTokenBalance
        .add(minimum_liquidity)
        .mul(new BN(10000))
        .div(new BN(10000 - poolDepositFeeBps))
        .toString()
    );

    console.log("============== Bob mint ===========");
    bobBalanceBefore = await underlyingToken.balanceOf(bob);
    console.log(
      "Bob's underlying token balance is ",
      bobBalanceBefore.toString()
    );

    await underlyingToken.transfer(vaultToken.address, bobBalanceBefore, {
      from: bob,
    });
    console.log(
      "VaultToken's underlying token balance is ",
      (await underlyingToken.balanceOf(vaultToken.address)).toString()
    );
    await vaultToken.mint(bob, { from: bob });

    const bobVaultTokenBalance = await vaultToken.balanceOf(bob);
    console.log(
      "Bob's vaultToken balance is ",
      bobVaultTokenBalance.toString()
    );
    expect(bobVaultTokenBalance.toString()).to.equal(
      bobBalanceBefore
        .mul(new BN(10000 - poolDepositFeeBps))
        .div(new BN(10000))
        .toString()
    );
  });

  it("2. VaultToken Redeem & Reinvest Test", async () => {
    let currentBlock = await blockNumber();
    console.log("Current block: ", currentBlock);
    console.log(
      "Alice's reward token balance is ",
      (await rewardsToken.balanceOf(alice)).toString()
    );
    while (currentBlock < poolStartBlock + 100) {
      await rpc({ method: "evm_mine" });
      currentBlock = await blockNumber();
    }
    console.log("Curent block: ", currentBlock);
    console.log(
      "=========== After 100 blocks from pool start : Reinvest from bob ========="
    );
    await vaultToken.reinvest({ from: bob });

    console.log(
      "Bob's underlying balance before is ",
      (await underlyingToken.balanceOf(bob)).toString()
    );
    console.log(
      "Bob's reward token balance is ",
      (await rewardsToken.balanceOf(bob)).toString()
    );
    const bobVaultTokenBalance = await vaultToken.balanceOf(bob);
    await vaultToken.transfer(vaultToken.address, bobVaultTokenBalance, {
      from: bob,
    });
    await vaultToken.redeem(bob, { from: bob });
    bobBalanceAfter = await underlyingToken.balanceOf(bob);
    assert(bobBalanceAfter.gt(bobBalanceBefore), "reinvest error");
    console.log(
      "Bob's underlying balance after is ",
      bobBalanceAfter.toString()
    );
  });
});
