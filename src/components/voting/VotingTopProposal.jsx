import React from 'react';
import cn from 'classnames/bind';
import { ReactComponent as IconPrev } from '../../assets/images/ic-prev.svg';
import { Select } from 'antd';
import { ReactComponent as IconArrowDown } from '../../assets/images/ico_arrow_drop_down.svg';
import { useNavigate } from 'react-router-dom';
import '../../assets/scss/proposal.scss';

const VotingTopProposal = ({
  loading,
  options,
  showProposal,
  selectedTopic,
  handleSelectTopicChange,
  isWhiteList,
}) => {
  const navitage = useNavigate();

  return (
    <div className={'proposal-top-wrap'}>
      <div className='proposal-top-btn-wrap'>
        {!showProposal && (
          <button
            className={cn('btn-prev')}
            onClick={() => {
              navitage('/voting/list');
            }}>
            <IconPrev />
          </button>
        )}
        <h2>{showProposal ? 'My Info' : 'New Proposal'}</h2>
      </div>

      <div className={'proposal-select-wrap'}>
        <span className={'select-label'}>
          {showProposal ? 'Replace List' : 'Topic for voting'}
        </span>
        <Select
          value={selectedTopic}
          filterOption={false}
          onChange={handleSelectTopicChange}
          disabled={loading}
          className={'select-proposal'}
          suffixIcon={<IconArrowDown />}
          dropDownClassName='proposal'>
          {options.map((item, i) => {
            // wait 안건 올리는 건 whitelist에 등록된 멤버만 가능
            if (item.value === 'AddWaitProposal' && !isWhiteList) return;
            return (
              <Select.Option value={item.value} key={i}>
                {item.id}
              </Select.Option>
            );
          })}
        </Select>
      </div>
    </div>
  );
};

export default VotingTopProposal;
