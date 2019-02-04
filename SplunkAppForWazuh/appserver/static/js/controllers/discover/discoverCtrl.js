define([
  '../module',
  'jquery',
], function (
  app,
  $
) {
    'use strict'

    class Discover {
      /**
       * Class Discover
       */
      constructor(
        $scope,
        $currentDataService,
        $state,
        $stateParams,
        $document,
        $notificationService
      ) {
        this.currentDataService = $currentDataService
        this.filters = this.currentDataService.getSerializedFilters()
        this.scope = $scope
        this.toast = $notificationService.showSimpleToast
        this.state = $state
        this.stateParams = $stateParams
        this.iframe = $($document[0]).find('#searchAndReporting')
      }

      /**
       * On controller loads
       */
      $onInit() {
        try {
          this.scope.fromDashboard = this.stateParams.fromDashboard
          this.loadIframeContent()
          this.scope.backToDashboard = () => this.backToDashboard()

        } catch (error) {
          this.toast("Cannot load discover.")
        }
      }

      loadIframeContent() {
        try {
          const url = localStorage.getItem('urlDiscover')
          this.iframe.attr("src", url)
          const interval = setInterval(() => {
            if (this.iframe.contents().find('header')) {
              const header = this.iframe.contents().find('header')
              header.hide()
              if (header.is(':hidden')) {
                clearInterval(interval)
              }
            }
          }, 500)
        } catch (error) {
          throw new Error(error)
        }
      }

      backToDashboard() {
        this.state.go(this.stateParams.previousState)
      }
    }
    app.controller('discoverCtrl', Discover)
  })
