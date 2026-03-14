/**
 * E-sign feature plugin for Letter Template Editor
 * Handles all e-sign checkbox functionality, menu items, and toolbar controls
 * @global tinymce
 */
// Ensure the namespace exists before attaching the e-sign module
// The main letterTemplateEditor file should load first and define the function,
// but we ensure the namespace chain exists just in case
if (typeof gmgps === 'undefined') {
    window.gmgps = {};
}
if (typeof gmgps.cloud === 'undefined') {
    gmgps.cloud = {};
}
if (typeof gmgps.cloud.ui === 'undefined') {
    gmgps.cloud.ui = {};
}
if (typeof gmgps.cloud.ui.views === 'undefined') {
    gmgps.cloud.ui.views = {};
}

gmgps.cloud.ui.views.letterTemplateEditor.esign = {
    /**
     * Initialize the e-sign plugin for TinyMCE editor
     * @param {Object} config - Configuration object
     * @param {Object} config.editor - TinyMCE editor instance
     * @param {Object} config.me - Reference to the letter template editor instance (optional for document mode)
     * @param {String} config.mode - Mode: 'template' (editable) or 'document' (read-only info markers)
     */
    init: function(config) {
        var editor = config.editor;
        var me = config.me;
        var mode = config.mode || 'template'; // Default to template mode for backward compatibility
        var isDocumentMode = mode === 'document';
        
        
        // Mapping system to store menu items and their onAction handlers
        // This allows us to manually trigger menu actions after stopping click propagation
        // Key: menu item text or identifier, Value: onAction handler function
        var menuItemActionMap = new Map();
        
        // Helper function to generate a unique key for a menu item
        var getMenuItemKey = function(menuText, itemText) {
            return menuText + '::' + itemText;
        };
        
        // Helper function to find and trigger a menu item's action
        var triggerMenuItemAction = function(menuText, itemText) {
            var key = getMenuItemKey(menuText, itemText);
            var handler = menuItemActionMap.get(key);
            if (handler) {
                try {
                    handler();
                } catch (e) {
                    // Error triggering menu item action
                }
            }
        };
        
        // Helper function to update toolbar button text after action
        var updateToolbarButtonText = function(buttonName, newText) {
            try {
                // Try to find button in DOM and update text directly
                var docs = [];
                if (window.parent && window.parent.document) {
                    try {
                        docs.push(window.parent.document);
                    } catch (e) {
                        // Cross-origin, skip
                    }
                }
                docs.push(document);
                
                for (var i = 0; i < docs.length; i++) {
                    var doc = docs[i];
                    var $button = null;
                    
                    if (typeof $ !== 'undefined') {
                        // Find button by data attribute
                        $button = $(doc).find('[data-mce-name="' + buttonName + '"]');
                        
                        if ($button.length > 0) {
                            // Update button text
                            var $buttonText = $button.find('.tox-button__label, .tox-mbtn__select-label');
                            if ($buttonText.length > 0) {
                                $buttonText.text(newText);
                                return;
                            } else {
                                // Try updating button directly
                                $button.text(newText);
                                return;
                            }
                        }
                    }
                }
            } catch (e) {
                // Error updating button text
            }
        };
        
        // Helper function to detect if target is a toolbar button (Required/Optional/Delete)
        // Returns the button name if found, or null otherwise
        var detectToolbarButton = function(target, $target) {
            var buttonNames = ['esign-required', 'esign-optional', 'esign-delete-table'];
            var selector = buttonNames.map(function(name) {
                return '[data-mce-name="' + name + '"]';
            }).join(', ');
            
            if ($target && $target.length > 0) {
                var $button = $target.closest(selector);
                if ($button.length > 0) {
                    return $button.attr('data-mce-name');
                }
            }
            
            return null;
        };
        
        // Storage for button API references from onSetup callbacks
        // These are the actual button instances that we can use to update states directly
        var buttonApis = {
            required: null,
            optional: null
        };
        
        // Helper function to explicitly update Required/Optional button states
        var updateButtonStatesExplicitly = function() {
            try {
                var $checkbox = getESignTableFromSelection();
                if ($checkbox.length > 0) {
                    var currentRequired = $checkbox.attr('data-required') === 'true';
                    
                    // Use stored button API references to update states directly
                    // Use requestAnimationFrame to ensure TinyMCE UI is ready
                    requestAnimationFrame(function() {
                        try {
                            // Use stored button APIs from onSetup callbacks
                            if (buttonApis.required && typeof buttonApis.required.setActive === 'function') {
                                buttonApis.required.setActive(currentRequired);
                            }
                            
                            if (buttonApis.optional && typeof buttonApis.optional.setActive === 'function') {
                                buttonApis.optional.setActive(!currentRequired);
                            }
                        } catch (err) {
                            // Error calling setActive
                        }
                    });
                }
            } catch (err) {
                // Error updating button states
            }
        };
        
        // Helper function to find and hide the context toolbar DOM element
        // This is used when the toolbar needs to be forcefully hidden (e.g., after table deletion)
        var hideContextToolbar = function() {
            try {
                var $toolbar = null;
                var docs = [];
                
                // Build list of documents to search (parent first, then current)
                if (window.parent && window.parent.document) {
                    try {
                        docs.push(window.parent.document);
                    } catch (e) {
                        // Cross-origin, skip
                    }
                }
                docs.push(document);
                
                // Find toolbar by searching for buttons inside it
                var buttonSelectors = [
                    '[data-mce-name="esign-delete-table"]',
                    '[data-mce-name="esign-required"]',
                    '[data-mce-name="esign-optional"]',
                    '[data-mce-name="esign-signer-role"]',
                    '[data-mce-name="esign-signer-name"]'
                ];
                
                for (var docIdx = 0; docIdx < docs.length && (!$toolbar || $toolbar.length === 0); docIdx++) {
                    var docToSearch = docs[docIdx];
                    for (var btnIdx = 0; btnIdx < buttonSelectors.length && (!$toolbar || $toolbar.length === 0); btnIdx++) {
                        try {
                            var $button = $(docToSearch).find(buttonSelectors[btnIdx]);
                            if ($button.length > 0) {
                                // Find the parent .tox-pop that contains this button
                                $toolbar = $button.closest('.tox-pop');
                                if ($toolbar.length > 0) {
                                    break;
                                }
                            }
                        } catch (e) {
                            // Error finding by button
                        }
                    }
                }
                
                if ($toolbar && $toolbar.length > 0) {
                    // Remove the toolbar element from DOM
                    $toolbar.remove();
                }
            } catch (err) {
                // Error hiding toolbar
            }
        };

        // Helper function to close any open custom dropdown menus
        // This is used when other toolbar buttons are clicked to ensure dropdowns close
        var closeOpenDropdownMenus = function() {
            var docs = [];

            // Build list of documents to search (parent first, then current)
            if (window.parent && window.parent.document) {
                docs.push(window.parent.document);
            }
            docs.push(document);

            // Find and close any open custom dropdown menus
            for (var docIdx = 0; docIdx < docs.length; docIdx++) {
                var docToSearch = docs[docIdx];
                
                // Find active menu buttons for our custom dropdowns and close them
                // This works by finding menu buttons that are in an expanded state
                var $menuButton = $(docToSearch).find('[data-mce-name="esign-signer-name"], [data-mce-name="esign-signer-role"], [data-mce-name="esign-duplicate"]')
                .filter('.tox-mbtn--active, [aria-expanded="true"]');
                
                if ($menuButton.length > 0) {
                    // Trigger a click on the menu button to toggle it closed
                    // Use mousedown and click to ensure it closes
                    $menuButton.trigger('mousedown').trigger('click');
                }
            }
        };
        
        // Intercept clicks and mousedown events on TinyMCE dropdown menus to prevent toolbar from closing
        // TinyMCE UI is rendered in the parent window (not the editor iframe), so we need to intercept there
        var eventInterceptor = function(e) {
            var target = e.target;
            // Use jQuery if available, otherwise use native DOM
            var $target = typeof $ !== 'undefined' ? $(target) : null;
            var menu, menuItem;
            
            // Check if click is on a toolbar button (Required/Optional/Delete)
            var buttonName = detectToolbarButton(target, $target);
            
            if (buttonName) {
                if (e.type === 'mousedown') {
                    // Stop mousedown propagation to prevent TinyMCE from seeing it as outside click
                    // This prevents toolbar from closing when clicking buttons
                    e.stopPropagation();
                    // Close any open dropdown menus
                    closeOpenDropdownMenus();
                    return;
                }
                // For click events, close any open dropdown menus
                closeOpenDropdownMenus();
                return;
            }
            
            // Check if click is within a TinyMCE menu
            if ($target && $target.length > 0) {
                menu = $target.closest('.tox-menu');
                if (menu.length > 0) {
                    menuItem = $target.closest('.tox-menu-item');
                }
            }
            
            if (menu && menuItem) {
                // Extract menu item text from target element
                var menuItemText = target && target.textContent ? target.textContent.trim() : '';
                
                if (!menuItemText) return;
                
                // Check if this menu item exists in our action map (identifies custom dropdowns)
                // Try all known menu types to find which one this belongs to
                var menuButtonText = '';
                var menuTypes = ['Duplicate', 'Assign to', 'Signer Name'];
                
                for (var i = 0; i < menuTypes.length; i++) {
                    var key = getMenuItemKey(menuTypes[i], menuItemText);
                    if (menuItemActionMap.has(key)) {
                        menuButtonText = menuTypes[i];
                        break;
                    }
                }
                
                // If found in action map, it's one of our custom dropdowns
                if (menuButtonText) {
                    if (e.type === 'mousedown') {
                        // For mousedown: stop immediately in capture phase to prevent TinyMCE from seeing it
                        e.stopPropagation();
                    }
                    else if (e.type === 'click') {
                        // Stop click in capture phase to prevent TinyMCE from seeing it as outside click
                        // Then manually trigger menu action and immediately re-show toolbar
                        
                        // Stop propagation to prevent TinyMCE's click-outside handler
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        // Manually trigger the menu item's action
                        triggerMenuItemAction(menuButtonText, menuItemText);
                        
                        // Update toolbar button text based on selected item
                        if (menuButtonText === 'Assign to') {
                            // Capitalize first letter for display
                            var roleText = menuItemText.charAt(0).toUpperCase() + menuItemText.slice(1);
                            updateToolbarButtonText('esign-signer-role', roleText);
                        } else if (menuButtonText === 'Duplicate') {
                            updateToolbarButtonText('esign-duplicate', menuItemText);
                        } else if (menuButtonText === 'Signer Name') {
                            updateToolbarButtonText('esign-signer-name', menuItemText);
                        }
                    }
                }
            }
        };
        
        // Attach interceptors to both current window and parent window (for iframe scenarios)
        // TinyMCE's UI is typically rendered in the parent window
        var attachInterceptor = function(win) {
            if (win && win.document && win.document.addEventListener) {
                // Capture phase: stop mousedown and click
                win.document.addEventListener('mousedown', eventInterceptor, true);
                win.document.addEventListener('click', eventInterceptor, true);
            }
        };
        
        // Attach to current window
        attachInterceptor(window);
        
        // Also attach to parent window if it exists and is different (iframe scenario)
        if (window.parent && window.parent !== window) {
            try {
                attachInterceptor(window.parent);
            } catch (e) {
                // Could not attach interceptor to parent window (cross-origin?)
            }
        }
        
        const CSS_DISABLED = {
            'pointer-events': 'auto',
            'user-select': 'none',
            '-webkit-user-select': 'none',
            '-moz-user-select': 'none',
            '-ms-user-select': 'none'
        };
        
        const CSS_ENABLED = {
            'pointer-events': 'auto',
            'user-select': 'auto',
            '-webkit-user-select': 'auto',
            '-moz-user-select': 'auto',
            '-ms-user-select': 'auto'
        };
        
        // Helper function to make first cell non-editable
        var makeFirstCellNonEditable = function($cell) {
            if ($cell.length === 0) return;
            
            // Check if this is a textbox cell
            var $textbox = $cell.find('div.esign-textbox');
            var isTextBoxCell = $textbox.length > 0;
            
            if (!$cell.hasClass('esign-table-cell')) {
                $cell.addClass('mceNonEditable esign-table-cell');
            }
            $cell[0].setAttribute('contenteditable', 'false');
            $cell[0].setAttribute('tabindex', '-1');
            $cell.css(CSS_DISABLED);
            
            // Make checkbox elements unclickable
            var $checkboxElements = $cell.find('.esign-cell-wrapper, .esign-checkbox, .esign-tag-hidden');
            if ($checkboxElements.length > 0) {
                $checkboxElements.css('pointer-events', 'none');
            }
            
            // For textboxes: set pointer-events to none by default to avoid blocking resize handles
            // Click handler will handle table selection instead
            if (isTextBoxCell) {
                $textbox.css('pointer-events', 'none');
                // Make hidden tag unclickable
                var $textboxTag = $cell.find('span.esign-tag-hidden');
                if ($textboxTag.length > 0) {
                    $textboxTag.css('pointer-events', 'none');
                }
            } else {
                // For non-textbox cells, make textbox elements unclickable
                var $textboxElements = $cell.find('div.esign-textbox, .esign-tag-hidden');
                if ($textboxElements.length > 0) {
                    $textboxElements.css('pointer-events', 'none');
                }
            }
        };
        
        // Helper function to make second cell editable
        var makeSecondCellEditable = function($cell) {
            if ($cell.length === 0) return;
            
            $cell.removeClass('mceNonEditable');
            $cell[0].setAttribute('contenteditable', 'true');
            $cell.css(CSS_ENABLED);
        };
        
        // Helper function to restore a cell to editable state
        var restoreCell = function($cell) {
            if ($cell.length === 0) return;
            
            $cell.removeClass('mceNonEditable esign-table-cell');
            $cell[0].removeAttribute('contenteditable');
            $cell[0].removeAttribute('tabindex');
            $cell.css(CSS_ENABLED);
            
            // Restore checkbox elements if any
            var $checkboxElements = $cell.find('.esign-cell-wrapper, .esign-checkbox, .esign-tag-hidden');
            if ($checkboxElements.length > 0) {
                $checkboxElements.css('pointer-events', 'auto');
            }
            
            // Restore textbox elements if any
            var $textboxElements = $cell.find('div.esign-textbox, .esign-tag-hidden');
            if ($textboxElements.length > 0) {
                $textboxElements.css('pointer-events', 'auto');
            }
        };
        
        // Helper function to check if a table is an e-sign checkbox table
        var isESignCheckbox = function($table) {
            if ($table.length === 0) {
                return false;
            }

            var hasCheckboxClass = $table.hasClass('signature-block');
            var hasCheckboxType = $table.attr('data-esign-type') === 'checkbox';

            if (!hasCheckboxClass && !hasCheckboxType) {
                return false;
            }
            return $table.find('div.esign-checkbox[data-esign-table="true"]').length > 0;
        };
        
        // Helper function to check if a table is an e-sign text box table
        var isESignTextBox = function($table) {
            if ($table.length === 0) {
                return false;
            }

            var hasTextBoxClass = $table.hasClass('signature-block-textbox');
            var hasTextBoxType = $table.attr('data-esign-type') === 'textbox';
            if (!hasTextBoxClass && !hasTextBoxType) {
                return false;
            }
            return $table.find('div.esign-textbox[data-esign-textbox="true"]').length > 0;
        };
                
        // Setup focus prevention handler
        var setupFocusPrevention = function($body) {
            var preventFirstCellFocus = function(e) {
                var target = e.target || e.srcElement;
                var $target = $(target);
                
                // Do not interfere with TinyMCE resize handles or table controls
                if ($target.hasClass('mce-resize-handle') || 
                    $target.closest('.mce-resize-handle').length > 0 ||
                    $target.hasClass('mce-table-resize-handle') ||
                    $target.closest('.mce-table-resize-handle').length > 0) {
                    return true;
                }
                
                var $cell = $target.closest('td.esign-table-cell');
                
                if ($cell.length > 0) {
                    // Check if this is a textbox cell allow selection for toolbar
                    var $textbox = $cell.find('div.esign-textbox');
                    if ($textbox.length > 0) {
                        return true;
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    var $row = $cell.closest('tr');
                    var $secondCell = $row.find('td').eq(1);
                    if ($secondCell.length > 0) {
                        setTimeout(function() {
                            editor.selection.select($secondCell[0], true);
                            editor.selection.collapse(true);
                        }, 0);
                    }
                    return false;
                }
            };
            
            // Remove existing handlers before attaching to prevent duplicates
            $body.off('mousedown.esign-prevent-focus click.esign-prevent-focus focusin.esign-prevent-focus')
                 .on('mousedown.esign-prevent-focus click.esign-prevent-focus focusin.esign-prevent-focus', preventFirstCellFocus);
        };
        
        // Process a single e-sign row
        var processESignRow = function($row) {
            var $firstCell = $row.find('td').first();
            var $secondCell = $row.find('td').eq(1);
            
            // Mark row as processed if not already
            if (!$row.hasClass('esign-noneditable-row')) {
                $row.addClass('esign-noneditable-row');
            }
            
            // Lock first column and enable second column
            makeFirstCellNonEditable($firstCell);
            makeSecondCellEditable($secondCell);
        };
        
        // Process a single e-sign text box row (single cell)
        var processESignTextBoxRow = function($row) {
            var $cell = $row.find('td').first();
            
            // Mark row as processed if not already
            if (!$row.hasClass('esign-noneditable-row')) {
                $row.addClass('esign-noneditable-row');
            }
            
            // Make cell non-editable but ensure textarea remains editable
            makeFirstCellNonEditable($cell);
        };
        
        // Function to make e-sign table rows non-editable (only first column)
        // Make sure to only process rows that are within e-sign table tables
        // This is to avoid processing parent table rows that are not e-sign table tables
        var makeESignRowsNonEditable = function() {
            var $body = $(editor.getBody());
            
            // Make parent table rows editable (exclude both signature-block and signature-block-textbox)
            $body.find('tr.esign-noneditable-row').not('table.signature-block tr, table.signature-block-textbox tr').each(function() {
                var $row = $(this);
                $row.removeClass('esign-noneditable-row');
                restoreCell($row.find('td').first());
            });
            
            // Find all e-sign checkbox tables and get their rows
            var $esignCheckboxes = $body.find('table.signature-block, table[data-esign-type="checkbox"]').filter(function() {
                return isESignCheckbox($(this));
            });
            var $esignCheckBoxRows = $esignCheckboxes.find('> tbody > tr');
            
            // Find all e-sign textbox tables and get their rows 
            var $esignTextBoxTables = $body.find('table.signature-block-textbox, table[data-esign-type="textbox"]').filter(function() {
                return isESignTextBox($(this));
            });
            var $esignTextBoxRows = $esignTextBoxTables.find('> tbody > tr');
            
            // Setup focus prevention handler
            setupFocusPrevention($body);
            
            // Process each e-sign checkbox row
            $esignCheckBoxRows.each(function() {
                processESignRow($(this));
            });
            
            // Process each e-sign textbox row
            $esignTextBoxRows.each(function() {
                processESignTextBoxRow($(this));
            });
        };
        
        // Function to insert e-sign checkbox with default values
        var openESignCheckbox = function() {
            // Use default values
            var signerRole = 'landlord';
            var required = 'false'; // optional by default
            var duplicate = 'false'; // assign to one by default

            // Generate unique identifier for this newly inserted table
            var uniqueInsertId = 'esign-' + Date.now() + '-' + Math.random().toString(36);

            // Insert checkbox div with data attributes and hidden signer tag inside it
            // The tag will be resolved to {{1}}, {{2}}, etc. at document render time
            // Tag is positioned absolutely inside the div in white text at 4px
            // Wrapped in a table structure to allow users to type text in the second cell
            // The styles are inline to stop duplication in the document.css and publisher.less
            var checkboxHtml = '<table class="signature-block" data-esign-type="checkbox" data-esign-insert-id="' + uniqueInsertId + '" border="0" width="100%">' +
                '<colgroup>' +
                '<col style="width: 5.3%;">' +
                '<col style="width: 94.7%;">' +
                '</colgroup>' +
                '<tbody>' +
                '<tr class="esign-noneditable-row">' +
                '<td class="esign-table-cell"><span class="esign-cell-wrapper" style="position:relative;display:inline-block;vertical-align:middle;">' +
                '<div class="esign-checkbox" ' +
                'data-esign-table="true" ' +
                'data-esign-checkbox="true" ' +
                `data-signer-role="${signerRole}"` +
                `data-required="${required}"` +
                `data-duplicate="${duplicate}"` +
                'style="width:15px !important;height:15px !important;position:relative !important;z-index:1 !important;margin:0;padding:0;border:1px solid #000 !important;background-color:#fff !important;box-sizing:border-box !important;border-radius:2px !important;">' +
                '<span class="esign-tag-hidden" style="position:absolute;left:0;top:4.5px;color:white !important;font-size:4px !important;white-space:nowrap;pointer-events:none;z-index:0;line-height:4px;">{{S}}</span>' +
                '</div>' +
                '</span></td>' +
                '<td>&nbsp;</td>' +
                '</tr>' +
                '</tbody>' +
                '</table>';
            
            editor.insertContent(checkboxHtml);
            
            // After insertion, make the row non-editable and show context toolbar
            setTimeout(function() {
                makeESignRowsNonEditable();
                
                // Find the inserted table using the unique identifier
                var $body = $(editor.getBody());
                var $insertedTable = $body.find(`table[data-esign-insert-id="${uniqueInsertId}"]`);
                
                if ($insertedTable.length > 0) {
                    // Find the editable cell (second <td>) within the table
                    var $editableCell = $insertedTable.find('tr.esign-noneditable-row td').not('.esign-table-cell').first();
                    if ($editableCell.length > 0) {
                        // Select the editable cell instead of the table to avoid triggering default table toolbar
                        editor.selection.select($editableCell[0], true);
                        // Trigger nodeChanged to show context toolbar
                        editor.nodeChanged();
                        
                        // Remove the temporary identifier to keep DOM clean
                        $insertedTable.removeAttr('data-esign-insert-id');
                    }
                }
            }, 100);
        };
        
        // Function to insert e-sign text box with default values
        var openESignTextBox = function() {
            // Use default values
            var signerRole = 'landlord';
            var required = 'false'; // optional by default
            var duplicate = 'false'; // assign to one by default

            // Generate unique identifier for this newly inserted table
            var uniqueInsertId = 'esign-' + Date.now() + '-' + Math.random().toString(36);

            // Insert div with data attributes and hidden signer tag
            // The tag will be resolved to {{1}}, {{2}}, etc. at document render time
            // Tag is positioned absolutely inside the cell in white text at 4px
            // Wrapped in a single-cell table structure
            // Default: 100% width (100), small default height percentage (will be recalculated on insertion)
            // The styles are inline to stop duplication in the document.css and publisher.less
            var defaultWidth = 100; // percentage out of 100
            var defaultHeight = 1; 
            var lineHeight = 1.5; // line-height multiplier
            var fontSize = 12; // default font size in pixels
            var defaultHeightPx = Math.round(defaultHeight * fontSize * lineHeight);
            
            var textboxHtml = `<table class="signature-block-textbox" data-esign-type="textbox" data-esign-insert-id="${uniqueInsertId}" width="100%" style="margin-top:4px;margin-bottom:4px;margin-right:4px;height:${defaultHeightPx}px !important; border:1px solid #000000;">` +
                '<tbody>' +
                `<tr class="esign-noneditable-row" style="height:${defaultHeightPx}px !important;">` +
                `<td class="esign-table-cell" style="position:relative;padding:0;height:${defaultHeightPx}px !important;vertical-align:top;border:none;">` +
                '<span class="esign-cell-wrapper">' +
                '<div class="esign-textbox" ' +
                'data-esign-textbox="true" ' +
                `data-signer-role="${signerRole}"` +
                `data-required="${required}"` +
                `data-duplicate="${duplicate}"` +
                `data-width="${defaultWidth}"` +
                `data-height="${defaultHeight}"` +
                'style="width:100% !important;height:100% !important;position:relative !important;z-index:1">' +
                '</div>' +
                '<span class="esign-tag-hidden" style="position:absolute;left:2px;top:2px;color:white !important;font-size:4px !important;pointer-events:none;line-height:4px;">{{S}}</span>' +
                '</span>' +
                '</td>' +
                '</tr>' +
                '</tbody>' +
                '</table>';
            
            editor.insertContent(textboxHtml);
            
            // After insertion, make the row non-editable and show context toolbar
            setTimeout(function() {
                makeESignRowsNonEditable();
                
                // Find the inserted table using the unique identifier
                var $body = $(editor.getBody());
                var $insertedTable = $body.find(`table[data-esign-insert-id="${uniqueInsertId}"]`);
                
                if ($insertedTable.length > 0) {
                    // Calculate and update the textbox dimensions based on actual position
                    // This ensures correct width percentage even if inserted inside a smaller parent element
                    updateTextBoxDimensions($insertedTable);
                    
                    var $textbox = $insertedTable.find('div.esign-textbox');
                    if ($textbox.length > 0) {                        
                        // Select the textbox div to show context toolbar
                        editor.selection.select($textbox[0], true);
                        // Trigger nodeChanged to show context toolbar
                        editor.nodeChanged();
                        
                        // Remove the temporary identifier to keep DOM clean
                        $insertedTable.removeAttr('data-esign-insert-id');
                    }
                }
            }, 100);
        };

        // Function to register e-sign menu items (only in template mode)
        var registerESignItems = function() {
            // Only register menu items in template mode
            if (isDocumentMode) {
                return;
            }
            
            // Remove existing items if they exist
            try {
                editor.ui.registry.removeMenuItem('esigncheckbox');
            } catch(e) {
                // Item doesn't exist, ignore
            }

            // Register E-sign Checkbox
            editor.ui.registry.addMenuItem('esigncheckbox', {
                text: 'Checkbox',
                icon: 'selected',
                onSetup: function (api) {
                    // Show when e-sign is enabled
                    var isESignEnabled = false;
                    if (me && me.isESignEnabled) {
                        isESignEnabled = me.isESignEnabled();
                    } else {
                        // Fallback: check hidden field directly
                        var hiddenField = me ? me.$root.find('input[name="Template.ESignEnabled"][type="hidden"]') : $('input[name="Template.ESignEnabled"][type="hidden"]');
                        if (hiddenField.length > 0) {
                            var hiddenValue = hiddenField.val();
                            isESignEnabled = hiddenValue === 'true' || hiddenValue === 'True';
                        }
                    }
                    api.setEnabled(isESignEnabled);
                    // Return function to update when state changes
                    return function () {
                        var currentState = false;
                        if (me && me.isESignEnabled) {
                            currentState = me.isESignEnabled();
                        } else {
                            var hiddenField = me ? me.$root.find('input[name="Template.ESignEnabled"][type="hidden"]') : $('input[name="Template.ESignEnabled"][type="hidden"]');
                            if (hiddenField.length > 0) {
                                var hiddenValue = hiddenField.val();
                                currentState = hiddenValue === 'true' || hiddenValue === 'True';
                            }
                        }
                        api.setEnabled(currentState);
                    };
                },
                onAction: function () {
                    openESignCheckbox();
                }
            });
            
            // Remove existing textbox item if it exists
            try {
                editor.ui.registry.removeMenuItem('esigntextbox');
            } catch(e) {
                // Item doesn't exist, ignore
            }

            // Register E-sign Text Box
            editor.ui.registry.addMenuItem('esigntextbox', {
                text: 'Text Box',
                icon: 'text-color',
                onSetup: function (api) {
                    // Show when e-sign is enabled
                    var isESignEnabled = false;
                    if (me && me.isESignEnabled) {
                        isESignEnabled = me.isESignEnabled();
                    } else {
                        // Fallback: check hidden field directly
                        var hiddenField = me ? me.$root.find('input[name="Template.ESignEnabled"][type="hidden"]') : $('input[name="Template.ESignEnabled"][type="hidden"]');
                        if (hiddenField.length > 0) {
                            var hiddenValue = hiddenField.val();
                            isESignEnabled = hiddenValue === 'true' || hiddenValue === 'True';
                        }
                    }
                    api.setEnabled(isESignEnabled);
                    // Return function to update when state changes
                    return function () {
                        var currentState = false;
                        if (me && me.isESignEnabled) {
                            currentState = me.isESignEnabled();
                        } else {
                            var hiddenField = me ? me.$root.find('input[name="Template.ESignEnabled"][type="hidden"]') : $('input[name="Template.ESignEnabled"][type="hidden"]');
                            if (hiddenField.length > 0) {
                                var hiddenValue = hiddenField.val();
                                currentState = hiddenValue === 'true' || hiddenValue === 'True';
                            }
                        }
                        api.setEnabled(currentState);
                    };
                },
                onAction: function () {
                    openESignTextBox();
                }
            });
        };

        // Helper function to get checkbox or textbox from current selection
        var getESignTableFromSelection = function() {
            var node = editor.selection.getNode();
            var $node = $(node);
            var $table = $node.closest('table');
            
            if ($table.length === 0 && node.nodeName === 'TABLE') {
                $table = $(node);
            }
            
            if ($table.length > 0) {
                // First try to find checkbox
                var $checkbox = $table.find('div.esign-checkbox[data-esign-table="true"]').first();
                if ($checkbox.length > 0) {
                    return $checkbox;
                }
                
                // Then try to find textbox
                var $textbox = $table.find('div.esign-textbox[data-esign-textbox="true"]').first();
                if ($textbox.length > 0) {
                    return $textbox;
                }
            }
            
            return $();
        };
        
        // Helper function to update signer tag in hidden span for both checkbox and textbox elements
        var updateSignerTagInHiddenSpan = function($element, signerIndex) {
            if ($element.length === 0) {
                return;
            }
            
            // Detect element type
            var isCheckbox = $element.attr('data-esign-checkbox') === 'true';
            var isTextBox = $element.attr('data-esign-textbox') === 'true';
            
            // Find hidden span based on element type
            // For checkboxes the span is inside the div/ for textboxes the span is in the cell
            var $hiddenSpan = isCheckbox
                ? $element.find('span.esign-tag-hidden')
                : $element.closest('td').find('span.esign-tag-hidden');
            
            if ($hiddenSpan.length === 0) {
                return;
            }
            
            var currentText = $hiddenSpan.text();
            var newText = currentText;
            
            if (isCheckbox) {
                // Checkbox format = {{1}} or {{1|x}}
                // Only replace the signer index number preserve the |x flag if present
                newText = currentText.replace(/\{\{(\d+)(\|x)?\}\}/g, function(match, number, requiredFlag) {
                    return '{{' + signerIndex + (requiredFlag || '') + '}}';
                });
            } else if (isTextBox) {
                // Textbox format = {{T:request-text|R:false|W:30|H:3|SIDX:1}}
                // Only replace the SIDX value preserve everything else
                newText = currentText.replace(/SIDX:(\d+)/g, 'SIDX:' + signerIndex);
            }
            
            $hiddenSpan.text(newText);
        };
        
        // Helper function to update required flag in hidden span for both checkbox and textbox elements
        var updateRequiredFlagInHiddenSpan = function($element, isRequired) {
            if ($element.length === 0) {
                return;
            }
            
            // Detect element type
            var isCheckbox = $element.attr('data-esign-checkbox') === 'true';
            var isTextBox = $element.attr('data-esign-textbox') === 'true';
            
            // Find hidden span based on element type
            // For checkboxes the span is inside the div/ for textboxes the span is in the cell
            var $hiddenSpan = isCheckbox
                ? $element.find('span.esign-tag-hidden')
                : $element.closest('td').find('span.esign-tag-hidden');
            
            if ($hiddenSpan.length === 0) {
                return;
            }
            
            var currentText = $hiddenSpan.text();
            var newText = currentText;
            
            if (isCheckbox) {
                // Checkbox format = {{1}} or {{1|x}}
                // Add or remove the |x flag based on isRequired
                newText = currentText.replace(/\{\{(\d+)(\|x)?\}\}/g, function(match, number) {
                    if (isRequired) {
                        // Add |x flag if not present
                        return '{{' + number + '|x}}';
                    } else {
                        // Remove |x flag if present
                        return '{{' + number + '}}';
                    }
                });
            } else if (isTextBox) {
                // Textbox format = {{T:request-text|R:false|W:30|H:3|SIDX:1}}
                // Update R:true or R:false value
                var requiredValue = isRequired ? 'true' : 'false';
                newText = currentText.replace(/R:(true|false)/g, 'R:' + requiredValue);
            }
            
            $hiddenSpan.text(newText);
        };
        
        // Register signer name/role button - read-only in document mode, editable in template mode
        if (isDocumentMode) {
            // Document mode: Menu button with signer options dropdown if data-signer-options exists, otherwise read-only
            editor.ui.registry.addMenuButton('esign-signer-name', {
                text: 'Signer Name',
                fetch: function (callback) {
                    var $element = getESignTableFromSelection();
                    if ($element.length === 0) {
                        callback([]);
                        return;
                    }
                    
                    // Check if we have signer options (multiple signees)
                    var base64Json = $element.attr('data-signer-options');
                    if (base64Json) {
                        // Decode and parse the signer options
                        try {
                            var signerOptionsJson = atob(base64Json);
                            var signerOptions = JSON.parse(signerOptionsJson);

                            if (Array.isArray(signerOptions) && signerOptions.length > 0) {
                                // Create menu items from signer options
                                // Note: JSON properties are PascalCase (Name, SignerIndex) from C#
                                var items = signerOptions.map(function(option) {
                                    // Get property values (handle both PascalCase and camelCase)
                                    var signerName = option.Name || option.name;
                                    var signerIndex = option.SignerIndex || option.signerIndex;
                                    
                                    // Create the onAction handler
                                    var actionHandler = function() {
                                        try {
                                            // Update data-signer-name
                                            $element.attr('data-signer-name', signerName);
                                            
                                            // Update the signer tag in hidden span using helper function
                                            updateSignerTagInHiddenSpan($element, signerIndex);
                                            
                                            // Trigger editor change to mark as dirty
                                            editor.dispatch('change');
                                            
                                            // Update toolbar button text
                                            updateToolbarButtonText('esign-signer-name', signerName);
                                        } catch (e) {
                                            // Error in signer name action
                                        }
                                    };
                                    
                                    // Store handler in map for manual triggering
                                    var menuKey = getMenuItemKey('Signer Name', signerName);
                                    menuItemActionMap.set(menuKey, actionHandler);
                                    
                                    return {
                                        type: 'menuitem',
                                        text: signerName,
                                        onAction: actionHandler
                                    };
                                });
                                
                                callback(items);
                                return;
                            }
                        } catch (e) {
                            // Error parsing signer options
                        }
                    }
                    
                    // No dropdown options available, return empty (button will be read-only)
                    callback([]);
                },
                onSetup: function (api) {
                    var $element = getESignTableFromSelection();
                    if ($element.length > 0) {
                        var signerName = $element.attr('data-signer-name') || 'Unknown';
                        var hasOptions = $element.attr('data-signer-options') != null;
                        
                        // Enable if we have signer options (for dropdown), otherwise disable (read-only)
                        api.setEnabled(hasOptions);
                        // Update button text to show signer name
                        api.setText(signerName);
                    } else {
                        api.setText('Signer Name');
                    }
                    return function () {};
                }
            });
        } else {
            // Template mode: Editable signer role menu button
            editor.ui.registry.addMenuButton('esign-signer-role', {
                text: 'Assign to',
                fetch: function (callback) {
                    var items = [
                        { text: 'Landlord', value: 'landlord' },
                        { text: 'Vendor', value: 'vendor' },
                        { text: 'Tenant', value: 'tenant' },
                        { text: 'Guarantor', value: 'guarantor' }
                    ].map(function(item) {
                        // Create the onAction handler
                        var actionHandler = function() {
                            try {
                                var $element = getESignTableFromSelection();
                                
                                if ($element.length > 0) {
                                    // Then do the actual work
                                    $element.attr('data-signer-role', item.value);
                                    editor.dispatch('change');
                                    
                                    // Update toolbar button text
                                    var roleText = item.text.charAt(0).toUpperCase() + item.text.slice(1);
                                    updateToolbarButtonText('esign-signer-role', roleText);
                                }
                            } catch (e) {
                                // Error in signer role action
                            }
                        };
                        
                        // Store handler in map for manual triggering
                        var menuKey = getMenuItemKey('Assign to', item.text);
                        menuItemActionMap.set(menuKey, actionHandler);

                        return {
                            type: 'menuitem',
                            text: item.text,
                            onAction: actionHandler
                        };
                    });
                    
                    callback(items);
                },
                onSetup: function (api) {
                    var $element = getESignTableFromSelection();
                    if ($element.length > 0) {
                        var currentRole = $element.attr('data-signer-role') || 'landlord';
                        // Capitalize first letter for display
                        var roleText = currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
                        // Update button text to show current role
                        api.setText(roleText);
                    } else {
                        api.setText('Signer Role');
                    }
                    return function () {};
                }
            });
        }

        // Register duplicate dropdown only in template mode
        if (!isDocumentMode) {
            // Template mode: Editable signer role menu button
            editor.ui.registry.addMenuButton('esign-duplicate', {
                text: 'Duplicate',
                fetch: function (callback) {
                    var items = [
                        { text: 'Assign to one', value: 'false' },
                        { text: 'Assign to all', value: 'true' }
                    ].map(function(item) {
                        // Create the onAction handler
                        var actionHandler = function() {
                            try {
                                var $element = getESignTableFromSelection();
                                
                                if ($element.length > 0) {
                                    // Then do the actual work
                                    $element.attr('data-duplicate', item.value);
                                    editor.dispatch('change');
                                    
                                    // Update toolbar button text
                                    updateToolbarButtonText('esign-duplicate', item.text);
                                }
                            } catch (e) {
                                // Error in duplicate action
                            }
                        };
                        
                        // Store handler in map for manual triggering
                        var menuKey = getMenuItemKey('Duplicate', item.text);
                        menuItemActionMap.set(menuKey, actionHandler);
                        
                        return {
                            type: 'menuitem',
                            text: item.text,
                            onAction: actionHandler
                        };
                    });
                    
                    callback(items);
                },
                onSetup: function (api) {
                    var $element = getESignTableFromSelection();
                    if ($element.length > 0) {
                        var currentDuplicate = $element.attr('data-duplicate') || 'false';
                        // Map value to text
                        var duplicateText = currentDuplicate === 'true' ? 'Assign to all' : 'Assign to one';
                        api.setEnabled(true);
                        // Update button text to show current duplicate setting
                        api.setText(duplicateText);
                    } else {
                        api.setEnabled(false);
                        api.setText('Duplicate');
                    }
                    return function () {};
                }
            });
        }

        // Register required/ optional button needs to update the tag
        if (isDocumentMode) {
            // Required button
            editor.ui.registry.addToggleButton('esign-required', {
                text: 'Required',
                onAction: function () {
                    var $element = getESignTableFromSelection();
                    if ($element.length > 0) {
                        var element = $element[0];
                        // Update the element attribute to required
                        editor.dom.setAttrib(element, 'data-required', 'true');
                        
                        // Update the required flag in hidden span using helper function
                        updateRequiredFlagInHiddenSpan($element, true);
                        
                        // Save the editor content to persist the change
                        editor.save();
                        // Fire change event to mark as dirty
                        editor.dispatch('change');
                        // Refresh the toolbar to update both buttons' states
                        // Restore selection to element to force onSetup callbacks
                        editor.selection.select(element);
                        
                        setTimeout(function() {
                            updateButtonStatesExplicitly();
                        }, 10);
                    }
                },
                onSetup: function (api) {
                    // Store API reference for direct state updates
                    buttonApis.required = api;
                    var $checkbox = getESignTableFromSelection();
                    if ($checkbox.length > 0) {
                        var currentRequired = $checkbox.attr('data-required') === 'true';
                        // Required button is active when data-required is 'true'
                        api.setActive(currentRequired);
                        api.setEnabled(true);
                    } else {
                        api.setEnabled(false);
                    }
                    return function () {};
                }
            });
            
            // Optional button
            editor.ui.registry.addToggleButton('esign-optional', {
                text: 'Optional',
                onAction: function () {
                    var $element = getESignTableFromSelection();
                    if ($element.length > 0) {
                        var element = $element[0];
                        // Update the element attribute to not required
                        editor.dom.setAttrib(element, 'data-required', 'false');
                        
                        // Update the required flag in hidden span using helper function
                        updateRequiredFlagInHiddenSpan($element, false);
                        
                        // Save the editor content to persist the change
                        editor.save();
                        // Fire change event to mark as dirty
                        editor.dispatch('change');
                        // Refresh the toolbar to update both buttons' states
                        // Restore selection to element to force onSetup callbacks
                        editor.selection.select(element);
                        
                        setTimeout(function() {
                            updateButtonStatesExplicitly();
                        }, 10);
                    }
                },
                onSetup: function (api) {
                    // Store API reference for direct state updates
                    buttonApis.optional = api;
                    var $checkbox = getESignTableFromSelection();
                    if ($checkbox.length > 0) {
                        var currentRequired = $checkbox.attr('data-required') === 'true';
                        var isActive = !currentRequired;
                        // Optional button is active when data-required is NOT 'true'
                        api.setActive(isActive);
                        api.setEnabled(true);
                    } else {
                        api.setEnabled(false);
                    }
                    return function () {};
                }
            });
        } else {
            // Template mode: Editable toggle buttons (Required and Optional)
            // Required button
            editor.ui.registry.addToggleButton('esign-required', {
                text: 'Required',
                onAction: function () {
                    var $element = getESignTableFromSelection();
                    if ($element.length > 0) {
                        var element = $element[0];
                        // Update the element attribute to required
                        editor.dom.setAttrib(element, 'data-required', 'true');
                        // Save the editor content to persist the change
                        editor.save();
                        // Fire change event to mark as dirty
                        editor.dispatch('change');
                        // Refresh the toolbar to update both buttons' states
                        // Restore selection to element to force onSetup callbacks
                        editor.selection.select(element);
                        
                        setTimeout(function() {
                            updateButtonStatesExplicitly();
                        }, 10);
                    }
                },
                onSetup: function (api) {
                    // Store API reference for direct state updates
                    buttonApis.required = api;
                    var $element = getESignTableFromSelection();
                    if ($element.length > 0) {
                        var currentRequired = $element.attr('data-required') === 'true';
                        // Required button is active when data-required is 'true'
                        api.setActive(currentRequired);
                        api.setEnabled(true);
                    } else {
                        api.setEnabled(false);
                    }
                    return function () {};
                }
            });
            
            // Optional button
            editor.ui.registry.addToggleButton('esign-optional', {
                text: 'Optional',
                onAction: function () {
                    var $element = getESignTableFromSelection();
                    if ($element.length > 0) {
                        var element = $element[0];
                        // Update the element attribute to not required
                        editor.dom.setAttrib(element, 'data-required', 'false');
                        // Save the editor content to persist the change
                        editor.save();
                        // Fire change event to mark as dirty
                        editor.dispatch('change');
                        // Refresh the toolbar to update both buttons' states
                        // Restore selection to element to force onSetup callbacks
                        editor.selection.select(element);
                        
                        setTimeout(function() {
                            updateButtonStatesExplicitly();
                        }, 10);
                    }
                },
                onSetup: function (api) {
                    // Store API reference for direct state updates
                    buttonApis.optional = api;
                    var $element = getESignTableFromSelection();
                    if ($element.length > 0) {
                        var currentRequired = $element.attr('data-required') === 'true';
                        var isActive = !currentRequired;
                        // Optional button is active when data-required is NOT 'true'
                        api.setActive(isActive);
                        api.setEnabled(true);
                    } else {
                        api.setEnabled(false);
                    }
                    return function () {};
                }
            });
        }

        // Register delete table button for e-sign checkbox tables
        editor.ui.registry.addButton('esign-delete-table', {
            tooltip: 'Delete',
            icon: 'remove',
            onAction: function () {
                var node = editor.selection.getNode();
                var $node = $(node);
                var $table = $node.closest('table');
                
                if ($table.length === 0 && node.nodeName === 'TABLE') {
                    $table = $(node);
                }
                
                if ($table.length > 0) {
                    var tableElement = $table[0];
                    
                    // Remove the table directly without selecting it (to avoid triggering default toolbar)
                    editor.dom.remove(tableElement);
                                        
                    // Fire change event to mark as dirty
                    editor.dispatch('change');
                                                
                    hideContextToolbar();
                }
            }
        });

        // Helper function to find the actual e-sign table (not parent tables)
        // Only returns a table if the selection is DIRECTLY within an e-sign table
        var findESignTable = function($node) {
            // First, find the closest table
            var $table = $node.closest('table');
            
            if ($table.length === 0 && $node.length > 0 && $node[0].nodeName === 'TABLE') {
                $table = $node;
            }
            
            if ($table.length > 0) {
                // Check for checkbox table
                if (isESignCheckbox($table)) {
                    // Check if it directly contains an e-sign checkbox (not in a nested table)
                    var $checkbox = $table.find('div.esign-checkbox[data-esign-table="true"]').first();
                    if ($checkbox.length > 0) {
                        // Check if the checkbox is in a nested table
                        var $checkboxTable = $checkbox.closest('table');
                        // If the checkbox's table is the same as the current table, it's directly within it
                        if ($checkboxTable.length > 0 && $checkboxTable[0] === $table[0]) {
                            return $table;
                        }
                    }
                }
                
                // Check for textbox table
                if (isESignTextBox($table)) {
                    // Check if it directly contains an e-sign textbox (not in a nested table)
                    var $textbox = $table.find('div.esign-textbox[data-esign-textbox="true"]').first();
                    if ($textbox.length > 0) {
                        // Check if the textbox is in a nested table
                        var $textboxTable = $textbox.closest('table');
                        // If the textbox's table is the same as the current table, it's directly within it
                        if ($textboxTable.length > 0 && $textboxTable[0] === $table[0]) {
                            return $table;
                        }
                    }
                }
            }
            
            // If the closest table is not an e-sign table return empty
            // This prevents the toolbar from showing when selecting parent tables
            return $();
        };

        // Register separator SVG icon pipe | 
        editor.ui.registry.addIcon('esign-separator', 
            '<svg width="2" height="20" viewBox="0 0 2 20" xmlns="http://www.w3.org/2000/svg">' +
            '<line x1="1" y1="0" x2="1" y2="20" stroke="#E6E5E9" stroke-width="2"/>' +
            '</svg>'
        );

        // Register separator button for toolbar
        // Has to be a button due to TinyMCE's context toolbar implementation
        editor.ui.registry.addButton('esign-separator', {
            icon: 'esign-separator',
            enabled: true,
            onAction: function() {
                // Separator is not clickable - do nothing
                return;
            },
            onSetup: function(api) {
                // Keep button enabled but style it as non-interactive separator
                api.setEnabled(true);
                
                // Apply styles to separator button
                // call immediately then use requestAnimationFrame as fallback
                // This minimizes flicker by applying styles as soon as possible
                var applyStyles = function() {
                    try {
                        // TinyMCE UI is rendered in parent document (iframe scenario)
                        var docToSearch = null;
                        if (window.parent && window.parent.document) {
                            try {
                                docToSearch = window.parent.document;
                            } catch (e) {
                                // Cross-origin, cannot access parent document
                                return;
                            }
                        } else {
                            // No parent window, use current document as fallback
                            docToSearch = document;
                        }
                        
                        var $button = $(docToSearch).find('[data-mce-name="esign-separator"]');
                        
                        if ($button.length > 0) {
                            // Disable pointer events and cursor
                            $button.css({
                                'cursor': 'default',
                                'pointer-events': 'none',
                            });
                            
                            // Remove disabled styling
                            $button.removeClass('tox-tbtn--disabled');
                        }
                    } catch (e) {
                        // Error applying styles
                    }
                };
                
                applyStyles();
                requestAnimationFrame(applyStyles);
                
                return function() {};
            }
        });

        // Register custom context toolbar for e-sign table tables
        editor.ui.registry.addContextToolbar('esign-table-toolbar', {
            // Determines if the toolbar should be shown 
            predicate: function (node) {
                // Check if the node is a table or within a table
                var $node = $(node);
                var $esignTable = findESignTable($node);
                
                // Only show toolbar if we found an actual e-sign table
                return $esignTable.length > 0;
            },
            items: isDocumentMode ? 'esign-signer-name esign-duplicate esign-separator esign-required esign-optional esign-separator esign-delete-table' : 'esign-signer-role esign-duplicate esign-separator esign-required esign-optional esign-separator esign-delete-table',
            scope: 'node',
            position: 'node',
            onHide: function() {
            },
        });

        // function to calculate and update textbox width/height data attributes
        // Width: percentage out of 100 (0-100)
        // Height: percentage out of 100 (0-100) - height of boundary box of the field in percentage
        var updateTextBoxDimensions = function($table) {
            if ($table.length === 0) {
                return;
            }
            

            if (!isESignTextBox($table)) {
                return;
            }
            var $textbox = $table.find('div.esign-textbox[data-esign-textbox="true"]');
            if ($textbox.length === 0) {
                 return;
            }
            
            // Ensure textbox div fills the cell height
            $textbox.css('height', '100%');
                
            // Get the table's width
            var tableWidthPx = $table[0].offsetWidth;
                
            // Get document width (CSS width property set on body via updatePageSize)
            // This is the actual document width, not the container width
            var $body = $(editor.getBody());
            var bodyComputedStyle = window.getComputedStyle($body[0]);
            var documentWidthPx = parseFloat(bodyComputedStyle.width) || $body.width();
                
            // Calculate width as percentage out of 100 based on document width
            var widthPercent = Math.round((tableWidthPx / documentWidthPx) * 100);            
            // Clamp between 0 and 100
            widthPercent = Math.max(0, Math.min(100, widthPercent));
                
            // Get the table height (this is the actual rendered height)
            var tableHeightPx = $table[0].offsetHeight;
                
            // Get document height (scrollHeight or offsetHeight of body)
            // Use scrollHeight to get full content height, or offsetHeight for visible height
            var documentHeightPx = $body[0].scrollHeight || $body[0].offsetHeight || parseFloat(bodyComputedStyle.height) || $body.height();
                
            // Calculate height as percentage out of 100 based on document height
            // Height represents the boundary box of the field as a percentage
            var heightPercent = Math.round((tableHeightPx / documentHeightPx) * 100);
            // Clamp between 0 and 100
            heightPercent = Math.max(0, Math.min(100, heightPercent));
            // Update data attributes
            $textbox.attr('data-width', widthPercent);
            $textbox.attr('data-height', heightPercent);
                
            // Trigger change event to mark as dirty
            editor.dispatch('change');
        };
        
        // Register items on editor init
        editor.on('init', function() {
            registerESignItems();
            // Store function for later updates (only in template mode)
            if (me && me.registerESignMenuItems) {
                me.registerESignMenuItems = registerESignItems;
            }
            // Apply initial CSS state (only in template mode)
            if (me && me.updateESignMenuItemsVisibility) {
                me.updateESignMenuItemsVisibility();
            }
            // Make existing e-sign rows non-editable
            setTimeout(function() {
                makeESignRowsNonEditable();
            }, 200);
        });
        
        // Make e-sign rows non-editable when content changes (SetContent fires on paste, undo, etc.)
        editor.on('SetContent', function() {
            setTimeout(function() {
                makeESignRowsNonEditable();
            }, 50);
        });
        
        // Listen for table resize events TinyMCE fires ObjectResized event when table is resized
        editor.on('ObjectResized', function(e) {
            if (e.target && e.target.nodeName === 'TABLE') {
                var $table = $(e.target);
                if (isESignTextBox($table)) {
                    setTimeout(function() {
                        // Ensure border is maintained after resize TinyMCE removes it
                        $table.css('border', '1px solid #000000');
                        updateTextBoxDimensions($table);
                    }, 10);
                }
            }
        });
    }
};

