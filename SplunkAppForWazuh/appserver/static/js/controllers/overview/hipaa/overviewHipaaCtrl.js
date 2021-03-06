define([
  '../../module',
  '../../../dashboardMain',
  '../../../services/visualizations/chart/linear-chart',
  '../../../services/visualizations/chart/column-chart',
  '../../../services/visualizations/chart/pie-chart',
  '../../../services/visualizations/table/table',
  '../../../services/visualizations/chart/single-value',
  '../../../services/visualizations/inputs/dropdown-input',
  '../../../services/rawTableData/rawTableDataService'
], function(
  app,
  DashboardMain,
  LinearChart,
  ColumnChart,
  PieChart,
  Table,
  SingleValue,
  Dropdown,
  RawTableDataService
) {
  'use strict'

  class Hipaa extends DashboardMain {
    /**
     * Class Hipaa
     * @param {*} $urlTokenModel
     * @param {*} $scope
     * @param {*} $currentDataService
     * @param {*} $state
     * @param {*} $reportingService
     */
    constructor(
      $urlTokenModel,
      $scope,
      $currentDataService,
      $state,
      $reportingService,
      hipaaTabs,
      reportingEnabled,
      pciExtensionEnabled,
      gdprExtensionEnabled,
      nistExtensionEnabled
    ) {
      super(
        $scope,
        $reportingService,
        $state,
        $currentDataService,
        $urlTokenModel
      )
      this.scope.reportingEnabled = reportingEnabled
      this.scope.pciExtensionEnabled = pciExtensionEnabled
      this.scope.gdprExtensionEnabled = gdprExtensionEnabled
      this.scope.nistExtensionEnabled = nistExtensionEnabled
      this.scope.hipaaTabs = hipaaTabs ? hipaaTabs : false

      this.filters = this.getFilters()

      this.scope.expandArray = [
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false
      ]

      this.dropdown = new Dropdown(
        'dropDownInput',
        `${this.filters} sourcetype=wazuh rule.hipaa{}="*" | stats count by "rule.hipaa{}" | sort "rule.hipaa{}" ASC | fields - count`,
        'rule.hipaa{}',
        '$form.hipaa$',
        'dropDownInput',
        this.scope
      )
      this.dropdownInstance = this.dropdown.getElement()

      this.dropdownInstance.on('change', newValue => {
        if (newValue && this.dropdownInstance)
          $urlTokenModel.handleValueChange(this.dropdownInstance)
      })

      this.vizz = [
        new ColumnChart(
          'alertsVolumeByAgent',
          `${this.filters} sourcetype=wazuh rule.hipaa{}="$hipaa$"  | chart count by agent.id,rule.hipaa{} | rename agent.id as "Agent ID", rule.hipaa{} as "Requirement", count as "Count"`,
          'alertsVolumeByAgent',
          this.scope,
          { stackMode: 'stacked' }
        ),
        new PieChart(
          'top10Requirements',
          `${this.filters} sourcetype=wazuh rule.hipaa{}="*" | top limit=10 rule.hipaa{} | rename rule.hipaa{} as "Requirement"`,
          'top10Requirements',
          this.scope
        ),
        new PieChart(
          'mostActiveAgents',
          `${this.filters} sourcetype=wazuh rule.hipaa{}="$hipaa$" | top limit=10 agent.name`,
          'mostActiveAgents',
          this.scope
        ),
        new SingleValue(
          'maxRuleLevel',
          `${this.filters} sourcetype=wazuh rule.hipaa{}="$hipaa$" | top rule.level | sort - rule.level`,
          'maxRuleLevel',
          this.scope
        ),
        new SingleValue(
          'totalAlerts',
          `${this.filters} sourcetype=wazuh rule.hipaa{}="$hipaa$" | stats count`,
          'totalAlerts',
          this.scope
        ),
        new ColumnChart(
          'requirementsEvolutionOverTime',
          `${this.filters} sourcetype=wazuh rule.hipaa{}="$hipaa$" agent.name=* | timechart count by rule.hipaa{} | rename count as "Count", rule.hipaa{} as "Requirement"`,
          'requirementsEvolutionOverTime',
          this.scope,
          { stackMode: 'stacked' }
        ),
        new ColumnChart(
          'requirementsDistributionByAgent',
          `${this.filters} sourcetype=wazuh rule.hipaa{}="$hipaa$" agent.name=* | chart count(rule.hipaa{}) by agent.name,rule.hipaa{} | rename count as "Count" , agent.name as "Agent name", rule.hipaa{} as "Requirement"`,
          'requirementsDistributionByAgent',
          this.scope
        ),
        new Table(
          'alertsSummary',
          `${this.filters} sourcetype=wazuh rule.hipaa{}="$hipaa$" | stats count by agent.name,rule.hipaa{},rule.level,rule.description | sort count DESC | rename rule.hipaa{} as "Requirement", rule.level as "Level", rule.description as "Description", count as "Count", agent.name as "Agent"`,
          'alertsSummary',
          this.scope
        ),
        new RawTableDataService(
          'alertsSummaryTable',
          `${this.filters} sourcetype=wazuh rule.hipaa{}="$hipaa$" | stats count sparkline by agent.name, rule.hipaa{}, rule.description | sort count DESC | rename agent.name as "Agent Name", rule.hipaa{} as "Requirements", rule.description as "Rule description", count as Count`,
          'alertsSummaryTableToken',
          '$result$',
          this.scope,
          'Alerts Summary'
        )
      ]
    }

    $onInit() {
      try {
        this.scope.loadingVizz = true
        /**
         * Generates report
         */
        this.scope.startVis2Png = () =>
          this.reportingService.startVis2Png(
            'overview-hipaa',
            'HIPAA',
            this.filters,
            [
              'alertsVolumeByAgent',
              'top10Requirements',
              'mostActiveAgents',
              'maxRuleLevel',
              'totalAlerts',
              'requirementsEvolutionOverTime',
              'requirementsDistributionByAgent',
              'alertsSummary'
            ],
            {}, //Metrics
            this.tableResults
          )
      } catch (error) {}
    }
  }
  app.controller('overviewHipaaCtrl', Hipaa)
})
