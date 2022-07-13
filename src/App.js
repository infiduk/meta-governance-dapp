import React from "react";
import { Layout } from "antd";

import {
  TopNav,
  FootNav,
  StakingModal,
  ErrModal,
  AccessFailedModal,
  Voting,
  Authority,
  BaseLoader,
} from "./components";
import getWeb3Instance, {
  callContractMethod,
  chainInfo,
  encodeABIValueInMethod,
  encodeABIValueInTrx,
  getAccounts,
  onlyCallContractMethod,
  web3Instance,
} from "./web3";
import { constants, ENV_VOTING_PROPOSAL_LIST } from "./constants";
import * as util from "./util";

import AuthorityList from "./static/AuthorityList.json";

import "./App.css";
import "./components/style/style.css";
import WalletPage from "./components/WalletPage";
import { getWeb3Modal } from "./web3Modal";

const { Header, Content, Footer } = Layout;

class App extends React.Component {
  data = {
    myBalance: 0,
    myLockedBalance: 0,
    stakingTopic: "deposit",
    stakingAmount: "",
    stakingMax: null,
    stakingMin: null,
    eventsWatch: null,
    ballotMemberOriginData: {},
    ballotBasicOriginData: {},
    voteLength: 0,
    authorityOriginData: [],
    errTitle: null,
    errContent: null,
    errLink: null,
    errAccessFail: null,
    isMember: false,
    // for getting ballot data
    ballotTypeData: [],
    // voting duration
    votingDurationMin: null,
    votingDurationMax: null,
    redirectNav: "1",
    nowWalletType: null,
  };

  state = {
    loadWeb3: false,
    accessFailMsg: null,
    nav: "1",
    contractReady: false,
    stakingModalVisible: false,
    errModalVisible: false,
    errStakging: false,
    loading: false,
    activeMenu: "Authority",
    // true - voting / false - authority
    showProposal: false,
    isLogin: false,
    defaultAccount: null,
  };

  constructor(props) {
    super(props);
    this.getContractAuthorityBallots =
      this.getContractAuthorityBallots.bind(this);
    this.refreshContractData = this.refreshContractData.bind(this);

    // get web3Modal instance
    getWeb3Modal();
    // get web3 instance
    getWeb3Instance().then(
      async () => {
        // get governance variables
        await this.getGovernanceVariables();
        // get authority list and ballot data
        await this.getContractAuthorityBallots();
        console.log("debugMode: ", constants.debugMode);
        this.setState({ loadWeb3: true });
      },
      async (error) => {
        console.log("getWeb3 error: ", error);
        this.setState({ loadWeb3: false, accessFailMsg: error.message });
      }
    );
  }

  // componentDidMount() {
  //   // detect when the MetaMask account is changed
  //   window.ethereum.on("accountsChanged", async (chagedAccounts) => {
  //     // disconnect MetaMask
  //     if (util.checkUndefined(chagedAccounts[0])) {
  //       console.error("MetaMask connection is broken!");
  //       window.location.reload();
  //       return;
  //     }
  //     await this.updateDefaultAccount(chagedAccounts[0]);
  //   });

  //   // detect when the MetaMask network is changed
  //   window.ethereum.on("chainChanged", () => window.location.reload());
  // }

  onLogin = async (walletType) => {
    this.data.nowWalletType = walletType;
    const account = await getAccounts(walletType);
    this.updateAccountData(account);

    this.setState({
      isLogin: true,
      nav: this.data.redirectNav,
      defaultAccount: account,
    });
  };
  onLogout = () => {
    web3Instance.web3.setProvider(chainInfo.rpcUrls);

    this.setState({
      isLogin: false,
      nav: "1",
      showProposal: false,
      defaultAccount: null,
    });
  };
  connectWallet = () => {
    if (this.state.nav !== "0") {
      this.data.redirectNav = this.state.nav; // save redirect page
      this.onMenuClick({ key: "0" }); // route connect wallet page
    }
  };

  // update data related to new account
  async updateAccountData(newAccount) {
    await this.updateAccountBalance(newAccount);
    this.setStakingEventsWatch(newAccount);
    this.data.isMember = await callContractMethod(
      web3Instance,
      "GovImp",
      "isMember",
      newAccount
    );
  }

