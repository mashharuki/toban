import { ethers, upgrades, viem } from "hardhat";
import type { Address } from "viem";

export type FractionToken = Awaited<
  ReturnType<typeof deployFractionToken>
>["FractionToken"];

export const deployFractionToken = async (
  uri: string,
  tokenSupply: bigint,
  hatsContractAddress: Address,
) => {
  const _tokenSupply = !tokenSupply ? 10000n : tokenSupply;
  const fractionToken = await ethers.getContractFactory("FractionToken");
  const _FractionToken = await upgrades.deployProxy(
    fractionToken,
    [uri, _tokenSupply, hatsContractAddress],
    {
      initializer: "initialize",
    },
  );

  await _FractionToken.waitForDeployment();
  const address = await _FractionToken.getAddress();

  // create a new instance of the contract
  const FractionToken = await viem.getContractAt(
    "FractionToken",
    address as Address,
  );

  return { FractionToken };
};
