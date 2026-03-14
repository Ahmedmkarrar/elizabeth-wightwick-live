((function() {
    'use strict';

    var altoApp = angular.module('alto');
    altoApp.requires.push('diary.export');

    angular
        .module('diary.export', ['modal', 'common.services'])
        .run(function () {
            angular
                .element(document)
                .on('view-loaded', '.view[data-id="diary"]', function (e) {
                    var view = angular.element(e.target);
                    var myDiaryButton = view.find(
                        'div.panel[data-id="diary"] ul li.item[data-unique-id="my-diary"]'
                    );
                    var content = myDiaryButton.find('div.content');

                    if (content.next('.extension').length === 0) {
                        var container = content.after(
                            '<div class="right mr20 extension hidden" data-feature="diary-export" title="Click here to set up your diary for export"><i class="extension fa fa-rss fa-2x fa-pull-right mt10 ng-scope" qtip qtip-url="/scripts/app/angular/diary/diary.export.html" qtip-style="{ tip: { width: 24, height: 16 }, width:450, classes:\'qtip-light bootstrap qtip-shadow\'}" qtip-position="{my: \'left middle\', at: \'middle right\'}" qtip-container=\'div.view[data-id= "diary"]\'></i></div>'
                        );
                        container
                            .next('div.extension[data-feature="diary-export"]')
                            .removeClass('hidden')
                            .show();
                        var syndicate = myDiaryButton.find('i.ng-scope');
                        gmgps.cloud.angular.destroyChildScopes(syndicate);
                        gmgps.cloud.angular.compileElement(syndicate);
                    }
                });
        });
}))();