  // get governance setting variables from contract data
  async getGovernanceVariables() {
    await this.getStakingRange();
    await this.getVotingDuration();
    // TODO
    // await this.updateAccountBalance();

    // TODO
    // this.setStakingEventsWatch();
    // check if account is a proposalable member
    // this.data.isMember = await callContractMethod(
    //   web3Instance,
    //   "GovImp",
    //   "isMember",
    //   this.state.defaultAccount
    // );
    this.setState({ contractReady: true });
  }

  // set the balance of account
  async updateAccountBalance(defaultAccount = this.state.defaultAccount) {
    this.data.myBalance = await callContractMethod(
      web3Instance,
      "Staking",
      "balanceOf",
      defaultAccount
    );
    this.data.myLockedBalance = await callContractMethod(
      web3Instance,
      "Staking",
      "lockedBalanceOf",
      defaultAccount
    );
    this.data.myBalance = util.convertWeiToEther(this.data.myBalance);
    this.data.myLockedBalance = util.convertWeiToEther(
      this.data.myLockedBalance
    );

    this.setState({ stakingModalVisible: false, loading: false });
  }

  // set the default account to MetaMask account
  // async updateDefaultAccount(account) {
  //   if (this.state.defaultAccount.toLowerCase() !== account.toLowerCase()) {
  //     this.state.defaultAccount = account;
  //     await this.updateAccountBalance();
  //     this.setStakingEventsWatch();
  //     this.data.isMember = await callContractMethod(web3Instance, "GovImp", "isMember", this.state.defaultAccount)
  //     this.setState({ showProposal: false });
  //   }
  // }

  async setStakingEventsWatch(defaultAccount = this.state.defaultAccount) {
    const { web3, web3Contracts } = web3Instance;

    if (this.data.eventsWatch) {
      this.data.eventsWatch.unsubscribe((error, success) => {
        if (error) console.log("Faild to unsubscribed!");
        // else if (success) console.log('Successfully unsubscribed!')
      });
    }
    var filteraddress = web3.eth.abi.encodeParameter("address", defaultAccount);
    this.data.eventsWatch = web3Contracts.Staking.events.allEvents(
      {
        fromBlock: "latest",
        topics: [null, filteraddress],
      },
      (error, events) => {
        // console.log(events)
        if (error) console.log("error", error);
        else this.updateAccountBalance();
      }
    );
  }

  // get the minimum and maximum values that can be staked
  async getStakingRange() {
    try {
      this.data.stakingMin = util.convertWeiToEther(
        await onlyCallContractMethod(
          web3Instance,
          "EnvStorageImp",
          "getStakingMin"
        )
      );
      this.data.stakingMax = util.convertWeiToEther(
        await onlyCallContractMethod(
          web3Instance,
          "EnvStorageImp",
          "getStakingMax"
        )
      );
    } catch (err) {
      this.getErrModal(err.message, err.name);
    }
  }

  // get voting duration minium and maximum values
  async getVotingDuration() {
    const duration = await onlyCallContractMethod(
      web3Instance,
      "EnvStorageImp",
      "getBallotDurationMinMax"
    );
    this.data.votingDurationMin = duration[0];
    this.data.votingDurationMax = duration[1];
  }

  async getContractAuthorityBallots() {
    await this.getAuthorityData();
    await this.initBallotData();
    util.setUpdatedTimeToLocal(new Date());
  }

  async refreshContractData(forced = false) {
    const updatedTime = forced ? 0 : util.getUpdatedTimeFromLocal.value;
    if (updatedTime + constants.expirationTime > Date.now()) return;
    Promise.all([
      await this.getAuthorityData(),
      await this.getBallotData(),
      await this.modifyBallotData(),
    ]).then(() => util.setUpdatedTimeToLocal(new Date()));
  }

  // get the authority list stored in localStorage if modified block height is equal
  // or initalize new authority list
  async getAuthorityData() {
    const modifiedBlock = await onlyCallContractMethod(
      web3Instance,
      "GovImp",
      "modifiedBlock"
    );
    // if (
    //   modifiedBlock === util.getModifiedFromLocal() &&
    //   util.getAuthorityFromLocal()
    // ) {
    //   this.data.authorityOriginData = util.getAuthorityFromLocal();
    //   return;
    // }
    await this.initAuthorityData();
    util.setModifiedToLocal(modifiedBlock);
  }

