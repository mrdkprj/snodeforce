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

  $(document).on("keydown", ".value-cell", (e) => {
    if (e.ctrlKey && e.key === "a"){
      console.log("doc");
      console.log(e);
    }    
  });
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
  prepareSoql();
  prepareApex();
};

$(document).ready(main);
$(document).on("page:load", main);