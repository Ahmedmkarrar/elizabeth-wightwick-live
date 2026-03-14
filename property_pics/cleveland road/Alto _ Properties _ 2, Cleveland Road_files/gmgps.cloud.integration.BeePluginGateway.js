'use strict';

gmgps.cloud.integration.BeePluginGateway = function (document, args) {
    var bee = null;
    var uid = args.uid;
    var roleHash = args.roleHash;
    var templateId = args.templateId;
    var beeTemplateId;
    var onSave = args.onSave;
    var onChange = args.onChange;
    var onLoad = args.onLoad;
    var http =
        args.http || new gmgps.cloud.http("BeePluginGateway-BeePluginGateway");
    var populateMergeCodes = args.populateMergeCodes || false;
    var containerId = args.containerId;
    var helpUrl = args.helpUrl;
    var previousHeight = 0;

    function loadScript(id, url, callback) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.id = id;
        script.src = url;

        // Several events for cross browser compatibility.
        script.onreadystatechange = callback;
        script.onload = callback;

        // Appending the element will trigger the script load
        document.head.appendChild(script);
    }

    function showWarning(title, message, displayAlert) {
        if (displayAlert && typeof showDialog === 'function') {
            showDialog({
                type: 'warning',
                title: title,
                msg: message,
                buttons: {
                    OK: function () {
                        $(this).dialog('close');
                        return false;
                    }
                }
            });
        }
        console.warn(title + ': ' + message);
    }

    function saveCallback(json, html) {
        if (typeof onSave === 'function') {
            onSave(json, html, beeTemplateId);
        } else {
            showWarning('Save Template', 'Unable to save email template', true);
        }
    }

    function changeCallback() {
        if (typeof onChange === 'function') {
            onChange();
        } else {
            showWarning('Changed Template', 'Email template modified', false);
        }
    }

    function loadedCallback() {
        if (typeof onLoad === 'function') {
            onLoad();
        }
    }

    function saveRequest() {
        bee.save();
    }

    function setBeeTemplateId(id) {
        if (typeof id === 'number' && isFinite(id) && Math.floor(id) === id) {
            beeTemplateId = id;
        }
    }

    function getBeePluginAccessToken() {
        var deferred = Q.defer();

        http.ajax(
            {
                args: {
                    uid: uid
                },
                background: true,
                complex: false,
                dataType: 'json',
                type: 'post',
                silentError: true,
                url: '/BeePlugin/GetAccessToken'
            },
            function (response) {
                if (!response.Data) {
                    deferred.resolve(true);
                } else {
                    deferred.resolve(JSON.parse(response.Data));
                }
            }
        );

        return deferred.promise;
    }

    function getBeePluginTemplate(id) {
        var deferred = Q.defer();

        http.ajax(
            {
                args: {
                    documentTemplateId: id,
                    populateMergeCodes: populateMergeCodes
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                silentError: true,
                url: '/BeePlugin/GetBeePluginTemplate'
            },
            function (response) {
                if (!response.Data) {
                    deferred.resolve(defaultTemplate);
                } else {
                    beeTemplateId = response.Data.Id;
                    deferred.resolve(JSON.parse(response.Data.Content));
                }
            },
            function () {
                deferred.reject(defaultTemplate);
            }
        );

        return deferred.promise;
    }

    function loadTemplate(id, subject = '') {
        if (subject) {
            document.getElementById("Subject").value = subject;
        }
        
        $.when(getBeePluginTemplate(id)).done(function (template) {
            bee.load(template);
        });
    }

    function loadEditor() {
        $.when(
            getBeePluginAccessToken(),
            getBeePluginTemplate(templateId)
        ).done(function (token, t) {
            document.getElementById(containerId).innerHTML = '';
            console.debug('creating BeePlugin...');
            try {
                BeePlugin.create(
                    token,
                    beeConfig,
                    function (beePluginInstance) {
                        console.debug('created');
                        bee = beePluginInstance;
                        bee.start(t);
                        setupToolbar();
                    }
                );
            } catch (e) {
                console.error(e);
                showWarning(
                    'Email Editor',
                    'Unable to load the editor at this time.',
                    true
                );
            }
        });
    }

    function loadSnippet() {
        if (typeof BeePlugin === 'object') {
            loadEditor();
        } else {
            loadScript(
                'be-snippet',
                'https://app-rsrc.getbee.io/plugin/BeePlugin.js',
                loadEditor
            );
        }
    }

    function toggleFullscreen() {
        if ($('#bee-container').hasClass('be-fullscreen')) {
            $('#bee-container').removeClass('be-fullscreen');
            $('#' + containerId).css('height', previousHeight + 'px');
            $('#' + containerId + ' iframe').css(
                'height',
                previousHeight + 'px'
            );
        } else {
            previousHeight = $('#' + containerId + ' iframe').height();
            $('#bee-container').addClass('be-fullscreen');
            var beeToolbarHeight = $('#bee-plugin-toolbar').height();
            $('#' + containerId).css(
                'height',
                'calc(100vh - ' + beeToolbarHeight + 'px)'
            );
            $('#' + containerId + ' iframe').css(
                'height',
                'calc(100vh - ' + beeToolbarHeight + 'px)'
            );
        }
    }

    function exitFullscreen() {
        if ($('#bee-container').hasClass('be-fullscreen')) {
            $('#bee-container').removeClass('be-fullscreen');
            $('#' + containerId).css('height', previousHeight + 'px');
            $('#' + containerId + ' iframe').css(
                'height',
                previousHeight + 'px'
            );
        }
    }

    function bindEscExitFullscreen(e) {
        if (e.key == 'Escape') {
            exitFullscreen();
        }
    }

    function toggleStructure() {
        bee.toggleStructure();
        if ($('.be-structure-on').hasClass('hidden')) {
            $('.be-structure-on').removeClass('hidden');
            $('.be-structure-off').addClass('hidden');
        } else {
            $('.be-structure-on').addClass('hidden');
            $('.be-structure-off').removeClass('hidden');
        }
    }

    function setupToolbar() {
        previousHeight = $('#' + containerId + ' iframe').height();
        $('.be-structure-on').removeClass('hidden');
        $('.be-structure-off').addClass('hidden');

        $('#be-button-preview').on('click', function () {
            bee.togglePreview();
        });
        $('#be-button-show-structure').on('click', toggleStructure);
        $('#be-button-fullscreen').on('click', toggleFullscreen);
        $(document).on('keyup', bindEscExitFullscreen);
        $('#be-button-help').on('click', function () {
            window.open(helpUrl, '_blank');
        });
    }

    var beeConfig = {
        uid: uid,
        roleHash: roleHash,
        container: containerId,
        trackChanges: true,
        onSave: saveCallback,
        onChange: changeCallback,
        onLoad: loadedCallback
    };

    var defaultTemplate = {
        page: {
            rows: [
                {
                    columns: [
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            class: 'center fixedwidth',
                                            width: 187.5
                                        },
                                        image: {
                                            alt: 'Image',
                                            href: 'https://beefree.io',
                                            src: 'img/placeholder_logo_3.png'
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '10px',
                                            'padding-top': '10px',
                                            'padding-left': '10px',
                                            width: '100%'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-image'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '0px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '5px',
                                'background-color': 'transparent',
                                'padding-top': '5px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 6
                        },
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        divider: {
                                            style: {
                                                'border-top':
                                                    '0px solid transparent',
                                                width: '100%',
                                                height: '36px'
                                            }
                                        },
                                        style: {
                                            'padding-bottom': '0px',
                                            'padding-right': '0px',
                                            'padding-top': '0px',
                                            'padding-left': '0px'
                                        },
                                        computedStyle: {
                                            hideContentOnMobile: true,
                                            align: 'center'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-divider'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '20px',
                                            'padding-right': '5px',
                                            'padding-top': '0px',
                                            'padding-left': '5px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" style="font-size: 12px; line-height: 18px; font-family: Arial, &quot;Helvetica Neue&quot;, Helvetica, sans-serif;" data-mce-style="font-size: 12px; line-height: 18px; font-family: Arial, &quot;Helvetica Neue&quot;, Helvetica, sans-serif;">\n<p style="font-size: 18px; line-height: 27px; text-align: center;" data-mce-style="font-size: 18px; line-height: 27px; text-align: center;"><span style="font-size: 15px; line-height: 22px;" data-mce-style="font-size: 15px; line-height: 22px;"><strong><span style="line-height: 22px; font-size: 15px;" data-mce-style="line-height: 22px; font-size: 15px;"><span style="line-height: 22px; font-size: 15px;" data-mce-style="line-height: 22px; font-size: 15px;">Time for great email design</span></span></strong ></span ></p >\n</div > ',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#7c4b96',
                                                'line-height': '150%',
                                                'font-family':
                                                    "Arial, 'Helvetica Neue', Helvetica, sans-serif"
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '0px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '5px',
                                'background-color': 'transparent',
                                'padding-top': '5px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 6
                        }
                    ],
                    locked: false,
                    container: {
                        style: {
                            'background-color': '#E5E5E5',
                            'background-repeat': 'no-repeat',
                            'background-image': 'none',
                            'background-position': 'top left'
                        }
                    },
                    content: {
                        computedStyle: {
                            rowColStackOnMobile: true
                        },
                        style: {
                            'background-position': 'top left',
                            'background-repeat': 'no-repeat',
                            color: '#333',
                            'background-image': 'none',
                            'background-color': 'transparent',
                            width: '500px'
                        }
                    },
                    type: 'two-columns-empty'
                },
                {
                    columns: [
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        divider: {
                                            style: {
                                                'border-top':
                                                    '0px solid transparent',
                                                width: '100%',
                                                height: '10px'
                                            }
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '10px',
                                            'padding-top': '10px',
                                            'padding-left': '10px'
                                        },
                                        computedStyle: {
                                            hideContentOnMobile: true,
                                            align: 'center'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-divider'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false,
                                            class: 'center  autowidth  fullwidth',
                                            width: 500
                                        },
                                        image: {
                                            alt: 'Image',
                                            href: '',
                                            src: 'img/placeholder_big_2.png'
                                        },
                                        style: {
                                            'padding-bottom': '0px',
                                            'padding-right': '0px',
                                            'padding-top': '0px',
                                            'padding-left': '0px',
                                            width: '100%'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-image'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        divider: {
                                            style: {
                                                'border-top':
                                                    '0px solid transparent',
                                                width: '100%',
                                                height: '10px'
                                            }
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '10px',
                                            'padding-top': '10px',
                                            'padding-left': '10px'
                                        },
                                        computedStyle: {
                                            hideContentOnMobile: true,
                                            align: 'center'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-divider'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '0px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '0px',
                                'background-color': 'transparent',
                                'padding-top': '0px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 12
                        }
                    ],
                    locked: false,
                    container: {
                        style: {
                            'background-color': '#f3f3f3',
                            'background-repeat': 'no-repeat',
                            'background-image': 'none',
                            'background-position': 'top left'
                        }
                    },
                    content: {
                        computedStyle: {
                            rowColStackOnMobile: true
                        },
                        style: {
                            'background-position': 'top left',
                            'background-repeat': 'no-repeat',
                            color: '#000000',
                            'background-image': 'none',
                            'background-color': 'transparent',
                            width: '500px'
                        }
                    },
                    type: 'one-column-empty'
                },
                {
                    columns: [
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        divider: {
                                            style: {
                                                'border-top':
                                                    '10px solid transparent',
                                                width: '100%',
                                                height: '0px'
                                            }
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '10px',
                                            'padding-top': '10px',
                                            'padding-left': '10px'
                                        },
                                        computedStyle: {
                                            align: 'center'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-divider'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '0px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '5px',
                                'background-color': 'transparent',
                                'padding-top': '5px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 12
                        }
                    ],
                    locked: false,
                    container: {
                        style: {
                            'background-color': 'transparent',
                            'background-repeat': 'no-repeat',
                            'background-image': 'none',
                            'background-position': 'top left'
                        }
                    },
                    content: {
                        computedStyle: {
                            rowColStackOnMobile: true
                        },
                        style: {
                            'background-position': 'top left',
                            'background-repeat': 'no-repeat',
                            color: '#333',
                            'background-image': 'none',
                            'background-color': 'transparent',
                            width: '500px'
                        }
                    },
                    type: 'one-column-empty'
                },
                {
                    columns: [
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            class: 'center  autowidth ',
                                            width: 180
                                        },
                                        image: {
                                            alt: 'Image',
                                            href: 'https://beefree.io',
                                            src: 'img/placeholder_medium_1.png'
                                        },
                                        style: {
                                            'padding-bottom': '0px',
                                            'padding-right': '0px',
                                            'padding-top': '0px',
                                            'padding-left': '0px',
                                            width: '100%'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-image'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '0px',
                                            'padding-right': '0px',
                                            'padding-top': '15px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" style="font-size: 12px; line-height: 14px;" data-mce-style="font-size: 12px; line-height: 14px;">\n<p style="font-size: 14px; line-height: 16px; text-align: center;" data-mce-style="font-size: 14px; line-height: 16px; text-align: center;"><span style="font-size: 20px; line-height: 24px;" data-mce-style="font-size: 20px; line-height: 24px;"><strong><span style="line-height: 24px; font-size: 20px;" data-mce-style="line-height: 24px; font-size: 20px;">I\'m a very important title</span></strong></span></p>\n</div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#2C2C2C',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '5px',
                                            'padding-right': '0px',
                                            'padding-top': '5px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" data-mce-style="font-size: 12px; line-height: 14px;" style="font-size: 12px; line-height: 14px;"><p style="font-size: 14px; line-height: 16px; text-align: center;" data-mce-style="font-size: 14px; line-height: 16px; text-align: center;">I\'m a block of text and I like latin.</p></div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#aaaaaa',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '0px',
                                            'padding-top': '10px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" style="font-size: 12px; line-height: 14px;" data-mce-style="font-size: 12px; line-height: 14px;">\n<p style="font-size: 12px; line-height: 14px; text-align: center;" data-mce-style="font-size: 12px; line-height: 14px; text-align: center;"><a href="https://beefree.io" target="_blank" rel="noopener"><strong><span style="font-size: 14px; line-height: 16px;" data-mce-style="font-size: 14px; line-height: 16px;"><span style="text-decoration: underline; font-size: 14px; line-height: 16px;" data-mce-style="text-decoration: underline; font-size: 14px; line-height: 16px;">More info</span></span></strong></a></p>\n</div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#888888',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '0px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '20px',
                                'background-color': 'transparent',
                                'padding-top': '20px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 6
                        },
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            class: 'center  autowidth ',
                                            width: 180
                                        },
                                        image: {
                                            alt: 'Image',
                                            href: 'https://beefree.io',
                                            src: 'img/placeholder_medium_1.png'
                                        },
                                        style: {
                                            'padding-bottom': '0px',
                                            'padding-right': '0px',
                                            'padding-top': '0px',
                                            'padding-left': '0px',
                                            width: '100%'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-image'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '0px',
                                            'padding-right': '0px',
                                            'padding-top': '15px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" style="font-size: 12px; line-height: 14px;" data-mce-style="font-size: 12px; line-height: 14px;">\n<p style="font-size: 14px; line-height: 16px; text-align: center;" data-mce-style="font-size: 14px; line-height: 16px; text-align: center;"><span style="font-size: 20px; line-height: 24px;" data-mce-style="font-size: 20px; line-height: 24px;"><strong><span style="line-height: 24px; font-size: 20px;" data-mce-style="line-height: 24px; font-size: 20px;">I\'m a very important title</span></strong></span></p>\n</div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#2C2C2C',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '5px',
                                            'padding-right': '0px',
                                            'padding-top': '5px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" data-mce-style="font-size: 12px; line-height: 14px;" style="font-size: 12px; line-height: 14px;"><p style="font-size: 14px; line-height: 16px; text-align: center;" data-mce-style="font-size: 14px; line-height: 16px; text-align: center;">I\'m a block of text and I like latin.</p></div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#aaaaaa',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '0px',
                                            'padding-top': '10px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" style="font-size: 12px; line-height: 14px;" data-mce-style="font-size: 12px; line-height: 14px;">\n<p style="font-size: 12px; line-height: 14px; text-align: center;" data-mce-style="font-size: 12px; line-height: 14px; text-align: center;"><a href="https://beefree.io" target="_blank" rel="noopener"><strong><span style="font-size: 14px; line-height: 16px;" data-mce-style="font-size: 14px; line-height: 16px;"><span style="text-decoration: underline; font-size: 14px; line-height: 16px;" data-mce-style="text-decoration: underline; font-size: 14px; line-height: 16px;">More info</span></span></strong></a></p>\n</div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#888888',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '10px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '30px',
                                'background-color': 'transparent',
                                'padding-top': '20px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 6
                        }
                    ],
                    locked: false,
                    container: {
                        style: {
                            'background-color': 'transparent',
                            'background-repeat': 'no-repeat',
                            'background-image': 'none',
                            'background-position': 'top left'
                        }
                    },
                    content: {
                        computedStyle: {
                            rowColStackOnMobile: true
                        },
                        style: {
                            'background-position': 'top left',
                            'background-repeat': 'no-repeat',
                            color: '#333',
                            'background-image': 'none',
                            'background-color': 'transparent',
                            width: '500px'
                        }
                    },
                    type: 'two-columns-empty'
                },
                {
                    columns: [
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        divider: {
                                            style: {
                                                'border-top':
                                                    '1px solid #dddddd',
                                                width: '100%'
                                            }
                                        },
                                        style: {
                                            'padding-bottom': '20px',
                                            'padding-right': '10px',
                                            'padding-top': '10px',
                                            'padding-left': '10px'
                                        },
                                        computedStyle: {
                                            align: 'center'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-divider'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '0px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '5px',
                                'background-color': 'transparent',
                                'padding-top': '5px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 12
                        }
                    ],
                    locked: false,
                    container: {
                        style: {
                            'background-color': 'transparent',
                            'background-repeat': 'no-repeat',
                            'background-image': 'none',
                            'background-position': 'top left'
                        }
                    },
                    content: {
                        computedStyle: {
                            rowColStackOnMobile: true
                        },
                        style: {
                            'background-position': 'top left',
                            'background-repeat': 'no-repeat',
                            color: '#000000',
                            'background-image': 'none',
                            'background-color': 'transparent',
                            width: '500px'
                        }
                    },
                    type: 'one-column-empty'
                },
                {
                    columns: [
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            class: 'center  autowidth ',
                                            width: 180
                                        },
                                        image: {
                                            alt: 'Image',
                                            href: 'https://beefree.io',
                                            src: 'img/placeholder_medium_1.png'
                                        },
                                        style: {
                                            'padding-bottom': '0px',
                                            'padding-right': '0px',
                                            'padding-top': '0px',
                                            'padding-left': '0px',
                                            width: '100%'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-image'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '0px',
                                            'padding-right': '0px',
                                            'padding-top': '15px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" style="font-size: 12px; line-height: 14px;" data-mce-style="font-size: 12px; line-height: 14px;">\n<p style="font-size: 14px; line-height: 16px; text-align: center;" data-mce-style="font-size: 14px; line-height: 16px; text-align: center;"><span style="font-size: 20px; line-height: 24px;" data-mce-style="font-size: 20px; line-height: 24px;"><strong><span style="line-height: 24px; font-size: 20px;" data-mce-style="line-height: 24px; font-size: 20px;">I\'m a very important title</span></strong></span></p>\n</div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#2C2C2C',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '5px',
                                            'padding-right': '0px',
                                            'padding-top': '5px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" data-mce-style="font-size: 12px; line-height: 14px;" style="font-size: 12px; line-height: 14px;"><p style="font-size: 14px; line-height: 16px; text-align: center;" data-mce-style="font-size: 14px; line-height: 16px; text-align: center;">I\'m a block of text and I like latin.</p></div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#aaaaaa',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '0px',
                                            'padding-top': '10px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" style="font-size: 12px; line-height: 14px;" data-mce-style="font-size: 12px; line-height: 14px;">\n<p style="font-size: 12px; line-height: 14px; text-align: center;" data-mce-style="font-size: 12px; line-height: 14px; text-align: center;"><a href="https://beefree.io" target="_blank" rel="noopener"><strong><span style="font-size: 14px; line-height: 16px;" data-mce-style="font-size: 14px; line-height: 16px;"><span style="text-decoration: underline; font-size: 14px; line-height: 16px;" data-mce-style="text-decoration: underline; font-size: 14px; line-height: 16px;">More info</span></span></strong></a></p>\n</div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#888888',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '0px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '20px',
                                'background-color': 'transparent',
                                'padding-top': '20px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 6
                        },
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            class: 'center  autowidth ',
                                            width: 180
                                        },
                                        image: {
                                            alt: 'Image',
                                            href: 'https://beefree.io',
                                            src: 'img/placeholder_medium_1.png'
                                        },
                                        style: {
                                            'padding-bottom': '0px',
                                            'padding-right': '0px',
                                            'padding-top': '0px',
                                            'padding-left': '0px',
                                            width: '100%'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-image'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '0px',
                                            'padding-right': '0px',
                                            'padding-top': '15px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" style="font-size: 12px; line-height: 14px;" data-mce-style="font-size: 12px; line-height: 14px;">\n<p style="font-size: 14px; line-height: 16px; text-align: center;" data-mce-style="font-size: 14px; line-height: 16px; text-align: center;"><span style="font-size: 20px; line-height: 24px;" data-mce-style="font-size: 20px; line-height: 24px;"><strong><span style="line-height: 24px; font-size: 20px;" data-mce-style="line-height: 24px; font-size: 20px;">I\'m a very important title</span></strong></span></p>\n</div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#2C2C2C',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '5px',
                                            'padding-right': '0px',
                                            'padding-top': '5px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" data-mce-style="font-size: 12px; line-height: 14px;" style="font-size: 12px; line-height: 14px;"><p style="font-size: 14px; line-height: 16px; text-align: center;" data-mce-style="font-size: 14px; line-height: 16px; text-align: center;">I\'m a block of text and I like latin.</p></div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#aaaaaa',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '0px',
                                            'padding-top': '10px',
                                            'padding-left': '0px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" style="font-size: 12px; line-height: 14px;" data-mce-style="font-size: 12px; line-height: 14px;">\n<p style="font-size: 12px; line-height: 14px; text-align: center;" data-mce-style="font-size: 12px; line-height: 14px; text-align: center;"><a href="https://beefree.io" target="_blank" rel="noopener"><strong><span style="font-size: 14px; line-height: 16px;" data-mce-style="font-size: 14px; line-height: 16px;"><span style="text-decoration: underline; font-size: 14px; line-height: 16px;" data-mce-style="text-decoration: underline; font-size: 14px; line-height: 16px;">More info</span></span></strong></a></p>\n</div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#888888',
                                                'line-height': '120%',
                                                'font-family': 'inherit'
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '10px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '30px',
                                'background-color': 'transparent',
                                'padding-top': '20px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 6
                        }
                    ],
                    locked: false,
                    container: {
                        style: {
                            'background-color': 'transparent',
                            'background-repeat': 'no-repeat',
                            'background-image': 'none',
                            'background-position': 'top left'
                        }
                    },
                    content: {
                        computedStyle: {
                            rowColStackOnMobile: true
                        },
                        style: {
                            'background-position': 'top left',
                            'background-repeat': 'no-repeat',
                            color: '#333',
                            'background-image': 'none',
                            'background-color': 'transparent',
                            width: '500px'
                        }
                    },
                    type: 'two-columns-empty'
                },
                {
                    columns: [
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        divider: {
                                            style: {
                                                'border-top':
                                                    '10px solid transparent',
                                                width: '100%'
                                            }
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '10px',
                                            'padding-top': '10px',
                                            'padding-left': '10px'
                                        },
                                        computedStyle: {
                                            align: 'center'
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-divider'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '0px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '5px',
                                'background-color': 'transparent',
                                'padding-top': '5px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 12
                        }
                    ],
                    locked: false,
                    container: {
                        style: {
                            'background-color': 'transparent',
                            'background-repeat': 'no-repeat',
                            'background-image': 'none',
                            'background-position': 'top left'
                        }
                    },
                    content: {
                        computedStyle: {
                            rowColStackOnMobile: true
                        },
                        style: {
                            'background-position': 'top left',
                            'background-repeat': 'no-repeat',
                            color: '#333',
                            'background-image': 'none',
                            'background-color': 'transparent',
                            width: '500px'
                        }
                    },
                    type: 'one-column-empty'
                },
                {
                    columns: [
                        {
                            modules: [
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            iconsDefaultWidth: 32,
                                            padding: '0 5px 0 0',
                                            width: 151,
                                            height: 52
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '10px',
                                            'padding-top': '10px',
                                            'padding-left': '10px',
                                            'text-align': 'center'
                                        },
                                        iconsList: {
                                            icons: [
                                                {
                                                    name: 'facebook',
                                                    image: {
                                                        alt: 'Facebook',
                                                        prefix: 'https://www.facebook.com/',
                                                        src: 'repository_path/img/t-only-logo-white/facebook.png',
                                                        title: 'Facebook',
                                                        href: 'https://www.facebook.com/'
                                                    },
                                                    type: 'follow',
                                                    text: ''
                                                },
                                                {
                                                    name: 'twitter',
                                                    image: {
                                                        alt: 'Twitter',
                                                        prefix: 'http://twitter.com/',
                                                        src: 'repository_path/img/t-only-logo-white/twitter.png',
                                                        title: 'Twitter',
                                                        href: 'http://twitter.com/'
                                                    },
                                                    type: 'follow',
                                                    text: ''
                                                },
                                                {
                                                    name: 'instagram',
                                                    image: {
                                                        alt: 'Instagram',
                                                        prefix: 'https://instagram.com/',
                                                        src: 'repository_path/img/t-only-logo-white/instagram@2x.png',
                                                        title: 'Instagram',
                                                        href: 'https://instagram.com/'
                                                    },
                                                    type: 'follow',
                                                    text: ''
                                                }
                                            ]
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-social'
                                },
                                {
                                    locked: false,
                                    descriptor: {
                                        computedStyle: {
                                            hideContentOnMobile: false
                                        },
                                        style: {
                                            'padding-bottom': '10px',
                                            'padding-right': '10px',
                                            'padding-top': '10px',
                                            'padding-left': '10px'
                                        },
                                        text: {
                                            html: '<div class="txtTinyMce-wrapper" style="font-size: 12px; line-height: 14px; font-family: Arial, &quot;Helvetica Neue&quot;, Helvetica, sans-serif;" data-mce-style="font-size: 12px; line-height: 14px; font-family: Arial, &quot;Helvetica Neue&quot;, Helvetica, sans-serif;">\n<p style="font-size: 18px; line-height: 21px; text-align: center;" data-mce-style="font-size: 18px; line-height: 21px; text-align: center;"><span style="font-size: 13px; line-height: 15px;" data-mce-style="font-size: 13px; line-height: 15px;">This is a sample template from BEE free email editor</span><br><span style="font-size: 13px; line-height: 15px;" data-mce-style="font-size: 13px; line-height: 15px;">Visit <span style="text-decoration: underline; font-size: 13px; line-height: 15px;" data-mce-style="text-decoration: underline; font-size: 13px; line-height: 15px;"><span style="color: rgb(255, 255, 255); line-height: 15px; font-size: 13px; text-decoration: underline;" data-mce-style="color: rgb(255, 255, 255); line-height: 15px; font-size: 13px; text-decoration: underline;"><span style="line-height: 15px; font-size: 13px;" data-mce-style="line-height: 15px; font-size: 13px;"><a style="color: #ffffff; text-decoration: underline;" href="https://beefree.io" target="_blank" rel="noopener">beefree.io</a></span></span></span><span style="font-size: 13px; line-height: 15px;" data-mce-style="font-size: 13px; line-height: 15px;"><span style="color: rgb(255, 255, 255); line-height: 15px; font-size: 13px;" data-mce-style="color: rgb(255, 255, 255); line-height: 15px; font-size: 13px;">&nbsp;</span></span>to create beautiful and rich email messages at no cost.</span></p>\n</div>',
                                            computedStyle: {
                                                linkColor: '#7c4b96'
                                            },
                                            style: {
                                                color: '#bbbbbb',
                                                'line-height': '120%',
                                                'font-family':
                                                    "Arial, 'Helvetica Neue', Helvetica, sans-serif"
                                            }
                                        }
                                    },
                                    type: 'mailup-bee-newsletter-modules-text'
                                }
                            ],
                            style: {
                                'padding-right': '0px',
                                'border-left': '0px solid transparent',
                                'padding-left': '0px',
                                'border-top': '0px solid transparent',
                                'padding-bottom': '25px',
                                'background-color': 'transparent',
                                'padding-top': '25px',
                                'border-bottom': '0px solid transparent',
                                'border-right': '0px solid transparent'
                            },
                            'grid-columns': 12
                        }
                    ],
                    locked: false,
                    container: {
                        style: {
                            'background-color': '#2C2C2C',
                            'background-repeat': 'no-repeat',
                            'background-image': 'none',
                            'background-position': 'top left'
                        }
                    },
                    content: {
                        computedStyle: {
                            rowColStackOnMobile: true
                        },
                        style: {
                            'background-position': 'top left',
                            'background-repeat': 'no-repeat',
                            color: '#333',
                            'background-image': 'none',
                            'background-color': 'transparent',
                            width: '500px'
                        }
                    },
                    type: 'one-column-empty'
                }
            ],
            description: '',
            title: '',
            template: {
                name: 'template-base',
                type: 'basic',
                version: '2.0.0'
            },
            body: {
                webFonts: [],
                container: {
                    style: {
                        'background-color': '#FFFFFF'
                    }
                },
                content: {
                    computedStyle: {
                        messageWidth: '500px',
                        messageBackgroundColor: 'transparent',
                        linkColor: '#7c4b96'
                    },
                    style: {
                        color: '#000000',
                        'font-family':
                            "Arial, 'Helvetica Neue', Helvetica, sans-serif"
                    }
                },
                type: 'mailup-bee-page-properties'
            }
        }
    };

    return {
        load: loadSnippet,
        save: saveRequest,
        setBeeTemplateId: setBeeTemplateId,
        loadTemplate: loadTemplate
    };
};
