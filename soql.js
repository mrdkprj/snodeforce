//const soql = function() {

  let _selectedTabId = null;
  let _currentTabIndex = 0;
  const _grids = {};
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
    $(this).attr("title", $(this).text());
  });

  $("#soqlHistory").on("mouseout", "li", function(e) {
    $(this).attr("title", "");
  });

  $("#soqlHistory").on("dblclick", "li", function(e) {
    $("#soqlArea #inputSoql").val($(this).text());
  });

  const openSoqlHistory = () => {
    $(".closebtn").show();
    $("#soqlHistory").width(HISTORY_DISP_WIDTH);
    $("#soqlArea").css("margin-left",HISTORY_DISP_MARGIN);
  };

  const closeSoqlHistory = () => {
    $(".closebtn").hide();
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
    var soql = $("#soqlArea #inputSoql").val();
    var tooling = $("#soqlArea #useTooling").is(":checked");
    _selectedTabId = $(".tab-area .ui-tabs-panel:visible").attr("tabId");

    const val = {soql: soql, tooling: tooling};
    const options = $.getAjaxOptions("/soql", POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
    const callbacks = $.getAjaxCallbacks(displayQueryResult, displayError, null);
    $.executeAjax(options, callbacks);
  };

  //------------------------------------------------
  // Query callbacks
  //------------------------------------------------
  const displayQueryResult = (json) => {
    //const selectedTabId = json.soql_info.tab_id;
    //$("#soqlArea #soql-info" + selectedTabId).html(json.soql_info.timestamp);
    const elementId = "#soqlArea #grid" + _selectedTabId;

    _grids[elementId] = new GridTable(document.querySelector(elementId), json);

    //$("#soqlHistory ul").append('<li>' + json.soql_info.soql + '</li>');

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
  // Close tab
  //------------------------------------------------
  $(document).on("click", "#soqlArea .ui-closable-tab", function(e) {
    if ($.isAjaxBusy()) {
      return;
    }

    if ($("#soqlArea .tab-area ul li").length <= 2) {
      return;
    }

    const panelId = $(this).closest("#soqlArea li").remove().attr("aria-controls");
    $("#soqlArea #" + panelId ).remove();
    $("#soqlArea .tab-area").tabs("refresh");
    setSortableAttribute();
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

    $("#soqlArea .tab-area ul li:last").before(
      '<li class="noselect"><a href="#tab' + newTabId + '">Grid' + newTabId + '</a>' +
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
    soqlArea += '<div id="soql-info" + newTabId + "">0 rows</div>';
    soqlArea += '</div>';

    $("#soqlArea .tab-area").append(
      '<div id="tab' + newTabId + '" class="result-tab" tabId="' + newTabId + '">' +
      //inputArea +
      soqlArea +
      '<div id="grid' + newTabId + '" class="result-grid" tabId="' + newTabId + '"></div>' +
      '</div>'
    );

    $("#soqlArea .tab-area").tabs("refresh");

    setSortableAttribute();

    const newTabIndex = $("#soqlArea .tab-area ul li").length - 2;
    const selectedTabId = newTabIndex;
    $("#soqlArea .tab-area").tabs({ active: newTabIndex});
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
    return $("#apexArea .tab-area .ui-tabs-panel:visible").attr("tabId");
  };

  const getActiveGridElementId = () => {
    return "#apexArea #apexGrid" + getActiveTabElementId();
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

//$(document).ready(startup);
//$(document).on("page:load", startup);