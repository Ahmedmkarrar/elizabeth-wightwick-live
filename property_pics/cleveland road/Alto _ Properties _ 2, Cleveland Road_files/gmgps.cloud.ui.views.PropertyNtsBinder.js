(function () {

    function PropertyNtsBinder(formRoot) {
        var _this = this;
        _this.root = formRoot;
        var bindStringList = function (stringList, root) {

            if (!stringList) return;

            if (stringList.length == 0) {
                stringList.push("");
            }

            var template = root.find('.template');

            var removeRow = function (row) {
                row.remove();

                root.find('.row .pm-button.minus').show();

                if (root.find('.row:not(.hidden)').length === 1) {
                    root.find('.row:last-child .pm-button.minus').hide();
                }

                root.find('.row:last-child .pm-button.plus').show();
            }

            var addRow = function (item) {

                var row = template.clone();
                row.removeAttr('id');
                row.removeClass('template');
                row.removeClass('hidden');

                var textbox = row.find('input');
                textbox.val(item);

                row.find('.pm-button.minus')
                    .on('click', function () {
                        removeRow(row);
                    });

                row.find('.pm-button.plus')
                    .on('click', function () {
                        addRow("");
                    });

                root.find('.pm-button.plus').hide();
                root.find('.pm-button.minus').show();
                row.find('.pm-button.plus').show();

                row.insertAfter(root.find('.row:last'));

                if (root.find('.row:not(.hidden)').length === 1) {
                    row.find('.pm-button.minus').hide();
                }
            }

            _.each(stringList, (item) => {
                addRow(item);
            });

        }

        var bindClassWithProperties = function (complexData, name, root) {

            _.forOwn(complexData, function (value, key) {
                if (!_.isNil(value)) {
                    root.find('div[data-nts-data="' + name + '.' + key + '"] select').val(value.toString()).trigger('mirror-change');
                }
            });

        }
        var bindList = function (values, root) {
            var template = root.find('.template');
            var max = parseInt(root.attr('data-max-items'));


            if (values == null) {
                values = [];
            }

            if (values.length == 0) {
                values.push("");
            }

            var removeRow = function (row) {
                row.remove();

                root.find('.row .pm-button.minus').show();

                if (root.find('.row:not(.hidden)').length === 1) {
                    root.find('.row:last-child .pm-button.minus').hide();
                }

                root.find('.row:last-child .pm-button.plus').show();
            }

            var addRow = function (value) {

                var row = template.clone();
                row.removeAttr('id');
                row.removeClass('template');
                row.removeClass('hidden');

                row.find('.pm-button.minus')
                    .on('click', function () {
                        removeRow(row);
                    });

                row.find('.pm-button.plus')
                    .on('click', function () {
                        addRow("");
                    });

                root.find('.pm-button.plus').hide();
                root.find('.pm-button.minus').show();

                row.insertAfter(root.find('.row:last'));

                var dropdown = row.find('select');
                dropdown.val(value.toString());
                dropdown.customSelect();

                if (root.find('.row:not(.hidden)').length === 1) {
                    row.find('.pm-button.minus').hide();
                }

                row.find('.pm-button.plus').show();
                if (root.find('.row:not(.hidden)').length === max) {
                    row.find('.pm-button.plus').hide();
                }
            }

            _.each(values, (value) => {
                addRow(value);
            });

        }
        _this.bind = function (json) {

            if (json.Error) {
                console.error(json.Error);
                return;
            }

            var nts = json.NtsFeatures;

            if (nts) {

                if (nts.AccessibilityRequirements) {
                    bindList(nts.AccessibilityRequirements.Accessibility, _this.root.find('[data-nts-data="AccessibilityRequirements"]'));
                }

                if (nts.FloodingRisks) {
                    if (nts.FloodingRisks.SourcesOfFlooding) {
                        bindList(nts.FloodingRisks.SourcesOfFlooding.Source || [], _this.root.find('[data-nts-data="FloodingRisks.SourcesOfFlooding"]'));
                    } else {
                        bindList([], _this.root.find('[data-nts-data="FloodingRisks.SourcesOfFlooding"]'));
                    }

                    if (nts.FloodingRisks.FloodedWithinLast5Years !== null) {
                        _this.root.find('select[name="PropertyNtsViewModel.NtsFeatures.FloodingRisks.FloodedWithinLast5Years"]').val(nts.FloodingRisks.FloodedWithinLast5Years.toString()).trigger('mirror-change');
                    }
                    if (nts.FloodingRisks.FloodDefensesPresent !== null) {
                        _this.root.find('select[name="PropertyNtsViewModel.NtsFeatures.FloodingRisks.FloodDefensesPresent"]').val(nts.FloodingRisks.FloodDefensesPresent.toString()).trigger('mirror-change');
                    }
                }

                if (nts.CoastalErosion !== null) {
                    _this.root.find('select[name="PropertyNtsViewModel.NtsFeatures.CoastalErosion"]').val(nts.CoastalErosion.toString()).trigger('mirror-change');
                }

                bindClassWithProperties(nts.Restrictions, 'Restrictions', _this.root.find('[data-nts-data="Restrictions"]'));

                bindClassWithProperties(nts.RightsAndEasements, 'RightsAndEasements', _this.root.find('[data-nts-data="RightsAndEasements"]'));

                if (nts.Construction) {
                    bindStringList(nts.Construction.Material, _this.root.find('[data-nts-data="Construction"]'));
                }

                if (nts.Parking) {
                    bindList(nts.Parking.ParkingType, _this.root.find('[data-nts-data="Parking"]'));
                }

                if (nts.Water) {
                    bindList(nts.Water.Supply, _this.root.find('[data-nts-data="Water"]'));
                }

                if (nts.Electricity) {
                    bindList(nts.Electricity.Supply, _this.root.find('[data-nts-data="Electricity"]'));
                }

                if (nts.Sewerage) {
                    bindList(nts.Sewerage.Supply, _this.root.find('[data-nts-data="Sewerage"]'));
                }

                if (nts.Heating) {
                    bindList(nts.Heating.Source, _this.root.find('[data-nts-data="Heating"]'));
                }

                if (nts.Broadband) {
                    bindList(nts.Broadband.Supply, _this.root.find('[data-nts-data="Broadband"]'));
                    _this.root.find(
                        '[data-nts-data="Broadband.Speed"] input:text[name="PropertyNtsViewModel.NtsFeatures.Broadband.Speed"]')
                        .val(nts.Broadband.Speed);
                }

                if (nts.MobileCoverage) {
                    _this.root.find('[data-nts-data="MobileCoverage"] textarea').val(nts.MobileCoverage);
                }

                if (nts.BuildingSafety) {
                    bindStringList(nts.BuildingSafety.Issue, _this.root.find('[data-nts-data="BuildingSafety"]'));
                }

                if (nts.KnownPlanningConsiderations) {
                    _this.root.find('[data-nts-data="KnownPlanningConsiderations"] textarea').val(nts.KnownPlanningConsiderations);
                }

                if (nts.MiningRisks) {
                    if (!_.isNil(nts.MiningRisks.Coalfields)) {
                        var miningSelector = _this.root.find('select[name="PropertyNtsViewModel.NtsFeatures.MiningRisks.Coalfields"]');
                        var mining = nts.MiningRisks.Coalfields.toString();
                        miningSelector.val(mining).trigger('mirror-change');
                    }

                    if (!_.isNil(nts.MiningRisks.OtherMiningActivities)) {
                        var otherMiningSelector = _this.root.find('select[name="PropertyNtsViewModel.NtsFeatures.MiningRisks.OtherMiningActivities"]');
                        var otherMining = nts.MiningRisks.OtherMiningActivities.toString();
                        otherMiningSelector.val(otherMining).trigger('mirror-change');
                    }
                }
            }
        }

    }

    gmgps.cloud.ui.views.PropertyNtsBinder = PropertyNtsBinder;
})()