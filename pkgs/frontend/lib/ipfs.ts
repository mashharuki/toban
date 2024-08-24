import { IpfsDetails } from '@/types';
import { HatsDetailsClient } from "@hatsprotocol/details-sdk";
import { PinataSDK } from "pinata";
import { PINATA_PUBLIC_GATEWAY_URL } from './constants';

const IPFS_PREFIX = 'ipfs://';
const GATEWAY_URL = 'https://ipfs.io/ipfs/';

// create HatsDetailsClient
let hatsDetailsClient: HatsDetailsClient = new HatsDetailsClient({
  provider: "pinata",
  pinata: {
    pinningKey: process.env.PINATA_JWT as string,
  },
});

// Pinata用のSDKクライアントインスタンスを生成
const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
  pinataGateway: "gateway.pinata.cloud/ipfs",
});


export const ipfsToHttp = (ipfsUrl: string) => {
  if (ipfsUrl === undefined) return;
  if (!ipfsUrl.startsWith(IPFS_PREFIX)) {
    return ipfsUrl;
  }

  const cid = ipfsUrl.split('://')[1];
  return `${GATEWAY_URL}${cid}`;
};

/**
 * ipfs:// という文言を削除するメソッド
 * @param uri 
 * @returns 
 */
function removeIpfsPrefix(uri: string): string {
  const prefix = 'ipfs://';
  if (uri.startsWith(prefix)) {
      return uri.substring(prefix.length);
  }
  return uri;
}

export const resolveIpfsUri = async (uri: string): Promise<IpfsDetails> => {
  const ipfsGateway = 'https://ipfs.io/ipfs/';
  let cid = removeIpfsPrefix(uri);

  const data: any = await hatsDetailsClient.get(cid);
  console.log('data:', data);
  /*
  const response = await fetch(`${ipfsGateway}${cid}`);
  console.log(`${ipfsGateway}${cid}`)
  console.log('response:', response);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  */

  return {
    name: data.data.name ?? '',
    description: data.data.description ?? '',
    guilds: data.data.guilds ?? [],
    spaces: data.data.spaces ?? [],
    responsibilities: data.data.responsibilities ?? [],
    authorities: data.data.authorities ?? [],
    eligibility: data.data.eligibility ?? { manual: false, criteria: [] },
    toggle: data.data.toggle ?? { manual: false, criteria: [] },
  };
};

/**
 * ファイルをIPFSにアップロードするためのメソッド
 * @param file
 */
export const uploadFileToIpfs = async(file: any) => {
  try {
    // ファイルをアップロード
    const upload = await pinata.upload.file(file);
    console.log("upload result:", upload);
    // IPFSからデータを取得する。
    const data = await pinata.gateways.get(upload.IpfsHash);
    console.log("uploaded data:",data);
    // コンテンツまでのURLを返却する。
    return `${PINATA_PUBLIC_GATEWAY_URL}/${upload.IpfsHash}`;
  } catch (error) {
    console.log("error occuered when uploading file to IPFS:", error);
    return null;
  }
}