import type { Split } from "@0xsplits/splits-sdk";
import { SPLITS_CREATOR_ABI } from "abi/splits";
import { useCallback, useEffect, useMemo, useState } from "react";
import { splitsDataClient } from "utils/splits";
import { type AbiItemArgs, type Address, parseEventLogs } from "viem";
import { currentChain, publicClient } from "./useViem";
import { useActiveWallet } from "./useWallet";
import { useGetWorkspace } from "./useWorkspace";

/**
 * Splits creator 用 React hooks
 */
export const useSplitsCreator = (treeId: string) => {
  const { wallet } = useActiveWallet();

  const [isLoading, setIsLoading] = useState(false);

  const { data } = useGetWorkspace(treeId);
  const splitsCreatorAddress = useMemo(() => {
    return data?.workspace?.splitCreator as Address;
  }, [data?.workspace?.splitCreator]);

  const previewSplits = async (
    args: AbiItemArgs<typeof SPLITS_CREATOR_ABI, "preview">[0],
  ) => {
    const res = await publicClient.readContract({
      address: splitsCreatorAddress,
      abi: SPLITS_CREATOR_ABI,
      functionName: "preview",
      args: [args],
    });

    return res;
  };

  /**
   * Splitsを作成するコールバック関数
   */
  const createSplits = useCallback(
    async (params: {
      args: AbiItemArgs<typeof SPLITS_CREATOR_ABI, "create">[0];
    }) => {
      if (!wallet || !splitsCreatorAddress) return;

      setIsLoading(true);

      try {
        const txHash = await wallet.writeContract({
          address: splitsCreatorAddress,
          abi: SPLITS_CREATOR_ABI,
          functionName: "create",
          args: [params.args],
        });

        console.log("txHash:", txHash);

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });

        const parsedLog = parseEventLogs({
          abi: SPLITS_CREATOR_ABI,
          eventName: "SplitsCreated",
          logs: receipt.logs,
          strict: false,
        });

        return parsedLog;
      } catch (error) {
        console.error("error occured when creating Splits:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [splitsCreatorAddress, wallet],
  );

  return {
    isLoading,
    createSplits,
    previewSplits,
  };
};

export const useSplitsCreatorRelatedSplits = (splitsCreator?: Address) => {
  const [isLoading, setIsLoading] = useState(false);
  const [splits, setSplits] = useState<Split[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        if (!splitsCreator) return;
        const res = await splitsDataClient?.getRelatedSplits({
          address: splitsCreator,
          chainId: currentChain.id,
        });

        if (res) {
          setSplits(res.controlling);
        }
      } catch (error) {
        console.error("error occured when fetching splits:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [splitsCreator]);

  return { isLoading, splits };
};
