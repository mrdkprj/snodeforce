//const soql = function() {

    //import { info } from "console";

    let _currentTabIndex = 0;
    const _grids = {};
    const tabComponent = new Tab();
    const _sObjects = {};
    const DEFAULT_DATA_TYPE = "";
    const DEFAULT_CONTENT_TYPE = null;
    const HISTORY_DISP_WIDTH = "250px"
    const HISTORY_DISP_MARGIN = "150px"
    const POST = "post";

    //------------------------------------------------
    // SOQL History
    //------------------------------------------------
    $("#soqlArea #soqlHistoryBtn").on("click", (e) => {
        if ($("#soqlHistory").width() > 0) {
            closeSoqlHistory();
        } else {
            openSoqlHistory();
        }
    });

    $("#soqlHistory .closebtn").on("click", (e) => {
        closeSoqlHistory();
    });

    $("#soqlHistory").on("mouseover", "li", function(e) {
        e.target.setAttribute("title", e.target.innerText);
    });

    $("#soqlHistory").on("mouseout", "li", function(e) {
        e.target.setAttribute("title", "");
    });

    $("#soqlHistory").on("dblclick", "li", function(e) {
        document.getElementById("inputSoql").value = e.target.innerText;
    });

    const openSoqlHistory = () => {
        $("#closeHistoryBtn").show();
        $("#soqlHistory").width(HISTORY_DISP_WIDTH);
        $("#soqlArea").css("margin-left",HISTORY_DISP_MARGIN);
    };

    const closeSoqlHistory = () => {
        $("#closeHistoryBtn").hide();
        $("#soqlHistory").width("0");
        $("#soqlArea").css("margin-left","0");
    };

    //------------------------------------------------
    // Execute SOQL
    //------------------------------------------------
    $("#executeSoqlBtn").on("click", function(e){
        executeSoql();
    });

    export function executeSoql() {
        if ($.isAjaxBusy()) {
            return false;
        }

        hideMessageArea();
        const soql = $("#inputSoql").val();
        const tooling = $("#useTooling").is(":checked");

        const val = {soql: soql, tooling: tooling, tabId: getActiveTabElementId()};
        const options = $.getAjaxOptions("/soql", POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
        const callbacks = $.getAjaxCallbacks(displayQueryResult, displayError, null);
        $.executeAjax(options, callbacks);
    };

    //------------------------------------------------
    // Query callbacks
    //------------------------------------------------
    const displayQueryResult = (json) => {
        const selectedTabId = json.soqlInfo.tabId;
        $("#soqlArea #soqlInfo" + selectedTabId).html(json.soqlInfo.timestamp);
        $("#soqlHistory ul").append('<li>' + json.soqlInfo.soql + '</li>');

        const elementId = "soqlGrid" + json.soqlInfo.tabId;

        if(_grids[elementId]){
            _grids[elementId].destroy();
        }

        _grids[elementId] = new GridTable(document.getElementById(elementId), json);
    };

    //------------------------------------------------
    // Rerun SOQL
    //------------------------------------------------
    $("#soqlArea").on("click", ".rerun", (e) => {
        if ($.isAjaxBusy()) {
            return;
        }

        const elementId = getActiveGridElementId();

        if (_sObjects[elementId]) {
            executeSoql({soql_info:_sObjects[elementId].soql_info, afterCrud: false});
        }
    });

    //------------------------------------------------
    // Export
    //------------------------------------------------
    $("#soqlArea .export").on("click", (e) => {
        const elementId = getActiveGridElementId();
        const grid = _grids[elementId];
        if(grid){
            grid.export({
                fileName: "query_result",
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

        tabComponent.activate(newTab.tabIndex);

        const parent = document.createElement("div");
        parent.classList.add("result-tab");
        parent.setAttribute("tabId", newTabId)

        const resultDiv = document.createElement("div");
        resultDiv.classList.add("result-info");
        resultDiv.setAttribute("tabId", newTabId);

        const soqlInfoDiv = document.createElement("div");
        soqlInfoDiv.id = "soql" + newTabId;

        const btn = document.createElement("button");
        btn.name = "rerunBtn"
        btn.classList.add("rerun");
        btn.classList.add("btn");
        btn.classList.add("btn-xs");
        btn.classList.add("btn-default");
        btn.classList.add("grid-btn");
        btn.innerText = "Rerun";
        soqlInfoDiv.appendChild(btn);

        const infoDiv = document.createElement("div");
        infoDiv.id = "soqlInfo"+ newTabId;
        infoDiv.innerText = "0 rows";

        resultDiv.appendChild(soqlInfoDiv)
        resultDiv.appendChild(infoDiv)

        const gridDiv = document.createElement("div");
        gridDiv.id = "soqlGrid" + newTabId;
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
        return "soqlGrid" + getActiveTabElementId();
    };

    //------------------------------------------------
    // message
    //------------------------------------------------
    const displayError = (json) => {
        $("#soqlArea .message").html(json.error);
        $("#soqlArea .message").show();
    };

    const hideMessageArea = () => {
        $("#soqlArea .message").empty();
        $("#soqlArea .message").hide();
    };

    //------------------------------------------------
    // page load actions
    //------------------------------------------------
    export const prepareSoql = () =>{
        tabComponent.afterAddTab(createTab);
        tabComponent.create(document.getElementById("soqlTabArea"), "soqlTab", "Grid");
        tabComponent.addTab();
    }
//};

 //   $(document).ready(soql);
   // $(document).on("page:load", soql);