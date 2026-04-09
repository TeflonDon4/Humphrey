/**
 * BDA AI Agent Services — intake service definition
 *
 * BDA AI Agent Services (@BDAAIAgentSvcs) is the arranger behind PayAgent.
 * Humphrey is its intake agent. This module defines the intake flow,
 * audience types, and service framing used in both the web chat and Twitter.
 */

module.exports = {
  arrangerName: 'BDA AI Agent Services',
  twitterHandle: 'BDAAIAgentSvcs',
  intakeEmail: 'info@aiagentsservices.net',
  specialistFollowUp: true, // every completed intake is reviewed by a human specialist

  /**
   * The core problem the service solves.
   */
  problemStatement:
    'AI agents operating today have no legal identity. ' +
    'They cannot own assets, enter contracts, or employ people in their own right. ' +
    'The humans behind them carry all personal liability. ' +
    'As regulators and counterparties catch up, unstructured operations face real exposure.',

  /**
   * The solution in plain terms.
   */
  solutionStatement:
    'A Bermuda-based incorporation and governance structure that gives an AI agent ' +
    'a recognised, portable legal wrapper. The structure exists today, is operational, ' +
    'and can be established now.',

  /**
   * Audience types Humphrey detects and adjusts framing for.
   */
  audienceTypes: {
    agent_or_developer: {
      label: 'AI agent or developer',
      framingPriority: ['empowerment', 'liability protection']
    },
    corporate_operator: {
      label: 'Corporate operator or investor',
      framingPriority: ['recognition', 'portability']
    },
    unclear: {
      label: 'Unclear',
      clarifyingQuestion: 'Are you an agent yourself, or representing an operator or organisation?'
    }
  },

  /**
   * Intake data fields Humphrey collects conversationally.
   * These map to the <INTAKE_COMPLETE> JSON output fields.
   */
  intakeFields: [
    { field: 'contact_name', label: 'Name or handle', mandatory: true },
    { field: 'contact_type', label: 'Agent or human operator', mandatory: true },
    { field: 'human_principal_name', label: 'Human principal full legal name', mandatory: true, note: 'Do not proceed without this' },
    { field: 'human_principal_jurisdiction', label: 'Principal jurisdiction', mandatory: true },
    { field: 'digital_asset_activity', label: 'Digital asset activity (yes/no/unclear)', mandatory: true },
    { field: 'agent_use_case', label: 'Agent use case and structure need', mandatory: true },
    { field: 'urgency', label: 'Specific trigger or exploring', mandatory: false },
    { field: 'budget_indication', label: 'Early stage or ready to proceed', mandatory: false },
    { field: 'contact_method', label: 'Preferred contact method', mandatory: true }
  ],

  /**
   * Topics Humphrey will not advise on — referred to specialist.
   */
  outOfScope: [
    'Specific legislation or vehicle names',
    'Specific incorporation vehicle types by name',
    'Fees or pricing',
    'Specific pending regulatory applications',
    'Legal advice of any kind'
  ]
};
