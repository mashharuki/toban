// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import { ISplitsCreator } from "./ISplitsCreator.sol";
import { ISplitFactoryV2 } from "../splits/interfaces/ISplitFactoryV2.sol";
import { SplitV2Lib } from "../splits/libraries/SplitV2.sol";
import { IFractionToken } from "../fractiontoken/IFractionToken.sol";
import { IHatsTimeFrameModule } from "../timeframe/IHatsTimeFrameModule.sol";
import { ERC2771Context } from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import { Clone } from "solady/src/utils/Clone.sol";

import "hardhat/console.sol";

contract SplitsCreator is ISplitsCreator, Clone {
	function TRUSTED_FORWARDER() public pure returns (address) {
		return _getArgAddress(12);
	}

	function SPLIT_FACTORY_V2() public pure returns (ISplitFactoryV2) {
		return ISplitFactoryV2(_getArgAddress(44));
	}

	function HATS_TIME_FRAME_MODULE()
		public
		pure
		returns (IHatsTimeFrameModule)
	{
		return IHatsTimeFrameModule(_getArgAddress(76));
	}

	function FRACTION_TOKEN() public pure returns (IFractionToken) {
		return IFractionToken(_getArgAddress(108));
	}

	function create(
		SplitsInfo[] memory _splitsInfo
	) external returns (address) {
		uint256 numOfShareHolders = 0;
		for (uint i = 0; i < _splitsInfo.length; i++) {
			SplitsInfo memory _splitInfo = _splitsInfo[i];
			for (uint si = 0; si < _splitInfo.wearers.length; si++) {
				uint256 tokenId = FRACTION_TOKEN().getTokenId(
					_splitInfo.hatId,
					_splitInfo.wearers[si]
				);
				address[] memory recepients = FRACTION_TOKEN()
					.getTokenRecipients(tokenId);
				numOfShareHolders += recepients.length;
			}
		}

		address[] memory shareHolders = new address[](numOfShareHolders);
		address[] memory wearers = new address[](numOfShareHolders);
		uint256[] memory hatIdsOfShareHolders = new uint256[](numOfShareHolders);
		uint256[] memory roleMultipliersOfShareHolders = new uint256[](
			numOfShareHolders
		);
		uint256[] memory hatsTimeFrameMultipliersOfShareHolders = new uint256[](
			numOfShareHolders
		);

		uint256 shareHolderIndex = 0;

		for (uint i = 0; i < _splitsInfo.length; i++) {
			SplitsInfo memory _splitInfo = _splitsInfo[i];
			uint256 roleMultiplier = _splitInfo.multiplierTop /
				_splitInfo.multiplierBottom;
			for (uint si = 0; si < _splitInfo.wearers.length; si++) {
				uint256 tokenId = FRACTION_TOKEN().getTokenId(
					_splitInfo.hatId,
					_splitInfo.wearers[si]
				);
				uint256 hatsTimeFrameMultiplier = _getHatsTimeFrameMultiplier(
					_splitInfo.wearers[si],
					_splitInfo.hatId
				);

				// FractionTokenのホルダーに対する分配の計算
				address[] memory recipients = FRACTION_TOKEN()
					.getTokenRecipients(tokenId);
				for (uint j = 0; j < recipients.length; j++) {
					shareHolders[shareHolderIndex] = recipients[j];
					wearers[shareHolderIndex] = _splitInfo.wearers[si];
					hatIdsOfShareHolders[shareHolderIndex] = _splitInfo.hatId;
					roleMultipliersOfShareHolders[
						shareHolderIndex
					] = roleMultiplier;
					hatsTimeFrameMultipliersOfShareHolders[
						shareHolderIndex
					] = hatsTimeFrameMultiplier;
					shareHolderIndex++;
				}
			}
		}

		uint256[] memory balanceOfShareHolders = FRACTION_TOKEN()
			.balanceOfBatch(shareHolders, wearers, hatIdsOfShareHolders);

		uint256 totalAllocation = 0;
		uint256[] memory allocations = new uint256[](shareHolderIndex);
		for (uint256 i = 0; i < shareHolderIndex; i++) {
			uint256 share = balanceOfShareHolders[i] *
				roleMultipliersOfShareHolders[i] *
				hatsTimeFrameMultipliersOfShareHolders[i];
			totalAllocation += share;
			allocations[i] = share;
		}

		SplitV2Lib.Split memory _splitParams = SplitV2Lib.Split({
			recipients: shareHolders,
			allocations: allocations,
			totalAllocation: totalAllocation,
			distributionIncentive: 0
		});

		address split = SPLIT_FACTORY_V2().createSplitDeterministic(
			_splitParams,
			address(this),
			msg.sender,
			_generateSalt(_splitsInfo)
		);

		emit SplitsCreated(
			split,
			shareHolders,
			allocations,
			totalAllocation
		);

		return split;
	}

	function _getHatsTimeFrameMultiplier(
		address _wearer,
		uint256 _hatId
	) internal view returns (uint256) {
		if (address(HATS_TIME_FRAME_MODULE()) == address(0)) return 1;
		return
			_sqrt(
				HATS_TIME_FRAME_MODULE().getWearingElapsedTime(_wearer, _hatId)
			);
	}

	function _sqrt(uint256 y) internal pure returns (uint256 z) {
		if (y > 3) {
			z = y;
			uint256 x = y / 2 + 1;
			while (x < z) {
				z = x;
				x = (y / x + x) / 2;
			}
		} else if (y != 0) {
			z = 1;
		}
		// else z = 0 (default value)
	}

	function _generateSalt(
		SplitsInfo[] memory splitsInfo
	) internal pure returns (bytes32) {
		return keccak256(abi.encode(splitsInfo));
	}
}
