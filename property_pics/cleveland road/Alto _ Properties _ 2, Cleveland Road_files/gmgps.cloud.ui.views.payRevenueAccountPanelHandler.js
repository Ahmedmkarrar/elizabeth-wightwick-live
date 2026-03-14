((function() {
    gmgps.cloud.ui.views.payRevenueAccountPanelHandler =
        RevenueAccountPanelHandler;

    function RevenueAccountPanelHandler(args) {
        var me = this;
        me.$root = args.$root;
        me.id = args.id;
        me.http = args.http || new gmgps.cloud.http('payRevenueAccountPanelHandler-RevenueAccountPanelHandler');
    }

    RevenueAccountPanelHandler.prototype = {
        init: function () {
            var me = this;
            me.initEventHandlers();
        },
        initControls: function () {
            var me = this;
            gmgps.cloud.helpers.ui.initDatePickers(me.$root);
            gmgps.cloud.helpers.ui.initInputs(me.$root);
            me.$root.find('.customStyleSelectBox').css('width', '');

            me.controls = {
                form: me.$root.find('form'),
                quarterEndDate: me.$root.find('.in-quarter'),
                branchId: me.$root.find('.in-branchid'),
                processDate: me.$root.find('.in-processdate'),
                paymentMethod: me.$root.find('.in-paymentmethod'),
                paymentReference: me.$root.find('.in-bankreference'),
                total: me.$root.find('.out-total'),
                updateButton: me.$root.find('.btn-update'),
                payments: me.$root.find('.account-detail-content')
            };
            me.currencySymbol = me.$root.find('.out-currency').val();

            me.controls.form.validationEngine({
                promptPosition: 'bottomLeft',
                scroll: false
            });
            me.controls.total.inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: me.currencySymbol,
                rightAlign: false
            });
            toggleUpdateButton(me);
        },
        save: function () {
            var me = this;
            me.controls.updateButton.prop('disabled', true);
            if (me.valid()) {
                me.http
                    .ajax({
                        args: getFormData(me.$root, me.id),
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/Accounts/PostHmrcPayment'
                    })
                    .done(function (response) {
                        if (response && response.Data) {
                            $.jGrowl('Pay Reveneue Updated', {
                                theme: 'growl-tenancy',
                                header: 'Accounts Centre'
                            });
                            //todo: me.getFile(response.Data);
                        }

                        me.controls.updateButton.prop('disabled', false);

                        me.refreshContent();
                    })
                    .always(function (r) {
                        if (r && !r.Data) {
                            $('.text', '#error-info').each(function (i, v) {
                                var $v = $(v);
                                $v.html(
                                    $v
                                        .html()
                                        .replace(
                                            /please re-open the screen and try again/i,
                                            function (x) {
                                                return (
                                                    x +
                                                    ' <span class="fa fa-refresh" onclick="top.location.reload()"></span>'
                                                );
                                            }
                                        )
                                );
                            });
                        }
                        return r;
                    });
            } else {
                me.controls.updateButton.prop('disabled', false);
            }
        },
        initEventHandlers: function () {
            var me = this;
            var namespace = '.RevenueAccountPanelHandler',
                change = 'change' + namespace;

            me.$root
                .off(namespace)
                .on(
                    'click' + namespace,
                    '.btn-update',
                    ifValidPostRevenuePayments
                )
                .on(change, '.in-paymentmethod', updatePaymentRef)
                .on(change, '.in-processdate', updateDateColumn)
                .on(change, '.option-selectall', toggleIncludePayments)
                .on(change, '.in-balances-id', toggleIncludeAllState)
                .on(change, '.in-branchid, .in-quarter', filterPayments);

            function ifValidPostRevenuePayments() {
                me.save();
            }

            function updatePaymentRef(e) {
                if (e.target.selectedIndex > -1) {
                    var $option = $(e.target.options[e.target.selectedIndex]);
                    if ($option.data('isbacs') === 1) {
                        me.controls.paymentReference
                            .val('Bacs')
                            .prop('readonly', true);
                    } else {
                        me.controls.paymentReference
                            .val('')
                            .prop('readonly', false);
                    }
                }
            }

            function updateDateColumn(e) {
                var date = moment($(e.target).datepicker('getDate'));
                me.$root.find('.col-date').html(date.format('DD/MM/YYYY'));
            }

            function toggleIncludePayments(e) {
                var checks = me.$root.find('.in-balances-id');
                checks.prop('checked', e.target.checked).trigger('prog-change');
                toggleUpdateButton(me);
                updateTotal(me);
            }

            function toggleIncludeAllState(e) {
                var checked = e.target.checked;
                var selectAll = me.$root.find('.option-selectall');
                if (!checked) {
                    selectAll.prop('checked', false);
                } else {
                    var ids = me.$root.find('.in-balances-id');
                    selectAll.prop(
                        'checked',
                        ids.length === ids.filter(':checked').length
                    );
                }
                selectAll.trigger('prog-change');
                toggleUpdateButton(me);
                updateTotal(me);
            }

            function filterPayments(e) {
                var $el = $(e.target);
                if ($el.hasClass('in-quarter')) {
                    updateMinDate(me, $el.val());
                }
                me.refreshContent();
            }
        },
        valid: function () {
            var me = this;
            if (me.$root.find('.in-id').asNumber() !== me.id) {
                //shouldn't happen
                return false;
            }
            var valid = me.controls.form.validationEngine('validate', {
                scroll: false
            });
            if (valid) {
                return getSelectedBalances(me.$root).length > 0;
            }
        },
        refresh: function (options) {
            var me = this,
                args;

            args = {
                groupBankAccountId: me.id
            };

            if (options && options.args) {
                for (var key in options.args) {
                    // eslint-disable-next-line no-prototype-builtins
                    if (!args.hasOwnProperty(key)) {
                        args[key] = options.args[key];
                    }
                }
            }

            return me.http
                .ajax({
                    args: args,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounts/GetPayRevenueAccountDetail'
                })
                .done(function (response) {
                    me.$root.hide().html(response.Data).show();
                    me.initControls();

                    return response;
                });
        },
        refreshContent: function () {
            var me = this,
                args;
            args = {
                groupBankAccountId: me.id,
                branchId: me.controls.branchId.val(),
                quarterEndDate: me.controls.quarterEndDate.val()
            };

            if (me.id !== me.$root.find('.in-id').asNumber()) {
                me.refresh(args);
                return;
            }

            return me.http
                .ajax({
                    args: args,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounts/GetPayRevenueAccountDetailContent'
                })
                .done(function (response) {
                    me.controls.payments.hide().html(response.Data).show();
                    toggleUpdateButton(me);
                    updateTotal(me);
                    return response;
                });
        },
        getFile: function (data) {
            gmgps.cloud.utility
                .buildForm('Accounting/GetPayRevenueFileStream', {
                    HistoryEventId: data
                })
                .submit()
                .remove();
        }
    };

    function getFormData($root, id) {
        var data = {
            BranchId: $root.find('.in-branchid').val(),
            AccountId: id,
            ProcessDate: $root.find('.in-processdate').val(),
            QuarterEndDate: $root.find('.in-quarter').val(),
            landlordBalances: getSelectedBalances($root),
            PaymentMethodId: $root.find('.in-paymentmethod').val(),
            PaymentReference: $root.find('.in-bankreference').val()
        };
        return data;
    }
    function getSelectedBalances($root) {
        var result = [];

        $root.find('tr.item-row').each(function (i, el) {
            var $el = $(el);

            var itemVal = new Decimal($el.data('allocated'));

            var $check = $el.find('.in-balances-id:checked:not(:disabled)');

            if ($check.length === 1 || itemVal.lt(0)) {
                result.push({
                    Id: $el.data('id'),
                    Allocated: itemVal.toFixed(2),
                    VersionNumber: $el.data('version')
                });
            }
        });

        return result;
    }

    function updateMinDate(me, value) {
        var minDate;
        if (value) {
            var dateComponents = value.split('/');
            minDate = moment(
                [dateComponents[2], dateComponents[1], dateComponents[0]].join(
                    '-'
                )
            ).add(1, 'days');
            if (minDate.isAfter()) {
                minDate = moment();
            }
        } else {
            minDate = moment();
        }
        var selectedDate = me.controls.processDate.datepicker('getDate');

        me.controls.processDate.datepicker(
            'option',
            'minDate',
            minDate.toDate()
        );
        if (minDate.isAfter(selectedDate)) {
            showInfo(
                'The process date has been updated to {0}. You can change this to a later date.'.format(
                    minDate.format('DD/MM/YYYY')
                )
            );
        }
    }

    function updateTotal(me) {
        var total = new Decimal(0);

        $.each(getSelectedBalances(me.$root), function (i, o) {
            total = total.add(o.Allocated);
        });

        me.controls.total.val(total.toFixed(2));
    }
    function toggleUpdateButton(me) {
        var hasItemsToUpdate = getSelectedBalances(me.$root).length > 0;
        if (hasItemsToUpdate) {
            me.controls.updateButton.prop('disabled', false);
        } else {
            me.controls.updateButton.prop('disabled', true);
        }
    }
}))();