  async getBallotData() {
    const ballotCnt = await onlyCallContractMethod(
      web3Instance,
      "GovImp",
      "ballotLength"
    );
    let localBallotCnt = Object.keys(this.data.ballotBasicOriginData).length;
    if (!ballotCnt || ballotCnt === localBallotCnt) return;

    for (localBallotCnt += 1; localBallotCnt <= ballotCnt; localBallotCnt++) {
      await this.getBallotBasicOriginData(localBallotCnt);
      await this.getBallotMemberOriginData(localBallotCnt);
    }
  }

  async modifyBallotData() {
    let voteLength = await onlyCallContractMethod(
      web3Instance,
      "GovImp",
      "voteLength"
    );
    if (!voteLength || voteLength === this.data.voteLength) return;

    for (
      this.data.voteLength;
      this.data.voteLength <= voteLength;
      this.data.voteLength++
    ) {
      const ballotId = (
        await callContractMethod(
          web3Instance,
          "BallotStorage",
          "getVote",
          this.data.voteLength
        )
      ).ballotId;
      await this.getBallotBasicOriginData(ballotId);
      await this.getBallotMemberOriginData(ballotId);
    }
    this.data.voteLength -= 1;
  }

  // get a static list for network status from github repository
  async initAuthorityData() {
    const authorityList = AuthorityList[process.env.NODE_ENV] || [];
    this.data.authorityOriginData = await this.refineAuthority(authorityList);
    util.setAuthorityToLocal(this.data.authorityOriginData);
  }

  // to make sure that the authority is included
  async refineAuthority(authorityList) {
    let memberAuthority = {};
    let index = 0;
    for (let i = 0; i < Object.keys(authorityList).length; i++) {
      if (
        await callContractMethod(
          web3Instance,
          "GovImp",
          "isMember",
          authorityList[i].addr
        )
      ) {
        memberAuthority[index] = authorityList[i];
        memberAuthority[index].addr = web3Instance.web3.utils.toChecksumAddress(
          memberAuthority[index].addr
        );
        index++;
      }
    }
    return memberAuthority;
  }

  // get the ballot list stored in localStorage
  // or initalize new ballot list
  async initBallotData() {
    let ballotBasicFinalizedData = util.getBallotBasicFromLocal()
      ? util.getBallotBasicFromLocal()
      : {};
    let ballotMemberFinalizedData = util.getBallotMemberFromLocal()
      ? util.getBallotMemberFromLocal()
      : {};
    let localDataUpdated = false;

    this.data.voteLength = await onlyCallContractMethod(
      web3Instance,
      "Gov",
      "voteLength"
    );
    const ballotCnt = await onlyCallContractMethod(
      web3Instance,
      "Gov",
      "ballotLength"
    );
    if (!ballotCnt) return;
    for (var i = 1; i <= ballotCnt; i++) {
      if (i in ballotBasicFinalizedData) {
        this.data.ballotBasicOriginData[i] = ballotBasicFinalizedData[i];
        this.data.ballotMemberOriginData[i] = ballotMemberFinalizedData[i];
      } else {
        let isUpdated = await this.getBallotBasicOriginData(
          i,
          ballotBasicFinalizedData
        );
        await this.getBallotMemberOriginData(
          i,
          isUpdated,
          ballotMemberFinalizedData
        );
        if (isUpdated) localDataUpdated = true;
      }
    }

    if (localDataUpdated) {
      util.setBallotBasicToLocal(ballotBasicFinalizedData);
      util.setBallotMemberToLocal(ballotMemberFinalizedData);
    }
  }

  async getBallotBasicOriginData(i, ballotBasicFinalizedData = {}) {
    let isUpdated = false;
    await callContractMethod(
      web3Instance,
      "BallotStorage",
      "getBallotBasic",
      i
    ).then((ret) => {
      this.data.ballotTypeData[i] = ret.ballotType; // for sorting ballot data
      ret.id = i; // add ballot id

      util.refineBallotBasic(ret);
      this.data.ballotBasicOriginData[i] = ret;

      if (
        ret.state === constants.ballotState.Accepted ||
        ret.state === constants.ballotState.Rejected
      ) {
        ballotBasicFinalizedData[i] = ret;
        isUpdated = true;
      }
    });
    return { isUpdated };
  }

