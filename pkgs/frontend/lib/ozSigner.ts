import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from "@openzeppelin/defender-relay-client/lib/ethers";

/**
 * get Relayer method
 */
export const getRelayer = async () => {
  const credentials: any = {
    apiKey: process.env.NEXT_PUBLIC_DEFENDER_API_KEY,
    apiSecret: process.env.NEXT_PUBLIC_DEFENDER_SECRET_KEY,
  };

  const ozProvider = new DefenderRelayProvider(credentials);
  const ozSigner = new DefenderRelaySigner(credentials, ozProvider, {
    speed: "fast",
  });

  console.log("ozSigner:", await ozSigner.getAddress());

  return ozSigner;
};