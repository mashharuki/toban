import axios from "axios";
import type { NameData, TextRecords } from "namestone-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveWallet } from "./useWallet";

export const useActiveWalletIdentity = () => {
  const { wallet } = useActiveWallet();

  const address = useMemo(() => {
    if (!wallet) return [];
    return [wallet.account.address];
  }, [wallet]);
  const { names } = useNamesByAddresses(address);

  const identity = useMemo(() => {
    if (!wallet || !names || names.length === 0) return;
    return names[0][0];
  }, [names, wallet]);

  return { identity };
};

export const useNamesByAddresses = (addresses?: string[]) => {
  const [names, setNames] = useState<NameData[][]>([]);

  const fetchNames = useCallback(async (addresses: string[]) => {
    try {
      const { data } = await axios.get<NameData[][]>(
        "/api/namestone/resolve-names",
        {
          params: { addresses: addresses.join(",") },
        },
      );
      const unresolvedAddresses = addresses
        .filter((address) => {
          return !data.some(
            (nameData) =>
              nameData[0]?.address.toLowerCase() === address.toLowerCase(),
          );
        })
        .map((address) => {
          return [{ address, name: "", domain: "" }];
        });
      const result = [...data, ...unresolvedAddresses];
      setNames(result);
      return result;
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (!addresses) return;
    fetchNames(addresses);
  }, [addresses, fetchNames]);

  return { names, fetchNames };
};

export const useAddressesByNames = (names?: string[], exactMatch?: boolean) => {
  const [addresses, setAddresses] = useState<NameData[][]>([]);

  const fetchAddresses = useCallback(
    async (resolveNames: string[]) => {
      try {
        const { data } = await axios.get<NameData[][]>(
          "/api/namestone/resolve-addresses",
          {
            params: { names: resolveNames.join(","), exact_match: exactMatch },
          },
        );
        setAddresses(data);
        return data as NameData[][];
      } catch (error) {
        console.error(error);
      }
    },
    [exactMatch],
  );

  useEffect(() => {
    if (!names || names.length === 0 || names.includes("")) return;
    fetchAddresses(names);
  }, [names, fetchAddresses]);

  return { addresses, fetchAddresses };
};

export const useSetName = () => {
  const [isLoading, setIsLoading] = useState(false);

  const setName = useCallback(
    async (params: {
      name: string;
      address?: string;
      text_records?: TextRecords;
    }) => {
      if (!params.address || !params.name) return;
      setIsLoading(true);
      try {
        await axios.post("/api/namestone/set-name", params);
      } catch (error) {
        console.error(error);
      }
      setIsLoading(false);
    },
    [],
  );

  return { setName, isLoading };
};
