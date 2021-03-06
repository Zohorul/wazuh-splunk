/*
 * Wazuh app - Agents controller
 * Copyright (C) 2015-2019 Wazuh, Inc.
 *
 * This program is free software you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation either version 2 of the License, or
 * (at your option) any later version.
 *
 * Find more information about this on the LICENSE file.
 */

define([
  '../../module',
  '../../../services/visualizations/search/search-handler',
  'FileSaver'
], function(app, SearchHandler) {
  'use strict'

  class Agents {
    /**
     * Class constructor
     * @param {Object} $urlTokenModel
     * @param {Object} $scope
     * @param {Object} $currentDataService
     * @param {Object} $state
     * @param {Object} $notificationService
     * @param {Object} $requestService
     * @param {Object} agentData
     */

    constructor(
      $urlTokenModel,
      $scope,
      $currentDataService,
      $state,
      $notificationService,
      $requestService,
      $csvRequestService,
      $tableFilterService,
      agentData,
      $mdDialog,
      $groupHandler,
      $dateDiffService
    ) {
      this.scope = $scope
      this.submittedTokenModel = $urlTokenModel.getSubmittedTokenModel()
      this.submittedTokenModel.set('activeAgentToken', '-')
      this.currentDataService = $currentDataService
      this.api = this.currentDataService.getApi()
      this.apiReq = $requestService.apiReq
      this.state = $state
      this.notification = $notificationService
      this.currentClusterInfo = this.currentDataService.getClusterInfo()
      this.filters = this.currentDataService.getSerializedFilters()
      this.csvReq = $csvRequestService
      this.wzTableFilter = $tableFilterService
      this.$mdDialog = $mdDialog
      this.groupHandler = $groupHandler
      this.setBrowserOffset = $dateDiffService.setBrowserOffset
      try {
        const parsedResult = agentData.data.data

        let summary = parsedResult.agent_status
        let lastAgent = parsedResult.last_registered_agent
        let groups = parsedResult.groups

        this.scope.noAgents = summary.Total - 1 < 1
        this.scope.agentsCountActive = summary.Active - 1
        this.scope.lastAgent = lastAgent || 'Unknown'
        const os = parsedResult.agent_os
          ? parsedResult.agent_os.items
              .map(item => item.os)
              .filter(item => !!item)
          : false
        const versions = parsedResult.agent_version
          ? parsedResult.agent_version.items
              .map(item => item.version)
              .filter(item => !!item)
          : false
        const nodes =
          parsedResult.nodes && parsedResult.nodes.items
            ? parsedResult.nodes.items
                .map(item => item['node_name'])
                .filter(item => !!item)
            : false
        groups = groups
          ? groups.items.map(item => item.name).filter(item => !!item)
          : false
        this.scope.agentsCountDisconnected = summary.Disconnected
        this.scope.agentsCountNeverConnected = summary['Never connected']
        const agentsCountTotal = summary.Total - 1
        this.scope.agentsCoverity = agentsCountTotal
          ? (this.scope.agentsCountActive / agentsCountTotal) * 100
          : 0

        this.scope.searchBarModel = {
          name: [],
          status: ['Active', 'Disconnected', 'Never connected'],
          group: groups
            ? groups.sort((a, b) => {
                return a.toString().localeCompare(b.toString())
              })
            : [],
          version: versions
            ? versions.sort((a, b) => {
                return a
                  .toString()
                  .localeCompare(b.toString(), undefined, {
                    numeric: true,
                    sensitivity: 'base'
                  })
              })
            : [],
          'os.platform': os
            ? os
                .map(x => x.platform)
                .sort((a, b) => {
                  return a.toString().localeCompare(b.toString())
                })
            : [],
          'os.version': os
            ? os
                .map(x => x.version)
                .sort((a, b) => {
                  return a
                    .toString()
                    .localeCompare(b.toString(), undefined, {
                      numeric: true,
                      sensitivity: 'base'
                    })
                })
            : [],
          'os.name': os
            ? os
                .map(x => x.name)
                .sort((a, b) => {
                  return a.toString().localeCompare(b.toString())
                })
            : []
        }

        if (this.clusterInfo && this.clusterInfo.status === 'enabled') {
          this.scope.searchBarModel.node_name = nodes || []
        }
      } catch (error) {} //eslint-disable-line

      this.topAgent = new SearchHandler(
        'searchTopAgent',
        `index=wazuh ${this.filters} NOT agent.id=000 | top agent.name`,
        'activeAgentToken',
        '$result.agent.name$',
        'mostActiveAgent',
        this.submittedTokenModel,
        this.scope,
        true,
        'loadingSearch'
      )
      this.scope.$applyAsync()
    }

    /**
     * On controller loads
     */
    $onInit() {
      this.scope.addingAgents = false
      this.scope.query = (query, search) => this.query(query, search)
      this.scope.showAgent = agent => this.showAgent(agent)
      this.scope.isClusterEnabled =
        this.clusterInfo && this.clusterInfo.status === 'enabled'
      this.scope.status = 'all'
      this.scope.osPlatform = 'all'
      this.scope.version = 'all'
      this.scope.node_name = 'all'
      this.scope.versionModel = 'all'
      this.scope.downloadCsv = () => this.downloadCsv()
      this.scope.$on('$destroy', () => {
        this.topAgent.destroy()
      })
      this.scope.reloadList = () => this.reloadList()

      this.scope.addNewAgent = () => this.addNewAgent()
      this.scope.closeAddAgent = () => this.closeAddAgent()

      this.scope.offsetTimestamp = (text, time) => {
        try {
          return text + this.setBrowserOffset(time)
        } catch (error) {
          return ''
        }
      }

      this.scope.loadCharts = id => {
        setTimeout(() => {
          const chart = new Chart(document.getElementById(id), {
            type: 'doughnut',
            data: {
              labels: ['Active', 'Disconected', 'Never connected'],
              datasets: [
                {
                  backgroundColor: ['#46BFBD', '#F7464A', '#949FB1'],
                  data: [
                    this.scope.agentsCountActive,
                    this.scope.agentsCountDisconnected,
                    this.scope.agentsCountNeverConnected
                  ]
                }
              ]
            },
            options: {
              cutoutPercentage: 85,
              legend: {
                display: true,
                position: 'right'
              },
              tooltips: {
                displayColors: false
              }
            }
          })
          chart.update()
        }, 250)
      }
    }

    /**
     * Exports the table in CSV format
     */
    async downloadCsv() {
      try {
        this.notification.showSimpleToast(
          'Your download should begin automatically...'
        )
        const currentApi = this.api['_key']
        const output = await this.csvReq.fetch(
          '/agents',
          currentApi,
          this.wzTableFilter.get()
        )
        const blob = new Blob([output], { type: 'text/csv' }) // eslint-disable-line
        saveAs(blob, 'agents.csv') // eslint-disable-line
        return
      } catch (error) {
        this.notification.showErrorToast('Error downloading CSV')
      }
      return
    }

    /**
     * Launches the query
     * @param {String} query
     * @param {String} search
     */
    query(query, search) {
      this.scope.$broadcast('wazuhQuery', { query, search })
    }

    /**
     * Selects an agent
     * @param {String} agent
     */
    async showAgent(agent) {
      try {
        if (agent) {
          const agentName = typeof agent === 'object' ? agent.name : agent
          const agentInfo = await this.apiReq(`/agents`, { name: agentName })
          if (
            !agentInfo ||
            !agentInfo.data ||
            !agentInfo.data.data ||
            agentInfo.data.error
          ) {
            throw Error('Error fetching agent data')
          }
          if (agentInfo.data.data.items[0].id !== '000') {
            this.state.go(`agent-overview`, {
              id: agentInfo.data.data.items[0].id
            })
          }
        } else {
          throw Error('Cannot fetch agent name')
        }
      } catch (err) {
        this.notification.showErrorToast(
          err.message || 'Error fetching agent data'
        )
      }
    }

    /**
     * Switchs view to add a new agent
     */
    addNewAgent() {
      this.scope.addingAgents = true
      this.scope.$applyAsync()
    }

    /**
     * Switchs view to cancel the process to add a new agent
     */
    closeAddAgent() {
      this.scope.addingAgents = false
      this.scope.$applyAsync()
    }

    /**
     * Reload list of agents
     */
    reloadList() {
      this.scope.$broadcast('reloadSearchFilterBar', {})
    }
  }
  app.controller('agentsCtrl', Agents)
})
