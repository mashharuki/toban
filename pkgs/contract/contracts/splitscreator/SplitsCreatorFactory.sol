// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import { LibClone } from "solady/src/utils/LibClone.sol";
import { SplitsCreator } from "./SplitsCreator.sol";
import { ISplitsCreator } from "./ISplitsCreator.sol";
import { ERC2771ContextUpgradeable } from "./../ERC2771ContextUpgradeable.sol";

contract SplitsCreatorFactory is ERC2771ContextUpgradeable {
	event SplitCreatorCreated(
		address indexed creator,
		address indexed splitCreator,
		uint256 topHatId,
		address trustedForwarder,
		address splitFactoryV2,
		address hatsTimeFrameModule,
		address fractionToken
	);

	address public SPLITS_CREATOR_IMPLEMENTATION;

	function initialize(
		address _trustedForwarderAddress,
		address _splitsCreatorImplementation
	) public initializer {
		__ERC2771Context_init(_trustedForwarderAddress);
		SPLITS_CREATOR_IMPLEMENTATION = _splitsCreatorImplementation;
	}

	function createSplitCreatorDeterministic(
		uint256 _topHatId,
		address _trustedForwarder,
		address _hats,
		address _splitFactoryV2,
		address _hatsTimeFrameModule,
		address _fractionToken,
		bytes32 _salt
	) external returns (address splitCreator) {
		splitCreator = LibClone.cloneDeterministic(
			SPLITS_CREATOR_IMPLEMENTATION,
			abi.encode(
				_trustedForwarder,
				_hats,
				_splitFactoryV2,
				_hatsTimeFrameModule,
				_fractionToken
			),
			_getSalt(
				_topHatId,
				_trustedForwarder,
				_hats,
				_splitFactoryV2,
				_hatsTimeFrameModule,
				_fractionToken,
				_salt
			)
		);

		emit SplitCreatorCreated(
			_msgSender(),
			splitCreator,
			_topHatId,
			_trustedForwarder,
			_splitFactoryV2,
			_hatsTimeFrameModule,
			_fractionToken
		);
	}

	function predictDeterministicAddress(
		uint256 _topHatId,
		address _trustedForwarder,
		address _hats,
		address _splitFactoryV2,
		address _hatsTimeFrameModule,
		address _fractionToken,
		bytes32 _salt
	) external view returns (address) {
		return
			LibClone.predictDeterministicAddress(
				SPLITS_CREATOR_IMPLEMENTATION,
				abi.encode(
					_trustedForwarder,
					_hats,
					_splitFactoryV2,
					_hatsTimeFrameModule,
					_fractionToken
				),
				_getSalt(
					_topHatId,
					_trustedForwarder,
					_hats,
					_splitFactoryV2,
					_hatsTimeFrameModule,
					_fractionToken,
					_salt
				),
				address(this)
			);
	}

	function _getSalt(
		uint256 _topHatId,
		address _trustedForwarder,
		address _hats,
		address _splitFactoryV2,
		address _hatsTimeFrameModule,
		address _fractionToken,
		bytes32 _salt
	) internal pure returns (bytes32) {
		return
			keccak256(
				abi.encodePacked(
					_topHatId,
					_trustedForwarder,
					_hats,
					_splitFactoryV2,
					_hatsTimeFrameModule,
					_fractionToken,
					_salt
				)
			);
	}

	function _msgSender()
		internal
		view
		override(ERC2771ContextUpgradeable)
		returns (address sender)
	{
		return super._msgSender();
	}

	function _msgData()
		internal
		view
		override(ERC2771ContextUpgradeable)
		returns (bytes calldata)
	{
		return super._msgData();
	}
}
