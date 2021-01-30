    import * as constants from "./lib/constants.js";
    import { prepareSoql, executeSoql } from "./soql.js";
    import { prepareApex, executeAnonymous } from "./apex.js";

    const main = function() {
    let _selectedAnchor = null;
    let _anchorObject = null;
    const DEFAULT_DATA_TYPE = "";
    const DEFAULT_CONTENT_TYPE = null;
    const POST = "post";

    // --test
    let _grid = null;
    $("#test").on("click", function(e){
        const options = $.getAjaxOptions("/test", POST, {}, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
        const callbacks = $.getAjaxCallbacks(displayQueryResult3, displayQueryResult3, null);
        $.executeAjax(options, callbacks);
    });

    const displayQueryResult3 = (json) => {
        var _selectedTabId = $("#soqlArea .tab-area .ui-tabs-panel:visible").attr("tabId");
        _selectedTabId = 1;
        const elementId = "#soqlArea #soqlGrid" + _selectedTabId;
        json.readOnly = [2,4];
        _grid = new GridTable(document.querySelector(elementId), json);
    };
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

        // tab
        if (e.keyCode === 9) {
            if (e.target.id === "inputSoql" || e.target.id === "apexCode") {
                insertTab(e);
                return false;
            }
        }

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

    $("#username").on("click", function(e){
        $("#dropdownMenu").addClass("open");
    })

    $("#username").on("blur", function(e){
        $("#dropdownMenu").removeClass("open");
    })

    //------------------------------------------------
    // page load actions
    //------------------------------------------------
    prepareUser();
    prepareSoql();
    prepareApex();
    $("#soqlArea #test").click();
};

$(document).ready(main);
$(document).on("page:load", main);