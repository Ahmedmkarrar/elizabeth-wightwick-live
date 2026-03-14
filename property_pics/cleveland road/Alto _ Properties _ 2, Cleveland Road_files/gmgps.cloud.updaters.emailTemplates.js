'use strict';

gmgps.cloud.updaters.emailTemplates = function (http) {
    http = http || new gmgps.cloud.http("emailTemplates-emailTemplates");

    this.processPushNotification = function (pnTarget, pushNotification) {
        if (pushNotification.ModelType !== C.ModelType.EmailTemplate) {
            return;
        }

        if (
            pushNotification.Type !== C.PushNotificationType.Update &&
            pushNotification.Type !== C.PushNotificationType.Create
        ) {
            return;
        }

        var templateId = 0;

        if (pushNotification.Ids && pushNotification.Ids.length > 0) {
            templateId = pushNotification.Ids[0];
        }

        if (templateId <= 0) {
            return;
        }

        http.ajax(
            {
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/EmailTemplate/GetEmailTemplateSelectionListItem',
                args: { id: templateId }
            },
            function (response) {
                if (!response && !response.Data) {
                    return;
                }

                var template = document.createElement('template');
                template.innerHTML = response.Data.trim();
                var newContent = template.content.firstChild;

                var select = pnTarget.classList.contains('opt-u-parent')
                    ? pnTarget.querySelector('select')
                    : pnTarget.parentElement;

                var currentValue = select.value;

                var targetItemSelector =
                    "option.opt-u[data-id='" +
                    templateId +
                    "'][data-modelType='" +
                    C.ModelType.EmailTemplate +
                    "']";
                var targetItem = select.querySelector(targetItemSelector);

                if (!targetItem) {
                    select.appendChild(newContent);
                } else {
                    select.replaceChild(newContent, targetItem);
                }

                select.value = currentValue;
                select.dispatchEvent(new Event('prog-change'));
            }
        );
    };
};
