import * as constants from "./lib/constants.js";
import { prepareSoql, executeSoql } from "./soql.js";
import { prepareApex, executeAnonymous } from "./apex.js";

const main = function() {
  let _selectedAnchor = null;
  let _anchorObject = null;
  let _selectedTabId = null;
  const DEFAULT_DATA_TYPE = "";
  const DEFAULT_CONTENT_TYPE = null;
  const GET = "get";
  const POST = "post";

  // --test
  let _grid = null;
  $("#test").on("click", function(e){
        /*
    const head = ["id","name","MailingPostalCode"," MailingState","MailingCity"," MailingStreet"];
    const rows = [];
    for(let i = 0; i < 101; i++){
      if(i==10){
        rows.push(["a" + i, "b"+i,"c"+i,"daaaa\naaaaaaaaaaa\naa\naaaaaaadaaaa\naaaaaaaaaaaaaaaaaaaa"+i,"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"+i ,"fffffffffffffffffffffffffffffffffffff"+i]);
      }else{
        rows.push(["a" + i, "b"+i,"c"+i,"d"+i,"e"+i ,"f"+i]);
      }
    }
    var _selectedTabId = $(".tab-area .ui-tabs-panel:visible").attr("tabId");
    const elementId = "#soqlArea #grid" + _selectedTabId;

    _grid = new GridTable(document.querySelector(elementId), {header:head,rows:rows});
    */
    const options = $.getAjaxOptions("/test", POST, {}, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
    const callbacks = $.getAjaxCallbacks(displayQueryResult, displayQueryResult, null);
    $.executeAjax(options, callbacks);
  });

  const displayQueryResult = (json) => {
    var _selectedTabId = $(".tab-area .ui-tabs-panel:visible").attr("tabId");
    const elementId = "#soqlArea #grid" + _selectedTabId;
    _grid = new GridTable(document.querySelector(elementId), json);
  };


  $("#testfilter").on("click", function(e){
    _grid.filter(3, "d11");
  });
  // -----------

  //------------------------------------------------
  // grid
  //------------------------------------------------
  const prepareUser = () => {
    $("#username").html(constants.defaultUser);
    constants.users.forEach(user => {
      if(user == constants.defaultUser){
        $("#dropdownMenu").append('<li class="user"><a href="javascript:void(0)" class="checkmark">' + user + '</a></li>');
      }else{
        $("#dropdownMenu").append('<li class="user"><a href="javascript:void(0)">' + user + '</a></li>');
      }
    });
  }

  const prepareDebugLevels = () => {

    for(let i = 0; i < constants.logCategory.length; i++){

      const logCategory = constants.logCategory[i];
      const label = $("<label>", {text: logCategory});
      const select = $("<select>", {name: logCategory, id: logCategory});

      constants.logCategoryLevel.forEach((item) => {
        if(item == constants.defaultLogLevel[i]){
          select.append( $("<option>", {text: item, selected:"selected"}) );
        }else{
          select.append( $("<option>", {text: item}) );
        }
      });

      $("#debugOptions").append(label);
      $("#debugOptions").append(select);

    }

  }
  //------------------------------------------------
  // Shortcut keys
  //------------------------------------------------
  $(document).on("keydown", (e) => {

    if (e.ctrlKey && (e.key === "r" || e.keyCode === 13)) {
      e.preventDefault();

      if (e.target.id === "inputSoql"){
        executeSoql();
        return false;
      }

      if(e.target.id === "apexCode") {
        executeAnonymous();
      }
    }


    // escape
    if (e.keyCode === 27) {
      if ($("#soqlOverRay").is(":visible")) {
        $("#soqlOverRay").hide();
      }
    }

    // tab
    if (e.keyCode === 9) {
      if (e.target.id === "inputSoql" || e.target.id === "apexCode") {
        insertTab(e);
        return false;
      }
    }

    //if (e.ctrlKey && e.key === "a"){
      //console.log(e);
    //}
  });

  //------------------------------------------------
  // Insert Tab
  //------------------------------------------------
  const insertTab = (e) => {
    const elem = e.target;
    const start = elem.selectionStart;
    const end = elem.selectionEnd;
    elem.value = "" + (elem.value.substring(0, start)) + "\t" + (elem.value.substring(end));
    elem.selectionStart = elem.selectionEnd = start + 1;
  };

  //------------------------------------------------
  // Menu list
  //------------------------------------------------
  $("#menus").on("click", "a", function(e) {

    const clickedAnchor = $(this).prop("id");

    if (_selectedAnchor === clickedAnchor) {
      return;
    }

    _selectedAnchor = clickedAnchor;
    _anchorObject = this;

    changeDisplayDiv(_selectedAnchor);
    return;

  });

  const changeDisplayDiv = (target) => {

    changeAnchorClass(_anchorObject);

    $("div#mainArea").prop("class", target);
  };

  const changeAnchorClass = (target) => {
    $(".menu-item").not(target).removeClass("displayed");

    if ($(target).hasClass("displayed")) {
      $(target).removeClass("displayed");
    } else {
      $(target).addClass("displayed");
    }
  };


  $(document).on("click", ".dropdown-menu a", function(e){
    if ($(this).hasClass("checkmark")){
      return false;
    }

    $(".dropdown-menu a").not(this).removeClass("checkmark");

    $(this).addClass("checkmark");

    $("#username").html($(this).html());

  });


  //------------------------------------------------
  // page load actions
  //------------------------------------------------
  prepareUser();
  prepareDebugLevels();
  prepareSoql();
  prepareApex();
  $("#test").click();
};

$(document).ready(main);
$(document).on("page:load", main);