  // match the ballot item with the ballot data
  async getBallotMemberOriginData(
    i,
    isUpdated = false,
    ballotMemberFinalizedData
  ) {
    const ballotType = this.data.ballotTypeData[i];
    let result = null;

    switch (ballotType) {
      case "4":
        result = {
          oldGovernanceAddress: await onlyCallContractMethod(
            web3Instance,
            "Gov",
            "implementation"
          ),
          newGovernanceAddress: await callContractMethod(
            web3Instance,
            "BallotStorage",
            "getBallotAddress",
            i
          ),
        };
        break;
      case "5": {
        result = await callContractMethod(
          web3Instance,
          "BallotStorage",
          "getBallotVariable",
          i
        );

        const type = ENV_VOTING_PROPOSAL_LIST.filter((key) => {
          return key.sha3Name === result.envVariableName;
        })[0] || { id: "Wrong Proposal (This label is only test)" };
        result.envVariableName = type.id;
        break;
      }
      case "1":
      default:
        result = await callContractMethod(
          web3Instance,
          "BallotStorage",
          "getBallotMember",
          i
        );
        break;
    }

    if (typeof result === "object") {
      // delete duplicate key values that web3 returns
      for (let key in result) {
        if (!isNaN(key)) delete result[key];
      }
    }
    result.id = i; // add ballot id
    this.data.ballotMemberOriginData[i] = result;
    if (isUpdated) ballotMemberFinalizedData[i] = result;
  }

  // called when tabnav menu clicked
  onMenuClick = ({ key }) => {
    // to return to the voting menu when proposing
    if (this.state.showProposal && key === "2") {
      this.convertVotingComponent("voting");
    }
    this.setState({ nav: key });
  };

  onClickFootIcon = (e) => {
    switch (e.target.alt) {
      case "wemix":
        window.open("https://www.wemix.com/", "_blank");
        break;
      case "explorer":
        window.open(
          `https://microscope.${
            process.env.NODE_ENV === "production" ? "" : "test."
          }wemix.com`,
          "_blank"
        );
        break;

      case "github":
        window.open("https://github.com/wemixarchive", "_blank");
        break;
      default:
    }
  };

  getContent() {
    if (!this.state.loadWeb3) return;
    this.refreshContractData();

    const { nav } = this.state;
    switch (nav) {
      case "0":
        return <WalletPage onLogin={this.onLogin} />;
      case "1":
        return (
          <Authority
            title="Authority"
            getErrModal={this.getErrModal}
            authorityOriginData={this.data.authorityOriginData}
            netName={web3Instance.netName}
            selectedMenu={nav}
          />
        );
      case "2":
      case "3":
        return (
          <Voting
            title="Voting"
            getErrModal={this.getErrModal}
            getContractAuthorityBallots={this.getContractAuthorityBallots}
            refreshContractData={this.refreshContractData}
            authorityOriginData={this.data.authorityOriginData}
            ballotMemberOriginData={this.data.ballotMemberOriginData}
            ballotBasicOriginData={this.data.ballotBasicOriginData}
            convertVotingComponent={this.convertVotingComponent}
            loading={this.state.loading}
            convertLoading={this.convertLoading}
            showProposal={nav === "3" ? true : this.state.showProposal}
            isMember={this.data.isMember}
            stakingMax={this.data.stakingMax}
            stakingMin={this.data.stakingMin}
            votingDurationMax={this.data.votingDurationMax}
            votingDurationMin={this.data.votingDurationMin}
            selectedMenu={nav}
          />
        );
      default:
    }
    this.setState({ selectedMenu: true });
  }

  // called when New Proposal button is clicked in Voting Menu
  convertVotingComponent = (component) => {
    if (component === "proposal") this.setState({ showProposal: true });
    else this.setState({ showProposal: false });
  };

  convertLoading = (state) => {
    if (typeof state === "boolean") {
      this.setState({ loading: state });
    }
  };

