import { constants } from 'meta-web3'

//constants.organization = 'METADIUM'
//constants.repoName = 'governance-spec'

constants.authorityRepo = {
  org: 'blueisle',
  repo: 'meta-authorities',
  branch: 'testnet',
  source: 'authorities.json'
}

constants.NET_ID = '11'
constants.branchName = 'mainnet'

/**
 * BallotEnums
 */
constants.ballotState = {
  Invalid: '0',
  Ready: '1',
  InProgress: '2',
  Accepted: '3',
  Rejected: '4',
  Canceled: '5'
}

constants.ballotTypes = {
  Invalid: '0',
  MemverAdd: '1',
  MemberRemoval: '2',
  MemberChange: '3',
  GovernanceChange: '4',
  EnvValChange: '5'
}

constants.ballotStateArr = ['Invalid', 'Ready', 'InProgress', 'Accepted', 'Rejected', 'Canceled']
constants.ballotTypesArr = ['Invalid', 'MemberAdd', 'MemberRemoval', 'MemberChange', 'GovernanceChange', 'EnvValChange']

export { constants }
