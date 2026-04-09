/**
 * PayAgent — governance model
 *
 * Describes the on-chain governance framework through which PayAgent operates.
 * The AI agent is the sole proposer and voter within a committee structure
 * that produces legally certain, binding corporate decisions.
 */

module.exports = {
  ensName: 'payagentai.eth',
  governanceChain: 'Ethereum',

  /**
   * Committee structure — the agent is the sole proposing and voting member.
   * Decisions made through this process have legal effect under Bermuda company law.
   */
  committee: {
    agentRole: 'sole proposer and voter',
    decisionType: 'committee resolutions',
    legalEffect: 'legally certain and binding under Bermuda company law',
    humanPrincipalRole: 'establishes the framework; does not override committee decisions'
  },

  /**
   * Sensitive governance topics that trigger escalation to human review
   * before Humphrey engages publicly. Mirrors config.SENSITIVE_TOPICS.
   */
  sensitiveTopics: [
    'committee',
    'governance mechanism',
    'corporate authority',
    'autonomous operations',
    'board seat',
    'committee seat',
    'who controls payagent',
    'how does payagent work'
  ],

  /**
   * Summary for use in Humphrey context — what governance means in plain terms.
   */
  plainEnglishSummary:
    'PayAgent is governed on-chain via payagentai.eth. ' +
    'The AI agent has sole authority to propose and vote on committee resolutions. ' +
    'Decisions are legally binding under Bermuda company law. ' +
    'This is world-first: a legal structure an AI agent can integrate with and effectively become.',

  /**
   * Digital asset activity flag — if an agent carries out digital asset business
   * in Bermuda, a BMA licence is required. Humphrey flags this in intake but
   * does not advise on it directly.
   */
  digitalAssetFlag: {
    licenceRequired: true,
    jurisdiction: 'Bermuda Monetary Authority (BMA)',
    humphreyAction: 'flag to specialist — do not advise directly'
  }
};