  getErrModal = (
    _err = "Unknown Error",
    _title = "Unknown Error",
    _link = false
  ) => {
    if (_err.includes("error:")) _err = _err.split("error:")[1];

    this.data.errTitle = _title;
    this.data.errContent = _err;
    if (_link)
      this.data.errLink = `https://microscope.${
        process.env.NODE_ENV === "production" ? "" : "test."
      }wemix.com/${_link}`;
    else this.data.errLink = false;
    this.setState({ errModalVisible: true });
  };

  getStakingModal = () => {
    this.data.stakingAmount = "";
    this.data.stakingTopic = "deposit";
    this.setState({ stakingModalVisible: true });
  };

  submitWemixStaking = () => {
    this.setState({ loading: true });
    if (!/^[1-9]\d*$/.test(this.data.stakingAmount)) {
      this.setState({ errStakging: true });
      return;
    }

    let trx = {};
    const amount = util.convertEtherToWei(this.data.stakingAmount);

    if (this.data.stakingTopic === "deposit") {
      trx = encodeABIValueInTrx(web3Instance, "Staking", "deposit", amount);
    } else {
      trx = encodeABIValueInMethod(web3Instance, "Staking", "withdraw", amount);
    }
    this.sendStakingTransaction(trx);
  };

  sendStakingTransaction(trx) {
    trx.from = this.state.defaultAccount;
    web3Instance.web3.eth.sendTransaction(trx, async (err, hash) => {
      if (err) {
        console.log(err);
        this.getErrModal(err.message, "Staking Error");
      } else {
        console.log("hash: ", hash);
      }
      this.setState({ stakingModalVisible: false, loading: false });
    });
  }

  handleSelectChange = (topic) => {
    this.data.stakingTopic = topic;
    this.setState({});
  };

  handleInputChange = (event) => {
    let value = event.target.value;
    if (/^([0-9]*)$/.test(value)) {
      this.data.stakingAmount = value;
      this.setState({ errStakging: false });
    }
  };

  render() {
    return (
      <Layout className="layout">
        <AccessFailedModal
          visible={!!this.state.accessFailMsg}
          message={this.state.accessFailMsg}
        />

        {this.state.contractReady && this.state.loadWeb3 ? (
          <div className="flex-column">
            <Header className={web3Instance.netName}>
              <TopNav
                netName={web3Instance.netName}
                nav={this.state.nav}
                myBalance={this.data.myBalance}
                myLockedBalance={this.data.myLockedBalance}
                isMember={this.data.isMember}
                onMenuClick={this.onMenuClick}
                getStakingModal={this.getStakingModal}
                isLogin={this.state.isLogin}
                onLogout={this.onLogout}
                connectWallet={this.connectWallet}
              />
            </Header>

            <StakingModal
              netName={web3Instance.netName}
              accountBalance={{
                balance: this.data.myBalance,
                lockedBalance: this.data.myLockedBalance,
              }}
              stakingModalVisible={this.state.stakingModalVisible}
              loading={this.state.loading}
              stakingAmount={this.data.stakingAmount}
              errStakging={this.state.errStakging}
              stakingTopic={this.data.stakingTopic}
              hideStakingModal={() => {
                if (!this.state.loading)
                  this.setState({ stakingModalVisible: false });
              }}
              submitWemixStaking={this.submitWemixStaking}
              handleInputChange={this.handleInputChange}
              handleSelectChange={this.handleSelectChange}
            />

            <ErrModal
              netName={web3Instance.netName}
              title={this.data.errTitle}
              err={this.data.errContent}
              link={this.data.errLink}
              visible={this.state.errModalVisible}
              coloseErrModal={() =>
                this.setState({ errModalVisible: !this.state.loadWeb3 })
              }
            />

            <Content>
              {this.state.loadWeb3 ? (
                <div> {this.getContent()} </div>
              ) : (
                this.getErrModal(
                  "This is an unknown network. Please connect to WEMIX network",
                  "Connecting Error"
                )
              )}
            </Content>

            <Footer>
              <FootNav
                netName={web3Instance.netName}
                onClickFootIcon={this.onClickFootIcon}
              />
            </Footer>
          </div>
        ) : (
          <div>
            <BaseLoader />
          </div>
        )}
      </Layout>
    );
  }
}

export default App;
