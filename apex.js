    //const apex = function() {

    let _selectedTabId = 0;
    const tabComponent = new Tab();
    const _grids = {};
    const _logNames = {};
    const DEFAULT_DATA_TYPE = "";
    const DEFAULT_CONTENT_TYPE = null;
    const EVENT_COLUMN_INDEX = 1;
    const USER_DEBUG = "USER_DEBUG";
    const POST = "post";

    $("#apexArea #executeAnonymousBtn").on("click", (e) => {
        if ($.isAjaxBusy() || !$("#apexArea #apexCode").val()) {
            return false;
        }

        e.preventDefault();
        executeAnonymous();
    });

    $("#apexArea").on("click", "input.debug-only", function(e) {
        if ($(this).prop("checked")) {
            filterLog();
        } else {
            clearFilter();
        }
    });

    $("#apexArea .export").on("click", (e) => {
        exportLog();
    });

    //------------------------------------------------
    // Execute Anonymous
    //------------------------------------------------
    export function executeAnonymous(){
        hideMessageArea();
        _selectedTabId = getActiveTabElementId();

        const val = {code: document.getElementById("apexCode").value};
        const action = "/apex";
        const options = $.getAjaxOptions(action, POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
        const callbacks = $.getAjaxCallbacks(afterExecuteAnonymous, displayError, null);
        $.executeAjax(options, callbacks);
    };

    function afterExecuteAnonymous(json){
        const elementId = "apexGrid" + _selectedTabId;
        _logNames[elementId] = json.logName;
        writeLogInfo(json);

        if(_grids[elementId]){
            _grids[elementId].destroy();
        }

        _grids[elementId] = new GridTable(document.getElementById(elementId), json);
        };

    function writeLogInfo(json){
        const infoArea = document.getElementById("logInfo" + _selectedTabId);

        const log = document.createElement("span");
        log.textContent = json.logName;
        log.style["margin-right"] = "10px";
        const debugOnly = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("debug-only");
        debugOnly.append(checkbox,"Debug only");

        infoArea.appendChild(log);
        infoArea.appendChild(debugOnly);

    }

    //------------------------------------------------
    // Filter debug only
    //------------------------------------------------
    function filterLog(){
        const elementId = getActiveGridElementId();
        const grid = _grids[elementId];
        grid.filter(EVENT_COLUMN_INDEX,USER_DEBUG);
    };

    function clearFilter(){
        const elementId = getActiveGridElementId();
        const grid = _grids[elementId];
        grid.clearFilter();
    };

    //------------------------------------------------
    // Export
    //------------------------------------------------
    function exportLog(){
        const elementId = getActiveGridElementId();
        const grid = _grids[elementId];
        if(grid){
            grid.export({
                fileName: _logNames[elementId],
                bom: true
            });
        }
    }

    //------------------------------------------------
    // Create tab
    //------------------------------------------------
    function createTab(newTab){

        const newTabId = newTab.tabIndex;

        tabComponent.activate(newTab.tabIndex);

        const parent = document.createElement("div");
        parent.classList.add("result-tab");
        parent.setAttribute("tabId", newTabId)

        const resultDiv = document.createElement("div");
        resultDiv.id = "logInfo" + newTabId;
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
    function getActiveTabElementId(){
        return tabComponent.activeTabIndex;
    };

    function getActiveGridElementId(){
        return "apexGrid" + getActiveTabElementId();
    };


    //------------------------------------------------
    // message
    //------------------------------------------------
    function displayError(json){
        const messageArea = document.getElementById("apexArea").querySelector(".message");
        messageArea.textContent = json.error;
        messageArea.style.display = "block";
    };

    function hideMessageArea(){
        const messageArea = document.getElementById("apexArea").querySelector(".message");
        messageArea.textContent = "";
        messageArea.style.display = "none";
    };

    //------------------------------------------------
    // page load actions
    //------------------------------------------------
    export function prepareApex(){
        tabComponent.afterAddTab(createTab);
        tabComponent.create(document.getElementById("apexTabArea"), "apexTab", "Grid");
        tabComponent.addTab();
    };
    //};

    //$(document).ready(apex);
    //$(document).on("page:load", apex);