define([
  '../../module',
  '../rules/ruleset',
  '../../../directives/wz-table/lib/pagination',
  '../../../directives/wz-table/lib/check-gap' 
  ], function(
    controllers,
    Ruleset,
    pagination,
    checkGap
    ) {
  'use strict'
    class CDBList extends Ruleset {
      /**
       * Class cdb
       * @param {*} $scope
       * @param {*} $sce
       * @param {*} $notificationService
       * @param {*} $currentDataService
       * @param {*} $tableFilterService
       * @param {*} $csvRequestService
       */
      constructor(
        $scope,
        $sce,
        $notificationService,
        $currentDataService,
        $tableFilterService,
        $csvRequestService,
        isAdmin,
        $cdbEditor,
        $mdDialog
      ) {
        super(
          $scope,
          $sce,
          $notificationService,
          'cbd',
          $currentDataService,
          $tableFilterService,
          $csvRequestService
        )
        this.pagination = pagination
        this.checkGap = checkGap
        this.isAdmin = isAdmin
        this.cdbEditor = $cdbEditor
        this.mdDialog = $mdDialog
      }
  
      /**
       * On controller load
       */
      $onInit() {
        this.scope.downloadCsv = (path, name) => this.downloadCsv(path, name)
        this.scope.$broadcast('wazuhSearch', { term: '', removeFilters: true })
        this.scope.selectedNavTab = 'cdbList'
        this.scope.adminMode = this.isAdmin

        /**
         * Functions to edit a CDB lists binded to the scope
         */
        this.scope.addEntry = (key, value) => this.addEntry(key, value)
        this.scope.setEditingKey = (key, value) => this.setEditingKey(key, value)
        this.scope.cancelEditingKey = () => this.cancelEditingKey()
        this.scope.showConfirmRemoveEntry = (ev, key) => this.showConfirmRemoveEntry(ev, key)
        this.scope.editKey = (key, value) => this.editKey(key, value)
        this.scope.cancelRemoveEntry = () => this.cancelRemoveEntry()
        this.scope.confirmRemoveEntry = (key) => this.confirmRemoveEntry(key)
        this.scope.cancelCdbListEdition = () => this.cancelCdbListEdition()
        this.scope.addNewFile = () => this.addNewFile()
        this.scope.saveList = () => this.saveList()
  
        /**
         * Pagination variables and functions
         */
        this.scope.items = this.cdbToArr()
        this.contentToFilter = this.scope.items
        this.scope.totalItems = this.scope.items.length    
        this.scope.itemsPerPage = 10
        this.scope.pagedItems = []
        this.scope.currentPage = 0
        this.scope.gap = 0
        this.scope.searchTable = () => this.pagination.searchTable(this.scope, this.scope.items)
        this.scope.groupToPages = () => this.pagination.groupToPages(this.scope) 
        //this.initPagination()
        this.scope.range = (size, start, end) => this.pagination.range(size, start, end, this.scope.gap)
        this.scope.prevPage = () => this.pagination.prevPage(this.scope)
        this.scope.nextPage = async currentPage => this.pagination.nextPage(currentPage, this.scope, this.notificationService, null)
        this.scope.setPage = (n) => {
          this.scope.currentPage = n
          this.scope.nextPage(n)
        }
        this.scope.filterContent = (filter) => this.filterContent(filter)
        
  
        this.scope.$on('loadedTable', () => {
          try {
            if (window.localStorage.cdb) {
              const parsedFilter = JSON.parse(window.localStorage.cdb)
              this.scope.appliedFilters = parsedFilter
              if (this.filter.length > 0) {
                this.scope.$broadcast('wazuhFilter', { filter: this.filter })
              }
            }
          } catch (err) {
            this.toast('Error applying filter')
          }
        })
      }

      /**
       * Filters the content of CDB lists
       * @param {*} filter 
       */
      async filterContent(filter) {
        this.scope.items = this.filter('filter')(this.contentToFilter, filter)
        this.initPagination()
      }

      /**
       * Adds new CDB list file
       */
      addNewFile() {
        try {
          this.scope.addingNewFile = true
          this.scope.currentList = {
            list: {},
            details:
            {
              file: '',
              path: 'etc/lists'
            }
          }
        } catch (error) {
          this.toast("Cannot add new CDB list file.")
        }
  
      }

      /**
       * Cancels CDB list edition
       */
      cancelCdbListEdition() {
        this.scope.currentList = false
        this.scope.addingNewFile = false
        this.scope.items = null
        this.scope.totalItems = null    
        this.scope.pagedItems = null
        this.scope.currentPage = 0
        this.scope.gap = 0
        this.cancelEditingKey()
      }
      
      /**
       * Adds new entry field
       * @param {String} key 
       * @param {String} value 
       */
      async addEntry(key, value) {
        try {
          if (!key) {
            this.toast("Cannot send empty fields.")
          } else {
            if (!this.scope.currentList.list[key]) {
              value = value ? value : ''
              this.scope.currentList.list[key] = value
              this.scope.newKey = ''
              this.scope.newValue = ''
              this.refreshCdbList()
            } else {
              this.toast("Error adding new entry, the key exists.")
            }
          }
        } catch (error) {
          this.toast("Error adding entry.")
        }
      }
  
      /**
     * Enable edition for a given key
     * @param {String} key Entry key
     */
      setEditingKey(key, value) {
        this.scope.editingKey = key
        this.scope.editingNewValue = value
      }
  
      /**
       * Cancel edition of an entry
       */
      cancelEditingKey() {
        this.scope.editingKey = false
        this.scope.editingNewValue = ''
      }
  
      /**
       * Shows confirmation to remove a field
       * @param {*} ev 
       * @param {String} key 
       */
      showConfirmRemoveEntry(ev, key) {
        this.scope.removingEntry = key
      }
  
      /**
       * Sets a new value for a field
       * @param {String} key 
       * @param {String} newValue 
       */
      async editKey(key, newValue) {
        try {
          this.scope.currentList.list[key] = newValue
          this.cancelEditingKey()
          this.refreshCdbList()
        } catch (error) {
          this.toast("Error editing value.")
        }
      }
  
      /**
       * Cancels the removing of a entry
       */
      cancelRemoveEntry() {
        this.scope.removingEntry = false
      }
  
      /**
       * Confirms if wants to remove a entry
       * @param {String} key 
       */
      async confirmRemoveEntry(key) {
        try {
          delete this.scope.currentList.list[key]
          this.scope.removingEntry = false
          this.refreshCdbList()
        } catch (error) {
          this.toast("Error deleting entry.")
        }
  
      }
  
      /**
       * Refreshs CDB list fields
       */
      refreshCdbList() {
        this.scope.items = this.cdbToArr()
        this.initPagination()
        this.scope.$applyAsync()
      }
  
      /**
       * Saves the CDB list content
       */
      async saveList() {
        try {
          const containsNumberBlanks = /.* .*/
          const fileName = this.scope.currentList.details.file
          if (fileName) {
            if (containsNumberBlanks.test(fileName)) {
              this.toast('Error creating a new file. The filename can not contain white spaces.')
            } else {
              const path = this.scope.currentList.details.path
              const content = this.objToString(this.scope.currentList.list)
              const result = await this.cdbEditor.sendConfiguration(fileName, path, content)
              if (
                result &&
                result.data &&
                result.data.error === 0
              ) {
                await this.showRestartDialog(`CDB ${fileName} created`)
                this.cancelCdbListEdition()
              } else {
                throw new Error(`Error creating new CDB list `, result)
              }
            }
          } else {
            this.toast('Please set a name for the new CDB list.')
          }
        } catch (error) {
          this.toast(`Cannot created ${fileName}`)
        }
      }

      /**
       * Converts string to object
       * @param {String} string 
       */
      stringToObj(string) {
        let result = {}
        const splitted = string.split('\n')
        splitted.forEach((element) => {
          const keyValue = element.split(':')
          if (keyValue[0])
            result[keyValue[0]] = keyValue[1]
        })
        return result
      }
  
      /**
       * Converts object to string
       * @param {Object} obj 
       */
      objToString(obj) {
        let raw = '';
        for (var key in obj) {
          raw = raw.concat(`${key}:${obj[key]}\n`);
        }
        return raw
      }
      
      /**
       * Converts objecto to array
       */
      cdbToArr(){
        try {
          const obj = this.scope.currentList.list
          let items = []
          for (var property in obj) {
            let o = [property, obj[property]]
            items.push(o)
          }
          return items
        } catch (error) {
          return []
        }
      }
  
      /**
       * Init the table pagination
       */
      initPagination(){
        this.scope.totalItems = this.scope.items.length
        this.checkGap(this.scope, this.scope.items)
        this.scope.searchTable()      
      }
  
      /**
       * Show restart md-dialog if the cdb list was saved successfully
       * @param {String} msg 
       */
      async showRestartDialog(msg) {
        const confirm = this.mdDialog.confirm({
          controller: function ($scope, scope, $notificationService, $mdDialog, $restartService) {
            $scope.closeDialog = () => {
              $mdDialog.hide();
              $('body').removeClass('md-dialog-body');
            };
            $scope.confirmDialog = () => {
              $mdDialog.hide();
              scope.$broadcast('restartResponseReceived', {})
              $restartService.restart()
                .then(data => {
                  $('body').removeClass('md-dialog-body');
                  $notificationService.showSimpleToast(data);
                  scope.$broadcast('restartResponseReceived', {})
                  scope.$applyAsync();
                })
                .catch(error =>
                  $notificationService.showSimpleToast(error.message || error, 'Error restarting manager'));
            }
          },
          template:
            '<md-dialog class="modalTheme euiToast euiToast--success euiGlobalToastListItem">' +
            '<md-dialog-content>' +
            '<div class="euiToastHeader">' +
            '<i class="fa fa-check"></i>' +
            '<span class="euiToastHeader__title">' +
            `${msg}` +
            `. Do you want to restart now?` +
            '</span>' +
            '</div>' +
            '</md-dialog-content>' +
            '<md-dialog-actions>' +
            '<button class="md-primary md-cancel-button md-button ng-scope md-default-theme md-ink-ripple" type="button" ng-click="closeDialog()">I will do it later</button>' +
            '<button class="md-primary md-confirm-button md-button md-ink-ripple md-default-theme" type="button" ng-click="confirmDialog()">Restart</button>' +
            '</md-dialog-actions>' +
            '</md-dialog>',
          hasBackdrop: false,
          clickOutsideToClose: true,
          disableParentScroll: true,
          locals: {
            scope: this.scope,
          }
        });
        $('body').addClass('md-dialog-body');
        this.mdDialog.show(confirm);
      }

    }
    controllers.controller('managerCdbCtrl', CDBList)
    return CDBList
  })
  