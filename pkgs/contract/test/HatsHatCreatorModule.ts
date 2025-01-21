import { expect } from "chai";
import { viem } from "hardhat";
import type { Address, PublicClient, WalletClient } from "viem";
import { decodeEventLog, encodeAbiParameters } from "viem";
import {
  type Hats,
  type HatsModuleFactory,
  type HatsHatCreatorModule,
  deployHatsModuleFactory,
  deployHatsProtocol,
  deployHatsHatCreatorModule,
} from "../helpers/deploy/Hats";

describe("HatsHatCreatorModule", () => {
  let Hats: Hats;
  let HatsModuleFactory: HatsModuleFactory;
  let HatsHatCreatorModule_IMPL: HatsHatCreatorModule;
  let HatsHatCreatorModule: HatsHatCreatorModule;
  let address1: WalletClient;
  let address2: WalletClient;
  let address3: WalletClient;
  let address1Validated: Address;
  let address2Validated: Address;
  let address3Validated: Address;

  let topHatId: bigint;
  let hatterHatId: bigint;
  let roleHatId: bigint | undefined;

  let publicClient: PublicClient;

  const validateAddress = (client: WalletClient): Address => {
    if (!client.account?.address) {
      throw new Error("Wallet client account address is undefined");
    }
    return client.account.address;
  };

  before(async () => {
    const { Hats: _Hats } = await deployHatsProtocol();
    const { HatsModuleFactory: _HatsModuleFactory } =
      await deployHatsModuleFactory(_Hats.address);

    Hats = _Hats;
    HatsModuleFactory = _HatsModuleFactory;

    [address1, address2, address3] = await viem.getWalletClients();
    address1Validated = validateAddress(address1);
    address2Validated = validateAddress(address2);
    address3Validated = validateAddress(address3);

    await Hats.write.mintTopHat([
      address1Validated,
      "Description",
      "https://test.com/tophat.png",
    ]);

    topHatId = BigInt(
      "0x0000000100000000000000000000000000000000000000000000000000000000",
    );

    const { HatsHatCreatorModule: _HatsHatCreatorModule } =
      await deployHatsHatCreatorModule(address1Validated);
      HatsHatCreatorModule_IMPL = _HatsHatCreatorModule;

    publicClient = await viem.getPublicClient();
  });

  describe("deploy hat creator module", () => {
    it("deploy hat creator module", async () => {
      // オーナーアドレスをエンコード
      const initData = encodeAbiParameters(
        [{ type: 'address' }],
        [address1Validated]
      );

      // HatsModuleインスタンスをデプロイ
      await HatsModuleFactory.write.createHatsModule([
        HatsHatCreatorModule_IMPL.address,
        topHatId,
        "0x", // otherImmutableArgs
        initData, // 初期化データとしてオーナーアドレスを渡す
        BigInt(0),
      ]);

      const moduleAddress = await HatsModuleFactory.read.getHatsModuleAddress([
        HatsHatCreatorModule_IMPL.address,
        topHatId,
        "0x",
        BigInt(0),
      ]);

      HatsHatCreatorModule = await viem.getContractAt(
        "HatsHatCreatorModule",
        moduleAddress,
      );

      expect(
        (await HatsHatCreatorModule.read.IMPLEMENTATION()).toLowerCase(),
      ).equal(HatsHatCreatorModule_IMPL.address);

      // Hatter Hatを作成
      let txHash = await Hats.write.createHat([
        topHatId,
        "",
        100,
        "0x0000000000000000000000000000000000004a75",
        "0x0000000000000000000000000000000000004a75",
        true,
        "",
      ]);
      let receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      let _hatterHatId;
      for (const log of receipt.logs) {
        const decodedLog = decodeEventLog({
          abi: Hats.abi,
          data: log.data,
          topics: log.topics,
        });
        if (decodedLog.eventName === "HatCreated") {
          _hatterHatId = decodedLog.args.id;
        }
      }

      if (!_hatterHatId) {
        throw new Error("Hatter hat ID not found in transaction logs");
      } else {
        hatterHatId = _hatterHatId
      }

      // Hatter HatをHatCreatorModuleにミント
      await Hats.write.mintHat([hatterHatId, HatsHatCreatorModule.address]);
    });

    it("check owner", async () => {
      const owner = (await HatsHatCreatorModule.read.owner()).toLowerCase();
      expect(owner).to.equal(address1Validated.toLowerCase());
    });

    it("check createHatAuthorities are false", async () => {
      let checkCreateHatAuthority;

      checkCreateHatAuthority = await HatsHatCreatorModule.read.createHatAuthorities([address1Validated]);
      expect(checkCreateHatAuthority).to.be.true;

      checkCreateHatAuthority = await HatsHatCreatorModule.read.createHatAuthorities([address2Validated]);
      expect(checkCreateHatAuthority).to.be.false;

      checkCreateHatAuthority = await HatsHatCreatorModule.read.createHatAuthorities([address3Validated]);
      expect(checkCreateHatAuthority).to.be.false;
    });

    it("check HatsHatCreatorModule wears Hatter Hat", async () => {
      // hatterHatIdが定義されていることを確認
      if (!hatterHatId) {
        throw new Error("Hatter hat ID not found");
      }

      // HatsHatCreatorModuleがHatterHatを所有しているか確認
      const isWearer = await Hats.read.isWearerOfHat([
        HatsHatCreatorModule.address,
        hatterHatId
      ]);
      expect(isWearer).to.be.true;
    });
  });

  describe("create hat authority", () => {
    it("grant create hat authority", async () => {
      let hasAuthority;
      hasAuthority = await HatsHatCreatorModule.read.hasCreateHatAuthority([
        address2Validated,
      ]);
      expect(hasAuthority).to.be.false;

      await HatsHatCreatorModule.write.grantCreateHatAuthority(
        [address2Validated],
        { account: address1.account }
      );

      hasAuthority = await HatsHatCreatorModule.read.hasCreateHatAuthority([
        address2Validated,
      ]);
      expect(hasAuthority).to.be.true;
    });

    it("revoke create hat authority", async () => {
      let hasAuthority;
      hasAuthority = await HatsHatCreatorModule.read.hasCreateHatAuthority([
        address2Validated,
      ]);
      expect(hasAuthority).to.be.true;

      await HatsHatCreatorModule.write.revokeCreateHatAuthority([address2Validated]);

      hasAuthority = await HatsHatCreatorModule.read.hasCreateHatAuthority([
        address2Validated,
      ]);
      expect(hasAuthority).to.be.false;
    });
  });

  describe("create hat with authority", () => {
    it("create hat with authority", async () => {
      // 権限を付与
      await HatsHatCreatorModule.write.grantCreateHatAuthority([address2Validated]);

      // 権限を持つアドレスからのhat作成
      const hatDetails = "Test Hat";
      const maxSupply = 10;
      const eligibility = "0x0000000000000000000000000000000000004a75";
      const toggle = "0x0000000000000000000000000000000000004a75";
      const mutable = true;
      const imageURI = "https://test.com/hat.png";

      const createHatTx = await HatsHatCreatorModule.write.createHat(
        [hatterHatId, hatDetails, maxSupply, eligibility, toggle, mutable, imageURI],
        { account: address2.account }
      );

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: createHatTx,
      });
      expect(receipt.status).to.equal("success");
    });
  });

  describe("edge cases", () => {
    it("should fail when unauthorized address tries to create hat", async () => {
      // 権限のないアドレスからのhat作成試行
      await expect(
        HatsHatCreatorModule.write.createHat(
          [
            topHatId,
            "Test Hat",
            10,
            "0x0000000000000000000000000000000000004a75",
            "0x0000000000000000000000000000000000004a75",
            true,
            "https://test.com/hat.png",
          ],
          { account: address3.account }
        )
      ).to.be.rejectedWith("Not authorized");
    });

    it("should fail when granting authority to zero address", async () => {
      // zero addressへの権限付与試行
      await expect(
        HatsHatCreatorModule.write.grantCreateHatAuthority([
          "0x0000000000000000000000000000000000000000",
        ])
      ).to.be.rejectedWith("Invalid address");
    });

    it("should fail when granting authority to already authorized address", async () => {
      // 既に権限を持っているアドレスへの権限付与試行
      await expect(
        HatsHatCreatorModule.write.grantCreateHatAuthority([address2Validated])
      ).to.be.rejectedWith("Already granted");
    });

    it("should fail when revoking authority from unauthorized address", async () => {
      // 権限を持っていないアドレスからの剥奪試行
      await expect(
        HatsHatCreatorModule.write.revokeCreateHatAuthority([address3Validated])
      ).to.be.rejectedWith("Not granted");
    });
  });
});