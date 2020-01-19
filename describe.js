  let _currentTabIndex = 0;
  let _selectedTabId = null;
  const _sObjects = {};
  const _grids = {};
  const DEFAULT_DATA_TYPE = "";
  const DEFAULT_CONTENT_TYPE = null;
  const POST = "post";
  let _sobjectList = null;

  //------------------------------------------------
  // Shortcut keys
  //------------------------------------------------
  $(window).on("keydown", (e) => {
      // escape
      if (e.keyCode === 27) {
        if ($.isAjaxBusy()) {
          $.abortAjax();
        }
        enableOptions();
      }
  });

  //------------------------------------------------
  // Change custom/standard
  //------------------------------------------------
  $(".sobjectTypeCheckBox").on("click", (e) => {
    if ($.isAjaxBusy()) {
      return false;
    }

    if(!_sobjectList){
      return false;
    }

  });

  $(".sobjectTypeCheckBox").on("change", (e) => {
    disableOptions();
    changeSObjectSelectOptions(e.target.value);
    enableOptions();
  });

  const disableOptions = () => {
    $("#describeArea .sobject-select-list").prop("disabled", true);
    $("#sobjectTypeCheckBox_all").prop("disabled", true);
    $("#sobjectTypeCheckBox_standard").prop("disabled", true);
    $("#sobjectTypeCheckBox_custom").prop("disabled", true);
    $("#executeDescribeBtn").prop("disabled", true);
  };

  const enableOptions = () => {
    $("#describeArea .sobject-select-list").prop("disabled", false);
    $("#sobjectTypeCheckBox_all").prop("disabled", false);
    $("#sobjectTypeCheckBox_standard").prop("disabled", false);
    $("#sobjectTypeCheckBox_custom").prop("disabled", false);
    $("#executeDescribeBtn").prop("disabled", false);
  };

  //------------------------------------------------
  // describe global
  //------------------------------------------------
  $("#refreshSObjectListBtn").on("click", (e) => {
    if ($.isAjaxBusy()) {
      return false;
    }

    refreshSObjectList();
  });

  const refreshSObjectList = () => {

    disableOptions();

    const val = {init: false};
    const action = "/sobjectlist"
    const options = $.getAjaxOptions(action, POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
    const callbacks = $.getAjaxCallbacks(createSObjectSelectOptions, displayError, null);
    $.executeAjax(options, callbacks);

  }

  const initializeSObjectList = () => {
    const val = {init:true};
    const action = "/sobjectlist"
    const options = $.getAjaxOptions(action, POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
    const callbacks = $.getAjaxCallbacks(createSObjectSelectOptions, displayError, null);
    $.executeAjax(options, callbacks);
  }

  const createSObjectSelectOptions = (json) => {

    _sobjectList = {};

    $("#sobjectList").empty();

    json.sobjectList.forEach(value => {

      if(value.endsWith("__c") || value.endsWith("__mdt")){
        _sobjectList[value] = {name: value, type: "custom"};
      }else{
        _sobjectList[value] = {name: value, type: "standard"};
      }

      $("#sobjectList").append($('<option>', {val: value, text: value}));
    });

    enableOptions();

  }

  const changeSObjectSelectOptions = (type) => {
    $("#sobjectList").empty();

    Object.keys(_sobjectList).forEach(key => {
      if(type == "all"){
        $("#sobjectList").append($('<option>', {val: key, text: key}));
      }else{
        if(type == _sobjectList[key].type){
          $("#sobjectList").append($('<option>', {val: key, text: key}));
        }
      }
    })

  }

  //------------------------------------------------
  // describe
  //------------------------------------------------
  $("#executeDescribeBtn").on("click", (e) => {
    executeDescribe();
  });

  export const executeDescribe = () => {
    if ($.isAjaxBusy()) {
      return;
    }

    hideMessageArea();
    _selectedTabId = getActiveTabElementId();
    const sobject = $("#describeArea #sobjectList").val();
    if (sobject) {
      disableOptions();
      const val = {sobject: sobject};
      const action = "/describe";
      const options = $.getAjaxOptions(action, POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
      const callbacks = $.getAjaxCallbacks(afterExecuteDescribe, displayError, null);
      $.executeAjax(options, callbacks);
    }
  };

  //------------------------------------------------
  // callbacks
  //------------------------------------------------
  const displayError = (json) => {
    $("#describeArea .message-area").html(json.error);
    $("#describeArea .message-area").show();
    enableOptions();
    $("#describeOverlay").hide();
  };

  const hideMessageArea = () => {
    $("#describeArea .message-area").empty();
    $("#describeArea .message-area").hide();
  };

  const afterExecuteDescribe = (json) => {
    $("#describeArea #overview" + _selectedTabId).html(getDescribeInfo(json));
    const elementId = "#describeArea #describeGrid" + _selectedTabId;
    _sObjects[elementId] = json.name;
    if(_grids[elementId]){
      _grids[elementId].destroy();
    }
    _grids[elementId] = new GridTable(document.querySelector(elementId), json.fields);
    enableOptions();
  };

  const getDescribeInfo = (json) => {
    return '<label class="noselect">Label：</label>' + json.label + '<br>' +
           '<label class="noselect">API Name：</label>' + json.name + '<br>' +
           '<label class="noselect">Prefix：</label>' + json.prefix;
  };

  //------------------------------------------------
  // Active grid
  //------------------------------------------------
  const getActiveTabElementId = () => {
    return $("#describeArea .tab-area .ui-tabs-panel:visible").attr("tabId");
  }

  const getActiveGridElementId = () => {
    return "#describeArea #describeGrid" + getActiveTabElementId();
  };

  const getActiveGrid = () => {
    const elementId = getActiveGridElementId();
    return _grids[elementId];
  };

  //------------------------------------------------
  // Close tab
  //------------------------------------------------
  $(document).on("click", "#describeArea .ui-closable-tab", function(e) {
    if ($.isAjaxBusy()) {
      return;
    }

    if ($("#describeArea .tab-area ul li").length <= 2) {
      return;
    }

    const panelId = $(this).closest("#describeArea li").remove().attr("aria-controls");
    $("#describeArea #" + panelId ).remove();
    $("#describeArea .tab-area").tabs("refresh");
  });

  //------------------------------------------------
  // Create tab
  //------------------------------------------------
  $("#describeArea .add-tab-btn").on("click", (e) => {
    createTab();
  });

  const createTab = (name) => {
    _currentTabIndex = _currentTabIndex + 1;
    const newTabId = _currentTabIndex;

    $("#describeArea .tab-area ul li:last").before(
      '<li class="noselect"><a href="#describeTab' + newTabId + '">' + name + '</a>' +
      '<span class="ui-icon ui-icon-close ui-closable-tab"></span>' +
      '</li>'
    );

    const overviewArea = '<div id="overview' + newTabId + '" class="result-info" tabId="' + newTabId + '"></div>';

    $("#describeArea .tab-area").append(
      '<div id="describeTab' + newTabId + '" class="result-tab" tabId="' + newTabId + '">' +
      overviewArea +
      '<div id="describeGrid' + newTabId + '" class="result-grid" tabId="' + newTabId + '"></div>' +
      '</div>'
    );

    $("#describeArea .tab-area").tabs("refresh");

    setSortableAttribute();

    const newTabIndex = $("#describeArea .tab-area ul li").length - 2;
    _selectedTabId = newTabIndex;
    $("#describeArea .tab-area").tabs({ active: newTabIndex});
  };

  const setSortableAttribute = () => {
    if ($("#describeTabs li" ).length > 2) {
      $("#describeTabs").sortable("enable");
    } else {
      $("#describeTabs").sortable('disable');
    }
  };

  //------------------------------------------------
  // page load actions
  //------------------------------------------------
  export const prepareDescribe = () => {
    initializeSObjectList();
    $("#describeArea .tab-area").tabs();
    $("#describeTabs").sortable({items: "li:not(.add-tab-li)", delay: 150});
    createTab("sObject");
  };


