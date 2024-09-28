import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-viem";
import * as dotenv from "dotenv";
import fs from "fs";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import path from "path";

dotenv.config();

const {
	PRIVATE_KEY,
	ETHERSCAN_API_KEY,
	ALCHEMY_API_KEY,
	COINMARKETCAP_API_KEY,
	GAS_REPORT,
} = process.env;

// タスクファイルを読み込むための設定
const SKIP_LOAD = process.env.SKIP_LOAD === "true";
if (!SKIP_LOAD) {
	const taskPaths = ["", "utils", "ens"];
	taskPaths.forEach((folder) => {
		const tasksPath = path.join(__dirname, "tasks", folder);
		fs.readdirSync(tasksPath)
			.filter((_path) => _path.includes(".ts"))
			.forEach((task) => {
				require(`${tasksPath}/${task}`);
			});
	});
}

const config: HardhatUserConfig = {
	solidity: {
		compilers: [
			{
				version: "0.8.24",
				settings: {
					viaIR: true,
				},
			},
		],
	},
	networks: {
		hardhat: {
			allowUnlimitedContractSize: true,
		},
		sepolia: {
			url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
			accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
		},
	},
	etherscan: {
		apiKey: {
			sepolia: ETHERSCAN_API_KEY!,
		},
	},
	gasReporter: {
		enabled: true,
		//		currency: "JPY",
		currency: "USD",
		outputFile: "gas-report.txt", // 結果をファイルに保存
		noColors: true, // ファイル出力用に色を無効化
		//		gasPrice: 20,
		token: "ETH",
		coinmarketcap: COINMARKETCAP_API_KEY,
		gasPriceApi:
			"https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
	},
};

export default config;
