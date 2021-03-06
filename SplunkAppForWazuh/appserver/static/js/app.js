define([
  'angular',
  'ngAnimate',
  'ngMaterial',
  'ngRoute',
  './services/index',
  './directives/index',
  './controllers/index',
  './filters/index',
  './run/index',
  './config/index',
  'chart',
  'angularChart'
], function(ng) {
  'use strict'
  return ng.module('wazuhApp', [
    'ngMaterial',
    'ngAnimate',
    'ui.router',
    'app.services',
    'app.directives',
    'app.controllers',
    'app.filter',
    'app.run',
    'app.config'
  ])
})
