    //const apex = function() {

    let _selectedTabId = 0;
    let _currentTabIndex = 0;
    const tabComponent = new Tab();
    const _grids = {};
    const _logNames = {};
    const DEFAULT_DATA_TYPE = "";
    const DEFAULT_CONTENT_TYPE = null;
    const EVENT_COLUMN_INDEX = 1;
    const USER_DEBUG = "USER_DEBUG";
    const POST = "post";

    //------------------------------------------------
    // Execute Anonymous
    //------------------------------------------------
    $("#apexArea #executeAnonymousBtn").on("click", (e) => {
        if ($.isAjaxBusy() || !$("#apexArea #apexCode").val()) {
            return false;
        }

        e.preventDefault();
        executeAnonymous();
    });

    export const executeAnonymous = () => {
        hideMessageArea();
        _selectedTabId = getActiveTabElementId();

        const debugOptions = {};
        $("#debugOptions option:selected").each(function() {
            const category = $(this).parent().attr("id");
            const level = $(this).val();
            debugOptions[category] = level;
        });

        const val = {code: $("#apexCode").val(), debug_options: debugOptions};
        const action = "/apex";
        const options = $.getAjaxOptions(action, POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
        const callbacks = $.getAjaxCallbacks(afterExecuteAnonymous, displayError, null);
        $.executeAjax(options, callbacks);
    };

    const afterExecuteAnonymous = (json) => {
        const elementId = " apexGrid" + _selectedTabId;
        _logNames[elementId] = json.logName;
        $("#logInfo" + _selectedTabId).html(getLogResult(json));

        if(_grids[elementId]){
            _grids[elementId].destroy();
        }

        _grids[elementId] = new GridTable(document.getElementById(elementId), json);
        };

        const getLogResult = (json) => {
        return json.logName + '&nbsp;&nbsp;<label><input type="checkbox" class="debug-only"/>&nbsp;Debug only</label>';
        }

    //------------------------------------------------
    // Filter debug only
    //------------------------------------------------
    $("#apexArea").on("click", "input.debug-only", function(e) {
        if ($(this).prop("checked")) {
            filterLog();
        } else {
            clearFilter();
        }
    });

    const filterLog = () => {
        const elementId = getActiveGridElementId();
        const hotElement = _grids[elementId];
        hotElement.filter(EVENT_COLUMN_INDEX,USER_DEBUG);
    };

    const clearFilter = () => {
        const elementId = getActiveGridElementId();
        const hotElement = _grids[elementId];
        hotElement.clearFilter();
    };

    //------------------------------------------------
    // Export
    //------------------------------------------------
    $("#apexArea .export").on("click", (e) => {
        const elementId = getActiveGridElementId();
        const grid = _grids[elementId];
        if(grid){
            grid.export({
                fileName: _logNames[elementId],
                bom: true
            });
        }
    });

    //------------------------------------------------
    // Create tab
    //------------------------------------------------
    const createTab = (newTab) => {
        _currentTabIndex = _currentTabIndex + 1;
        const newTabId = _currentTabIndex;
/*
    $("#apexArea .tab-area ul li:last").before(
        '<li class="noselect"><a href="#apexTab' + newTabId + '">Grid' + newTabId + '</a>' +
        '<span class="ui-icon ui-icon-close ui-closable-tab"></span>' +
        '</li>'
    );

    const logInfoArea = '<div id="logInfo' + newTabId + '" class="result-info" tabId="' + newTabId + '"></div>';

    $("#apexArea .tab-area").append(
        '<div id="apexTab' + newTabId + '" class="result-tab" tabId="' + newTabId + '">' +
        logInfoArea +
        '<div id="apexGrid' + newTabId + '" class="result-grid" tabId="' + newTabId + '"></div>' +
        '</div>'
    );

    $("#apexArea .tab-area").tabs("refresh");

    setSortableAttribute();

    const newTabIndex = $("#apexArea .tab-area ul li").length - 2;
    _selectedTabId = newTabIndex;
    $("#apexArea .tab-area").tabs({ active: newTabIndex});
    */

        tabComponent.activate(newTab.tabIndex);

        const parent = document.createElement("div");
        parent.classList.add("result-tab");
        parent.setAttribute("tabId", newTabId)

        const resultDiv = document.createElement("div");
        resultDiv.classList.add("result-info");
        resultDiv.setAttribute("tabId", newTabId);

        const gridDiv = document.createElement("div");
        gridDiv.id = "apexGrid" + newTabId;
        gridDiv.classList.add("result-grid")
        gridDiv.setAttribute("tabId",newTabId)

        parent.appendChild(resultDiv)
        parent.appendChild(gridDiv)

        newTab.content.appendChild(parent);
    };

    //------------------------------------------------
    // Active grid
    //------------------------------------------------
    const getActiveTabElementId = () => {
        return tabComponent.activeTabIndex;
    };

    const getActiveGridElementId = () => {
        return "apexGrid" + getActiveTabElementId();
    };


    //------------------------------------------------
    // message
    //------------------------------------------------
    const displayError = (json) => {
        $("#apexArea .message").html(json.error);
        $("#apexArea .message").show();
    };

    const hideMessageArea = () => {
        $("#apexArea .message").empty();
        $("#apexArea .message").hide();
    };

    //------------------------------------------------
    // page load actions
    //------------------------------------------------
    export const prepareApex = () => {
        tabComponent.afterAddTab(createTab);
        tabComponent.create(document.getElementById("apexTabArea"), "apexTab", "Grid");
        tabComponent.addTab();
    };
    //};

    //$(document).ready(apex);
    //$(document).on("page:load", apex);