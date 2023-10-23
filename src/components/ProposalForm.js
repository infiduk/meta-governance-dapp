import React from "react";
import { Button, Select, Icon } from "antd";

import {
  callContractMethod,
  encodeABIValueInMethod,
  web3Instance,
} from "../web3";

import * as PComponent from "./Forms";
import * as MComponent from "./MyForm";
import * as util from "../util";

import {
  constants,
  ENV_MY_INFO_PROPOSAL_LIST,
  ENV_NAMES,
  ENV_VOTING_PROPOSAL_LIST,
} from "../constants";

class ProposalForm extends React.Component {
  data = {
    formData: {},
    selectedTopic: "",
  };

  state = {
    selectedTopic: "",
    // Add Authority Member
    // Replace Authority Member
    newAddrErr: false,
    newNameErr: false,
    newNodeErr: false,
    newLockAmountErr: false,
    // Governance Contract Address
    newGovAddrErr: false,
    // Voting Duration Setting
    votDurationErr: null,
    // Authority Member Staking Amount
    authMemSkAmountErr: false,
    // Block Creation Time
    blockCreationErr: false,
    // Block Reward Amonut
    blockRewardAmountErr: false,
    // Block Reward Distribution Method
    blockRates: {
      blockRate1: 0,
      blockRate2: 0,
      blockRate3: 0,
      blockRate4: 0,
    },
    blockRateTotal: 0,
    blockRewardDisMthErr: false,
    // MaxPriorityFeePerGas
    maxPriorityFeePerGasErr: false,
    // Gas Limit & baseFee
    gasLimitErr: false,
    maxBaseFeeErr: false,
    baseFeeMaxChangeRateErr: false,
    gasTargetPercentageErr: false,
    // Replace Authority Member
    stakingAddrErr: false,
    // Remove Authority Member
    oldLockAmountErr: false,
    showLockAmount: "",
    // Voting Address
    newVotingAddrErr: false,
    // Reward Address
    newRewardAddrErr: false,
  };

  async componentDidMount() {
    await this.getMyInfo();
  }

  componentDidUpdate(props) {
    // changes due to the use of the same component
    if (
      props.selectedMenu === "menu-voting" &&
      this.props.selectedMenu === "menu-myinfo"
    ) {
      // setting select default value (Myinfo)
      this.data.selectedTopic = "";
      this.setState({ selectedTopic: "" });
    }
  }

