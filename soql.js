//const soql = function() {

    //import { info } from "console";

    let _selectedTabId = null;
    let _currentTabIndex = 0;
    const _grids = {};
    const tabComponent = new Tab();
    const _sObjects = {};
    const THIS_AREA = "soqlArea";
    const DEFAULT_DATA_TYPE = "";
    const DEFAULT_CONTENT_TYPE = null;
    const SOBJECT_LIST_DEF_ZINDEX = "1051"
    const SOBJECT_LIST_DISP_ZINDEX = "4010"
    const HISTORY_DISP_WIDTH = "250px"
    const HISTORY_DISP_MARGIN = "150px"
    const PLACEHOLDER = "Select an sObject"
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
    $("#soqlArea .add-tab-btn").on("click", (e) => {
        createTab();
    });

    const createTab = () => {
        _currentTabIndex = _currentTabIndex + 1;
        const newTabId = _currentTabIndex;
    /*
        $("#soqlArea .tab-area ul li:last").before(
        '<li class="noselect"><a href="#soqlTab' + newTabId + '">Grid' + newTabId + '</a>' +
        '<span class="ui-icon ui-icon-close ui-closable-tab"></span>' +
        '</li>'
        );

        let inputArea = '<div class="inputSoql" style="margin-bottom:-2px;" tabId="' + newTabId + '">';
        inputArea += '<textarea name="inputSoql" id="inputSoql' + newTabId + '" style="width:100%" rows="5"></textarea>';
        inputArea += '</div>';

        let soqlArea = '<div class="result-info" tabId="' + newTabId + '">';
        soqlArea += '<div id="soql' + newTabId + '">';
        soqlArea += '<button name="rerunBtn" type="button" class="rerun btn btn-xs btn-default grid-btn">Rerun</button>';
        soqlArea += '</div>';
        soqlArea += '<div id="soqlInfo' + newTabId + '">0 rows</div>';
        soqlArea += '</div>';

        $("#soqlArea .tab-area").append(
        '<div id="soqlTab' + newTabId + '" class="result-tab" tabId="' + newTabId + '">' +
        //inputArea +
        soqlArea +
        '<div id="soqlGrid' + newTabId + '" class="result-grid" tabId="' + newTabId + '"></div>' +
        '</div>'
        );

        $("#soqlArea .tab-area").tabs("refresh");

        setSortableAttribute();

        const newTabIndex = $("#soqlArea .tab-area ul li").length - 2;

        $("#soqlArea .tab-area").tabs({ active: newTabIndex});
        */

        const nm = "Grid" + newTabId ;
        tabComponent.create(document.getElementById("soqlTabArea"), nm, nm);

        const newTab = tabComponent.addTab(nm);
        tabComponent.activate(newTab.tabIndex);

        const parent = document.createElement("div");
        parent.id = "soqlTab" + newTabId;
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

    const setSortableAttribute = () => {
        if ($("#soqlTabs li" ).length > 2) {
        $("#soqlTabs").sortable("enable");
        } else {
        $("#soqlTabs").sortable("disable");
        }
    };

    //------------------------------------------------
    // Active grid
    //------------------------------------------------
    const getActiveTabElementId = () => {
        //return $("#soqlArea .tab-area .ui-tabs-panel:visible").attr("tabId");
        return tabComponent.activeTabIndex;
    };

    const getActiveGridElementId = () => {
        return "soqlGrid" + getActiveTabElementId();
    };

    const getActiveGrid = () => {
        const elementId = getActiveGridElementId();
        return _grids[elementId];
    };

    //------------------------------------------------
    // message
    //------------------------------------------------
    const displayError = (json) => {
        $("#soqlArea .message-area").html(json.error);
        $("#soqlArea .message-area").show();
    };

    const hideMessageArea = () => {
        $("#soqlArea .message-area").empty();
        $("#soqlArea .message-area").hide();
    };

    //------------------------------------------------
    // page load actions
    //------------------------------------------------
    export const prepareSoql = () =>{
        $("#soqlArea .tab-area").tabs();
        $("#soqlTabs").sortable({items: "li:not(.add-tab-li)", delay: 150});
        createTab();
    }
//};

 //   $(document).ready(soql);
   // $(document).on("page:load", soql);