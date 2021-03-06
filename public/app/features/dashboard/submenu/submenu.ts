///<reference path="../../../headers/common.d.ts" />

import angular from 'angular';

export class SubmenuCtrl {
  annotations: any;
  variables: any;
  dashboard: any;

  /** @ngInject */
  constructor(private $rootScope, private templateValuesSrv, private dynamicDashboardSrv) {
    this.annotations = this.dashboard.templating.list;
    this.variables = this.dashboard.templating.list;
  }

  disableAnnotation(annotation) {
    annotation.enable = !annotation.enable;
    this.$rootScope.$broadcast('refresh');
  }

  getValuesForTag(variable, tagKey) {
    return this.templateValuesSrv.getValuesForTag(variable, tagKey);
  }

  variableUpdated(variable) {
    this.templateValuesSrv.variableUpdated(variable).then(() => {
      this.dynamicDashboardSrv.update(this.dashboard);
      this.$rootScope.$emit('template-variable-value-updated');
      this.$rootScope.$broadcast('refresh');
    });
  }
}

export function submenuDirective() {
  return {
    restrict: 'E',
    templateUrl: 'app/features/dashboard/submenu/submenu.html',
    controller: SubmenuCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: "=",
    }
  };
}

angular.module('grafana.directives').directive('dashboardSubmenu', submenuDirective);
