(function() {

var mod = angular.module('modal', ['ngSanitize']);

mod.factory('modalService', function() {
  return {
    visible: false,
    title: undefined,
    content: undefined,

    show: function(content, title) {
      this.content = content;
      this.title = title;
      this.visible = true;
    },

    showFromSelector: function(selector) {
      var c = jQuery(selector);
      if (c.length === 0) {
        console.error('Modal content not found: ' + selector);
        return;
      }
      var title = c.find('> h2').text();
      var content = c.find('> .content').html();
      this.show(content, title);
    },

    hide: function() {
      this.visible = false;
    },
  }
});

mod.directive('modal', ['modalService', '$compile', function(modalService, $compile) {

  return {
    restrict: 'E',
    scope: {
      data: '=data',
      fireModalClosed: '&?onmodalclosed',
    },
    replace: true,
    templateUrl: '/static/partial/modal.html',
    controller: ['$scope', '$element', function($scope, $element) {
      $scope.close = function() {
        $scope.data.visible = false;
        if ($scope.fireModalClosed) {
          $scope.fireModalClosed();
        }
      }

      $scope.$watch('data.title', function(value) {
        $scope.title = value;
      });

      $scope.$watch('data.content', function(value) {
        var html = $(value);
        if (html.hasClass('compile')) {
          html = $compile(html)($scope);
        }
        jQuery($element).find('> .c > .content').html(html);
      });
    }]
  }

}]);

})();