  getLockAmount = async (addr) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      this.props.getErrModal(
        "Staking Address is Invalid.",
        "Proposal Submit Error",
      );
      this.setState({ showLockAmount: "" });
      return;
    } else if (!web3Instance.web3.utils.checkAddressChecksum(addr)) {
      addr = web3Instance.web3.utils.toChecksumAddress(addr);
    }
    if (!(await callContractMethod(web3Instance, "GovImp", "isMember", addr))) {
      this.props.getErrModal(
        "Non-existing Member Address.",
        "Proposal Submit Error",
      );
      this.setState({ showLockAmount: "" });
      return;
    }

    try {
      let lockedBalance = await callContractMethod(
        web3Instance,
        "Staking",
        "lockedBalanceOf",
        addr,
      );
      this.setState({
        showLockAmount: util.convertWeiToEther(lockedBalance),
      });
    } catch (err) {
      console.log(err);
      this.props.getErrModal(err.message, err.name);
      this.props.convertLoading(false);
      this.setState({ showLockAmount: "" });
    }
  };

  resetForm() {
    if (window.document.forms[0]) {
      const elements = window.document.forms[0].elements;
      Object.keys(elements).forEach((key) => {
        switch (elements[key].name) {
          case "newLockAmount":
          case "oldLockAmount":
            elements[key].value = this.props.stakingMin;
            break;
          default:
            elements[key].value = "";
        }
      });
    }
  }

  // only, when the topic has changed
  handleSelectTopicChange = async (topic) => {
    const { stakingMin, votingDurationMin, votingDurationMax } = this.props;

    // for getting addresses
    const isMyInfo = ENV_MY_INFO_PROPOSAL_LIST.filter(
      (item) => item.value === topic,
    )[0];
    if (isMyInfo) {
      await this.getMyInfo();
    }

    this.data.selectedTopic = topic;
    this.setState({ selectedTopic: topic });
    this.data.formData = {
      ...this.data.formData,
      newLockAmount: stakingMin,
      oldLockAmount: stakingMin,
      votingDurationMin,
      votingDurationMax,
    };
    this.resetForm();

    Object.keys(this.state)
      .filter((key) => key.indexOf("Err") > 0)
      .forEach((key) => {
        this.setState({ [key]: false });
      });
  };

  // when the select option has changed
  handleSelectChange(e) {
    let [name, value] = e.split("_");
    this.data.formData[name] = value;
  }

  handleChange = (e) => {
    // if selected value is topic
    if (typeof e === "string") {
      this.handleSelectChange(e);
      return;
    }
    const originStr = this.data.formData[e.target.name];
    this.data.formData[e.target.name] = e.target.value;
    switch (e.target.name) {
      // Add Authority Member
      case "newAddr":
        this.setState({ newAddrErr: !util.checkAddress(e.target.value) });
        break;
      case "newName":
        this.setState({ newNameErr: !util.checkName(e.target.value) });
        break;
      case "newLockAmount":
        if (!/^([0-9]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else
          this.setState({
            newLockAmountErr: !this.checkLockAmount(e.target.value),
          });
        break;
      case "newNode":
        this.setState({ newNodeErr: !util.checkNode(e.target.value) });
        break;
      // Replace Authority Member
      case "stakingAddr":
        this.setState({ stakingAddrErr: !util.checkAddress(e.target.value) });
        break;
      // Remove Authority Member
      case "oldLockAmount":
        if (!/^([0-9]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else
          this.setState({
            oldLockAmountErr: !this.checkLockAmount(e.target.value),
          });
        break;
      // Governance Contract Address
      case "newGovAddr":
        this.setState({ newGovAddrErr: !util.checkAddress(e.target.value) });
        break;
      // Voting Duration Setting
      case "votDurationMin":
        if (!/^([0-9]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else {
          const { votDurationMin, votDurationMax } = this.data.formData;
          this.setState({
            votDurationErr: util.checkNumberRange(
              "min",
              votDurationMin,
              votDurationMax,
            ),
          });
        }
        break;
      case "votDurationMax":
        if (!/^([0-9]*)$/.test(e.target.value)) {
          this.data.formData[e.target.name] = originStr;
        } else {
          const { votDurationMin, votDurationMax } = this.data.formData;
          this.setState({
            votDurationErr: util.checkNumberRange(
              "max",
              votDurationMin,
              votDurationMax,
            ),
          });
        }
        break;
      //Authority Member Staking Amount
      case "authMemSkAmountMin":
        if (!/^([0-9]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else {
          const { authMemSkAmountMin, authMemSkAmountMax } = this.data.formData;
          this.setState({
            authMemSkAmountErr:
              util.checkNumberRange(
                "min",
                authMemSkAmountMin,
                authMemSkAmountMax,
              ) ||
              util.checkMemberStakingAmount(
                authMemSkAmountMin,
                authMemSkAmountMax,
              ),
          });
        }
        break;
      case "authMemSkAmountMax":
        if (!/^([0-9]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else {
          const { authMemSkAmountMin, authMemSkAmountMax } = this.data.formData;
          this.setState({
            authMemSkAmountErr:
              util.checkNumberRange(
                "max",
                authMemSkAmountMin,
                authMemSkAmountMax,
              ) ||
              util.checkMemberStakingAmount(
                authMemSkAmountMin,
                authMemSkAmountMax,
              ),
          });
        }
        break;
      // Block Creation Time
      case "blockCreation":
        if (!/^([0-9.]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else
          this.setState({
            blockCreationErr: !util.checkBlockCreationTime(e.target.value),
          });
        break;
      // Block Reward Distribution Method
      case "blockRate1":
      case "blockRate2":
      case "blockRate3":
      case "blockRate4":
        if (!/^[0-9]*\.?([0-9]{1,2})?$/.test(e.target.value)) {
          this.data.formData[e.target.name] = originStr;
        } else {
          const { value, name } = e.target;
          const parsedValue = Number(value) || 0;
          this.setState((prevState) => {
            const updatedBlockRates = {
              ...prevState.blockRates,
              [name]: parsedValue,
            };
            // get total
            const newTotal = Object.values(updatedBlockRates).reduce(
              (p, c) => p + c,
            );
            return {
              blockRates: updatedBlockRates,
              blockRateTotal: newTotal,
              blockRewardDisMthErr: newTotal !== 100,
            };
          });
        }
        break;
      // Block Reward Amount
      case "blockRewardAmount":
        if (!/^([0-9.]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else
          this.setState({
            blockRewardAmountErr: !util.checkRewardAmount(e.target.value),
          });
        break;
      // maxPriorityFeePerGas
      case "maxPriorityFeePerGas":
        if (!/^([0-9]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else
          this.setState({
            maxPriorityFeePerGasErr: !util.checkPrice(e.target.value),
          });
        break;
      // Gas Limit & baseFee
      case "gasLimit":
        if (!/^([0-9]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else this.setState({ gasLimitErr: !util.checkPrice(e.target.value) });
        break;
      case "maxBaseFee":
        if (!/^([0-9]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else
          this.setState({
            maxBaseFeeErr: !util.checkPrice(e.target.value),
          });
        break;
      case "baseFeeMaxChangeRate":
        if (!/^([0-9]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else
          this.setState({
            baseFeeMaxChangeRateErr: !util.checkPrice(e.target.value),
          });
        break;
      case "gasTargetPercentage":
        if (!/^([0-9]*)$/.test(e.target.value))
          this.data.formData[e.target.name] = originStr;
        else
          this.setState({
            gasTargetPercentageErr: !util.checkPrice(e.target.value),
          });
        break;
      // Voting Address
      case "newVotingAddr":
        this.setState({ newVotingAddrErr: !util.checkAddress(e.target.value) });
        break;
      // Reward Address
      case "newRewardAddr":
        this.setState({ newRewardAddrErr: !util.checkAddress(e.target.value) });
        break;
      default:
        break;
    }
  };

  checkLockAmount(amount) {
    return (
      Number(amount) <= this.props.stakingMax &&
      Number(amount) >= this.props.stakingMin
    );
  }

  // check before sending transaction
  async handleProposalError(refineData) {
    if (
      !(await callContractMethod(
        web3Instance,
        "GovImp",
        "isMember",
        this.props.defaultAccount,
      )) &&
      !constants.debugMode
    ) {
      return this.props.getErrModal(
        "You are not Governance Member.",
        "Proposal Submit Error",
      );
    }
    const { selectedTopic } = this.state;
    switch (selectedTopic) {
      case "AddAuthorityMember": {
        const { staker, lockAmount } = refineData;
        const newLockedAmount = Number(lockAmount);
        // get the balance of staking address
        const balance = Number(
          await callContractMethod(
            web3Instance,
            "Staking",
            "availableBalanceOf",
            staker,
          ),
        );
        // check if addresses already exist
        const isMember = await callContractMethod(
          web3Instance,
          "GovImp",
          "isMember",
          staker,
        );
        if (isMember) {
          return this.props.getErrModal(
            "Existing Member Address.",
            "Proposal Submit Error",
          );
        }
        // check if addresses already voted
        const inBallotMember = this.props.newMemberaddr.some(
          (addr) => addr === staker,
        );
        if (inBallotMember) {
          return this.props.getErrModal(
            "Address with Existing Ballot.",
            "Proposal Submit Error",
          );
        }
        // check if staking address has wemix
        if (balance < newLockedAmount) {
          return this.props.getErrModal(
            "Not Enough WEMIX to Stake.",
            "Proposal Submit Error",
          );
        }
        return false;
      }
      case "ReplaceAuthorityMember": {
        const { oldStaker, staker, lockAmount } = refineData;
        const newLockedAmount = Number(lockAmount);
        // get the balance of old, new addresses
        const oldMemberBalance = await callContractMethod(
          web3Instance,
          "Staking",
          "lockedBalanceOf",
          oldStaker,
        );
        const newMemberBalance = Number(
          await callContractMethod(
            web3Instance,
            "Staking",
            "availableBalanceOf",
            staker,
          ),
        );
        // check if old address does not exist
        const isMemberOldAddr = await callContractMethod(
          web3Instance,
          "GovImp",
          "isMember",
          oldStaker,
        );
        if (!isMemberOldAddr) {
          return this.props.getErrModal(
            "Non-existing Member Address (Old).",
            "Proposal Submit Error",
          );
        }
        // check if new addresses already exist
        const isMemberNewAddr = await callContractMethod(
          web3Instance,
          "GovImp",
          "isMember",
          staker,
        );
        if (isMemberNewAddr) {
          return this.props.getErrModal(
            "Existing Member Address.",
            "Proposal Submit Error",
          );
        }
        // check if old address already voted
        const inBallotOldMember = this.props.oldMemberaddr.some(
          (addr) => addr === oldStaker,
        );
        if (inBallotOldMember) {
          return this.props.getErrModal(
            "Address with Existing Ballot (Old).",
            "Proposal Submit Error",
          );
        }
        // check if new address already voted
        const isBallotNewMember = this.props.newMemberaddr.some(
          (addr) => addr === staker,
        );
        if (isBallotNewMember) {
          return this.props.getErrModal(
            "Address with Existing Ballot (New).",
            "Proposal Submit Error",
          );
        }
        // check the balance of the old address is not same as lockAmount
        if (Number(oldMemberBalance) !== newLockedAmount) {
          return this.props.getErrModal(
            [
              "Invalid Replace WEMIX Amount",
              <br />,
              `(Old Address: ${util.convertWeiToEther(
                oldMemberBalance,
                "ether",
              )} WEMIX Locked)`,
            ],
            "Proposal Submit Error",
          );
        }
        // check if staking address has wemix
        if (newMemberBalance < newLockedAmount) {
          return this.props.getErrModal(
            "Not Enough WEMIX Stake (New)",
            "Proposal Submit Error",
          );
        }
        return false;
      }
      case "RemoveAuthorityMember": {
        const { staker, lockAmount } = refineData;
        const balance = await callContractMethod(
          web3Instance,
          "Staking",
          "lockedBalanceOf",
          staker,
        );
        const lockedAmount = Number(lockAmount);

        // check if addresses already exist
        const isMember = await callContractMethod(
          web3Instance,
          "GovImp",
          "isMember",
          staker,
        );
        if (!isMember) {
          return this.props.getErrModal(
            "Non-existing Member Address.",
            "Proposal Submit Error",
          );
        }
        // check if new address already voted
        const isBallotMember = this.props.newMemberaddr.some(
          (addr) => addr === staker,
        );
        if (isBallotMember) {
          return this.props.getErrModal(
            "Address with Existing Ballot.",
            "Proposal Submit Error",
          );
        }
        // check if the balance is small
        if (balance < lockedAmount) {
          return this.props.getErrModal(
            "Locked Amount must be less than or equal to Unlocked Amount.",
            "Proposal Submit Error",
          );
        }
        return false;
      }
      case "GovernanceContractAddress": {
        const { newGovAddr } = refineData;
        // check if address is contract code
        const code = await web3Instance.web3.eth.getCode(newGovAddr);
        if (code === "0x") {
          return this.props.getErrModal(
            "Address is not a Contract Address.",
            "Proposal Submit Error",
          );
        }
        return false;
      }
      default:
        return false;
    }
  }

  // check the data error handling
  async checkSubmitData(data) {
    const { selectedTopic } = this.state;
    const { memo, votDuration } = data;
    let checkData, refineData, trxFunction;

    try {
      switch (selectedTopic) {
        case "AddAuthorityMember": {
          const { newAddr, newName, newNode, newLockAmount } = data;
          // check undefined
          if (util.checkUndefined(newAddr)) {
            this.setState({ newAddrErr: !this.state.newAddrErr });
            this.props.convertLoading(false);
            return;
          }
          if (util.checkUndefined(newName)) {
            this.setState({ newNameErr: !this.state.newNameErr });
            this.props.convertLoading(false);
            return;
          }
          if (util.checkUndefined(newNode)) {
            this.setState({ newNodeErr: !this.state.newNodeErr });
            this.props.convertLoading(false);
            return;
          }
          // get node information
          const { node, ip, port } = util.splitNodeInfo(newNode);
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToAddMember",
              trx,
            );
          checkData = {
            staker: newAddr,
            voter: newAddr,
            reward: newAddr,
            name: newName,
            lockAmount: newLockAmount,
            enode: node,
            ip,
            port,
            memo,
            duration: votDuration,
          };
          break;
        }
        case "ReplaceAuthorityMember": {
          const { stakingAddr, newAddr, newName, newNode, newLockAmount } =
            data;
          // check undefined
          if (util.checkUndefined(stakingAddr)) {
            this.setState({ stakingAddrErr: !this.state.stakingAddrErr });
            this.props.convertLoading(false);
            return;
          }
          if (util.checkUndefined(newAddr)) {
            this.setState({ newAddrErr: !this.state.newAddrErr });
            this.props.convertLoading(false);
            return;
          }
          if (util.checkUndefined(newName)) {
            this.setState({ newNameErr: !this.state.newNameErr });
            this.props.convertLoading(false);
            return;
          }
          if (util.checkUndefined(newNode)) {
            this.setState({ newNodeErr: !this.state.newNodeErr });
            this.props.convertLoading(false);
            return;
          }
          // get node information
          const { node, ip, port } = util.splitNodeInfo(newNode);
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeMember",
              trx,
            );
          checkData = {
            staker: newAddr,
            voter: newAddr,
            reward: newAddr,
            name: newName,
            lockAmount: newLockAmount,
            enode: node,
            ip,
            port,
            memo,
            duration: votDuration,
            oldStaker: stakingAddr,
          };
          break;
        }
        case "RemoveAuthorityMember": {
          const { stakingAddr, oldLockAmount } = data;
          // check undefined
          if (util.checkUndefined(stakingAddr)) {
            this.setState({ stakingAddrErr: !this.state.stakingAddrErr });
            this.props.convertLoading(false);
            return;
          }
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToRemoveMember",
              trx,
            );
          checkData = {
            staker: stakingAddr,
            lockAmount: oldLockAmount,
            memo,
            duration: votDuration,
          };
          break;
        }
        case "GovernanceContractAddress": {
          const { newGovAddr } = data;
          // check undefined
          if (util.checkUndefined(newGovAddr)) {
            this.setState({ newGovAddrErr: !this.state.newGovAddrErr });
            this.props.convertLoading(false);
            return;
          }
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeGov",
              trx,
            );
          checkData = {
            newGovAddr,
            memo,
            duration: votDuration,
          };
          break;
        }
        case "VotingDurationSetting": {
          const { votDurationMin, votDurationMax } = data;
          // check undefined
          if (util.checkUndefined(votDurationMin)) {
            this.setState({ votDurationErr: !this.state.votDurationErr });
            this.props.convertLoading(false);
            return;
          }
          // setting env variables
          const envName = util.encodeStringToSha3(
            ENV_NAMES.ENV_BALLOT_DURATION_MIN_MAX,
          );
          const envVal = util.encodeParameters(
            ["uint256", "uint256"],
            [
              util.convertDayToSeconds(votDurationMin),
              util.convertDayToSeconds(votDurationMax),
            ],
          );
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeEnv",
              trx,
            );
          checkData = {
            envName,
            envType: String(3),
            envVal,
            memo,
            duration: votDuration,
          };
          break;
        }
        case "AuthorityMemberStakingAmount": {
          const { authMemSkAmountMin, authMemSkAmountMax } = data;
          // check undefined
          if (util.checkUndefined(authMemSkAmountMin)) {
            this.setState({
              authMemSkAmountErr: !this.state.authMemSkAmountErr,
            });
            this.props.convertLoading(false);
            return;
          }
          // setting env variables
          const envName = util.encodeStringToSha3(
            ENV_NAMES.ENV_STAKING_MIN_MAX,
          );
          const envVal = util.encodeParameters(
            ["uint256", "uint256"],
            [
              util.convertEtherToWei(authMemSkAmountMin),
              util.convertEtherToWei(authMemSkAmountMax),
            ],
          );
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeEnv",
              trx,
            );
          checkData = {
            envName,
            envType: String(3),
            envVal,
            memo,
            duration: votDuration,
          };
          break;
        }
        case "BlockCreationTime": {
          const { blockCreation } = data;
          // check undefined
          if (util.checkUndefined(blockCreation) || !Number(blockCreation)) {
            this.setState({
              blockCreationErr: !this.state.blockCreationErr,
            });
            this.props.convertLoading(false);
            return;
          }
          // setting env variables
          const envName = util.encodeStringToSha3(
            ENV_NAMES.ENV_BLOCK_CREATION_TIME,
          );
          // convert ms
          const envVal = util.encodeParameters(
            ["uint256"],
            [(blockCreation * 1000).toFixed(0)],
          );
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeEnv",
              trx,
            );
          checkData = {
            envName,
            envType: String(2),
            envVal,
            memo,
            duration: votDuration,
          };
          break;
        }
        case "BlockRewardAmount": {
          const { blockRewardAmount } = data;
          // check undefined
          if (util.checkUndefined(blockRewardAmount)) {
            this.setState({
              blockRewardAmountErr: !this.state.blockRewardAmountErr,
            });
            this.props.convertLoading(false);
            return;
          }
          // setting env variables
          const envName = util.encodeStringToSha3(
            ENV_NAMES.ENV_BLOCK_REWARD_AMOUNT,
          );
          const envVal = util.encodeParameters(
            ["uint256"],
            [util.convertEtherToWei(blockRewardAmount)],
          );
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeEnv",
              trx,
            );
          checkData = {
            envName,
            envType: String(2),
            envVal,
            memo,
            duration: votDuration,
          };
          break;
        }
        case "BlockRewardDistributionMethod": {
          const {
            blockRate1 = 0,
            blockRate2 = 0,
            blockRate3 = 0,
            blockRate4 = 0,
          } = data;
          // check undefined
          if (
            this.state.blockRateTotal !== 100 ||
            (!blockRate1 && !blockRate2 && !blockRate3 && !blockRate4)
          ) {
            this.setState({
              blockRewardDisMthErr: !this.state.blockRewardDisMthErr,
            });
            this.props.convertLoading(false);
            return;
          }
          // setting env variables
          const envName = util.encodeStringToSha3(
            ENV_NAMES.ENV_BLOCK_REWARD_DISTRIBUTION,
          );
          // remove decimals
          const envVal = util.encodeParameters(
            ["uint256", "uint256", "uint256", "uint256"],
            [
              (Number(blockRate1) * 100).toFixed(0),
              (Number(blockRate2) * 100).toFixed(0),
              (Number(blockRate3) * 100).toFixed(0),
              (Number(blockRate4) * 100).toFixed(0),
            ],
          );
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeEnv",
              trx,
            );
          checkData = {
            envName,
            envType: String(5),
            envVal,
            memo,
            duration: votDuration,
          };
          break;
        }
        case "MaxPriorityFeePerGas": {
          const { maxPriorityFeePerGas } = data;
          // check undefined
          if (
            util.checkUndefined(maxPriorityFeePerGas) ||
            !Number(maxPriorityFeePerGas)
          ) {
            this.setState({
              maxPriorityFeePerGasErr: !this.state.maxPriorityFeePerGasErr,
            });
            this.props.convertLoading(false);
            return;
          }
          // setting env variables
          const envName = util.encodeStringToSha3(
            ENV_NAMES.ENV_MAX_PRIORITY_FEE_PER_GAS,
          );
          const envVal = util.encodeParameters(
            ["uint256"],
            [util.convertGWeiToWei(maxPriorityFeePerGas)],
          );
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeEnv",
              trx,
            );
          checkData = {
            envName,
            envType: String(2),
            envVal,
            memo,
            duration: votDuration,
          };
          break;
        }
        case "GasLimitBaseFee": {
          const {
            gasLimit,
            maxBaseFee,
            baseFeeMaxChangeRate,
            gasTargetPercentage,
          } = data;
          // check undefined
          if (util.checkUndefined(gasLimit)) {
            this.setState({
              gasLimitErr: !this.state.gasLimitErr,
            });
            this.props.convertLoading(false);
            return;
          }
          if (util.checkUndefined(maxBaseFee)) {
            this.setState({
              maxBaseFeeErr: !this.state.maxBaseFeeErr,
            });
            this.props.convertLoading(false);
            return;
          }
          if (util.checkUndefined(baseFeeMaxChangeRate)) {
            this.setState({
              baseFeeMaxChangeRateErr: !this.state.baseFeeMaxChangeRateErr,
            });
            this.props.convertLoading(false);
            return;
          }
          if (util.checkUndefined(gasTargetPercentage)) {
            this.setState({
              gasTargetPercentageErr: !this.state.gasTargetPercentageErr,
            });
            this.props.convertLoading(false);
            return;
          }
          // setting env variables
          const envName = util.encodeStringToSha3(
            ENV_NAMES.ENV_GASLIMIT_AND_BASE_FEE,
          );
          const envVal = util.encodeParameters(
            ["uint256", "uint256", "uint256", "uint256"],
            [
              util.convertGWeiToWei(gasLimit),
              maxBaseFee,
              baseFeeMaxChangeRate,
              gasTargetPercentage,
            ],
          );
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeEnv",
              trx,
            );
          checkData = {
            envName,
            envType: String(5),
            envVal,
            memo,
            duration: votDuration,
          };
          break;
        }
        case "VotingAddress": {
          const { staker, name, lockAmount, enode, ip, port, newVotingAddr } =
            data;
          const { oldVotingAddr, oldRewardAddr } = this.props;
          // check undefined
          if (util.checkUndefined(newVotingAddr)) {
            this.setState({
              newVotingAddrErr: !this.state.newVotingAddrErr,
            });
            this.props.convertLoading(false);
            return;
          }
          if (oldVotingAddr === newVotingAddr) {
            this.setState({
              newVotingAddrErr: !this.state.newVotingAddrErr,
            });
            this.props.convertLoading(false);
            return;
          }
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeMember",
              trx,
            );
          checkData = {
            staker,
            voter: newVotingAddr,
            reward: oldRewardAddr,
            name,
            lockAmount,
            enode,
            ip,
            port,
            memo,
            oldStaker: staker,
          };
          break;
        }
        case "RewardAddress": {
          const { staker, name, lockAmount, enode, ip, port, newRewardAddr } =
            data;
          const { oldVotingAddr, oldRewardAddr } = this.props;
          // check undefined
          if (util.checkUndefined(newRewardAddr)) {
            this.setState({
              newRewardAddrErr: !this.state.newRewardAddrErr,
            });
            this.props.convertLoading(false);
            return;
          }
          if (oldRewardAddr === newRewardAddr) {
            this.setState({
              newRewardAddrErr: !this.state.newRewardAddrErr,
            });
            this.props.convertLoading(false);
            return;
          }
          trxFunction = (trx) =>
            encodeABIValueInMethod(
              web3Instance,
              "GovImp",
              "addProposalToChangeMember",
              trx,
            );
          checkData = {
            staker,
            voter: oldVotingAddr,
            reward: newRewardAddr,
            name,
            lockAmount,
            enode,
            ip,
            port,
            memo,
            oldStaker: staker,
          };
          break;
        }
        default:
          return;
      }
      // sets the default value of memo, votDuration
      checkData = {
        ...checkData,
        memo: checkData.memo || "",
        duration:
          util.convertDayToSeconds(checkData.duration) ||
          this.props.votingDurationMin,
      };
      // override data for formatting
      refineData = util.refineSubmitData(checkData);
      if (typeof (await this.handleProposalError(refineData)) === "undefined") {
        this.props.convertLoading(false);
        return;
      }
      return trxFunction(refineData);
    } catch (err) {
      console.log(err);
      this.props.getErrModal(err.message, err.name);
      this.props.convertLoading(false);
    }
  }

  // submit form data
  handleSubmit = async (e) => {
    e.preventDefault();
    this.props.convertLoading(true);
    try {
      const trx = await this.checkSubmitData(this.data.formData);
      // run only if there is data for sending transactions
      if (trx !== undefined) {
        this.sendTransaction(trx);
      }
    } catch (err) {
      console.log(err);
      this.props.getErrModal(err.message, err.name);
      this.props.convertLoading(false);
    }
  };

  // send transaction
  async sendTransaction(trx) {
    try {
      web3Instance.web3.eth.sendTransaction(
        {
          from: this.props.defaultAccount,
          to: trx.to,
          data: trx.data,
          gasPrice: 101000000000,
          // maxFeePerGas: 101000000000,
          // maxPriorityFeePerGas: 100000000000,
        },
        (err, hash) => {
          if (err) {
            this.props.getErrModal(err.message, "Proposal Submit Error");
            this.props.convertLoading(false);
          } else {
            // console.log('hash:', hash)
            this.props.waitForReceipt(hash, async (receipt) => {
              // console.log("Updated :", receipt);
              if (receipt.status) {
                if (this.props.selectedMenu === "menu-myinfo") {
                  window.location.reload();
                } else {
                  await this.props.convertComponent("voting");
                  this.props.convertLoading(false);
                }
              } else {
                this.props.getErrModal(
                  "The transaction could not be sent normally.",
                  "Proposal Submit Error",
                  receipt.transactionHash,
                );
                this.props.convertLoading(false);
              }
            });
          }
        },
      );
    } catch (err) {
      console.log(err);
      this.props.getErrModal(err.message, err.name);
      this.props.convertLoading(false);
    }
  }

  // get information for send transaction (Myinfo)
  async getMyInfo() {
    try {
      const { defaultAccount, memberIdx } = this.props;
      const { name, enode, ip, port } = await callContractMethod(
        web3Instance,
        "GovImp",
        "getNode",
        memberIdx,
      );
      const lockAmount = await callContractMethod(
        web3Instance,
        "Staking",
        "lockedBalanceOf",
        defaultAccount,
      );
      this.data.formData = {
        staker: defaultAccount,
        name: util.decodeHexToString(name),
        enode,
        ip,
        port,
        lockAmount: util.convertWeiToEther(lockAmount),
        oldStaker: defaultAccount,
      };
    } catch (err) {
      console.log(err);
      this.props.getErrModal(err.message, err.name);
      this.props.convertLoading(false);
    }
  }

  // show components that follow selected topic
  showProposalForm() {
    const { selectedTopic } = this.state;
    const TopicComponent = (topic) => {
      switch (topic) {
        case "AddAuthorityMember":
          return (
            <PComponent.AddProposalForm
              newAddrErr={this.state.newAddrErr}
              newLockAmountErr={this.state.newLockAmountErr}
              newLockAmount={this.data.formData.newLockAmount}
              newNodeErr={this.state.newNodeErr}
              newNameErr={this.state.newNameErr}
            />
          );
        case "ReplaceAuthorityMember":
          return (
            <PComponent.ReplaceProposalForm
              stakingAddrErr={this.state.stakingAddrErr}
              newAddrErr={this.state.newAddrErr}
              newNameErr={this.state.newNameErr}
              stakingMin={this.props.stakingMin}
              newLockAmount={this.data.formData.newLockAmount}
              newLockAmountErr={this.state.newLockAmountErr}
              newNodeErr={this.state.newNodeErr}
            />
          );
        case "RemoveAuthorityMember":
          return (
            <PComponent.RemoveProposalForm
              stakingAddrErr={this.state.stakingAddrErr}
              showLockAmount={this.state.showLockAmount}
              stakingMin={this.props.stakingMin}
              oldLockAmount={this.data.formData.oldLockAmount}
              oldLockAmountErr={this.state.oldLockAmountErr}
              getLockAmount={this.getLockAmount}
            />
          );
        case "GovernanceContractAddress":
          return (
            <PComponent.GovernanceContractAddressForm
              newGovAddrErr={this.state.newGovAddrErr}
            />
          );
        case "VotingDurationSetting":
          return (
            <PComponent.VotingDurationSettingForm
              votDurationErr={this.state.votDurationErr}
              votDurationMin={this.data.formData.votDurationMin}
              votDurationMax={this.data.formData.votDurationMax}
            />
          );
        case "AuthorityMemberStakingAmount":
          return (
            <PComponent.AuthorityMemberStakingAmountForm
              authMemSkAmountErr={this.state.authMemSkAmountErr}
              authMemSkAmountMin={this.data.formData.authMemSkAmountMin}
              authMemSkAmountMax={this.data.formData.authMemSkAmountMax}
            />
          );
        case "BlockCreationTime":
          return (
            <PComponent.BlockCreationTime
              blockCreation={this.data.formData.blockCreation}
              blockCreationErr={this.state.blockCreationErr}
            />
          );
        case "BlockRewardAmount":
          return (
            <PComponent.BlockRewardAmount
              blockRewardAmount={this.data.formData.blockRewardAmount}
              blockRewardAmountErr={this.state.blockRewardAmountErr}
            />
          );
        case "BlockRewardDistributionMethod":
          return (
            <PComponent.BlockRewardDistributionMethod
              blockRate1={this.data.formData.blockRate1}
              blockRate2={this.data.formData.blockRate2}
              blockRate3={this.data.formData.blockRate3}
              blockRate4={this.data.formData.blockRate4}
              blockRateTotal={this.state.blockRateTotal}
              blockRewardDisMthErr={this.state.blockRewardDisMthErr}
            />
          );
        case "MaxPriorityFeePerGas":
          return (
            <PComponent.MaxPriorityFeePerGasForm
              maxPriorityFeePerGas={this.data.formData.maxPriorityFeePerGas}
              maxPriorityFeePerGasErr={this.state.maxPriorityFeePerGasErr}
            />
          );
        case "GasLimitBaseFee":
          return (
            <PComponent.GasLimitBaseFeeForm
              gasLimit={this.data.formData.gasLimit}
              gasLimitErr={this.state.gasLimitErr}
              maxBaseFee={this.data.formData.maxBaseFee}
              maxBaseFeeErr={this.state.maxBaseFeeErr}
              baseFeeMaxChangeRate={this.data.formData.baseFeeMaxChangeRate}
              baseFeeMaxChangeRateErr={this.state.baseFeeMaxChangeRateErr}
              gasTargetPercentage={this.data.formData.gasTargetPercentage}
              gasTargetPercentageErr={this.state.gasTargetPercentageErr}
            />
          );
        case "VotingAddress":
          return (
            <MComponent.VotingAddress
              oldVotingAddr={this.props.oldVotingAddr}
              newVotingAddrErr={this.state.newVotingAddrErr}
            />
          );
        case "RewardAddress":
          return (
            <MComponent.RewardAddress
              oldRewardAddr={this.props.oldRewardAddr}
              newRewardAddrErr={this.state.newRewardAddrErr}
            />
          );
        default:
          return <></>;
      }
    };
    return (
      /* component for only common props pass */
      <PComponent.PassesCommonProps
        netName={web3Instance.netName}
        loading={this.props.loading}
        handleSubmit={this.handleSubmit}
        handleChange={this.handleChange}
        votingDurationMax={this.props.votingDurationMax}
        votingDurationMin={this.props.votingDurationMin}
      >
        {/* component of selected topic */}
        {TopicComponent(selectedTopic)}
      </PComponent.PassesCommonProps>
    );
  }

  render() {
    const { convertComponent, buttonLoading, selectedMenu } = this.props;
    const { selectedTopic } = this.state;
    const options =
      selectedMenu === "menu-myinfo"
        ? ENV_MY_INFO_PROPOSAL_LIST
        : ENV_VOTING_PROPOSAL_LIST;
    return (
      <div>
        <div className="contentDiv container">
          <div className="backBtnDiv">
            {selectedMenu === "menu-myinfo" ? null : (
              <Button
                className={
                  "btn-fill-white flex flex-center-horizontal text-large " +
                  web3Instance.netName
                }
                onClick={() => convertComponent("voting")}
                loading={buttonLoading}
              >
                <span>
                  <Icon type="left" />
                </span>
                <span className="text_btn">Back to Voting</span>
              </Button>
            )}
          </div>
          <div className="contentVotingDiv">
            <div className="proposalHead">
              <div className="title flex">
                <p className="flex-full text-heavy">
                  {selectedMenu === "menu-myinfo" ? "MyInfo" : "New Proposal"}
                </p>
                <p>* Mandatory</p>
              </div>
              {selectedMenu === "menu-myinfo" && (
                <>
                  <div className="flex-full flex-column text-container">
                    <span>Voting Address: {this.props.oldVotingAddr}</span>
                    <span>Reward Address: {this.props.oldRewardAddr}</span>
                  </div>
                </>
              )}
              <p className="subtitle">
                {selectedMenu === "menu-myinfo" ? (
                  "Replace List"
                ) : (
                  <>
                    Topic for voting <span className="required">*</span>
                  </>
                )}
              </p>
              <Select
                showArrow
                value={this.data.selectedTopic}
                filterOption={false}
                onChange={this.handleSelectTopicChange}
                disabled={buttonLoading}
              >
                {options.map((item, i) => (
                  <Select.Option value={item.value} key={i}>
                    {item.id}
                  </Select.Option>
                ))}
              </Select>
            </div>
            {selectedTopic !== "" && <div>{this.showProposalForm()}</div>}
          </div>
          {/* reference memo */}
          {selectedMenu === "menu-myinfo" ? null : (
            <div className="contentRefDiv">
              <p>[Reference]</p>
              <ol>
                <li>
                  Even within the voting duration, if more than 50% of opinions
                  are expressed for or against, voting ends and follow-up work
                  is carried out.
                </li>
                <li>
                  Basically, only one voting is conducted at a time, so if there
                  is already voting in progress, you cannot start a new voting.
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export { ProposalForm };
