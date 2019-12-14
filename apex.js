//const apex = function() {

  let _selectedTabId = 0;
  let _currentTabIndex = 0;
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
    _selectedTabId = $("#apexArea .tab-area .ui-tabs-panel:visible").attr("tabId");

    const debugOptions = {};    
    $("#debugOptions option:selected").each(function() {
      const category = $(this).parent().attr("id");
      const level = $(this).val();
      debugOptions[category] = level;
    });
      
    const val = {code: $("#apexArea #apexCode").val(), debug_options: debugOptions};
    const action = "/apex";
    const options = $.getAjaxOptions(action, POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
    const callbacks = $.getAjaxCallbacks(afterExecuteAnonymous, displayError, null);
    $.executeAjax(options, callbacks);
  };
  
  const afterExecuteAnonymous = (json) => {
    const elementId = "#apexArea #apexGrid" + _selectedTabId;
    _logNames[elementId] = json.log_name;    
    $("#apexArea #logInfo" + _selectedTabId).html(getLogResult(json));
    
    _grids[elementId] = new GridTable(document.querySelector(elementId), json);
  };

  const getLogResult = (json) => {
    return json.log_name + '&nbsp;&nbsp;<label><input type="checkbox" class="debug-only"/>&nbsp;Debug only</label>';
  }

  //------------------------------------------------
  // Debug options
  //------------------------------------------------  
  $("#apexArea #debugOptionBtn").on("click", (e) => {
    if ($("#debugOptions").is(":visible")) {
      $("#debugOptions").hide();
    } else {
      $("#debugOptions").show();
    }
  });

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
  // Close tab
  //------------------------------------------------
  $(document).on("click", "#apexArea .ui-closable-tab", function(e) {

    if ($("#apexArea .tab-area ul li").length <= 2) {
      return;
    }

    const panelId = $(this).closest("#apexArea li").remove().attr("aria-controls");
    $("#apexArea #" + panelId ).remove();
    $("#apexArea .tab-area").tabs("refresh");
  });

  //------------------------------------------------
  // Create tab
  //------------------------------------------------
  $("#apexArea .add-tab-btn").on("click", (e) => {
    createTab();
  });
  
  const createTab = () => {
    _currentTabIndex = _currentTabIndex + 1;
    const newTabId = _currentTabIndex;

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
  };

  const setSortableAttribute = () => {
    if ($("#apexTabs li" ).length > 2) {
      $("#apexTabs").sortable("enable");
    } else {
      $("#apexTabs").sortable("disable");
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
    $("#apexArea .message-area").html(json.error);
    $("#apexArea .message-area").show();
  };
  
  const hideMessageArea = () => {
    $("#apexArea .message-area").empty();
    $("#apexArea .message-area").hide();
  };
    
  //------------------------------------------------
  // page load actions
  //------------------------------------------------
  export const prepareApex = () => {
    $("#apexArea .tab-area").tabs();
    $("#apexTabs").sortable({items: "li:not(.add-tab-li)", delay: 150});
    createTab();
  };  
//};

//$(document).ready(apex);
//$(document).on("page:load", apex);