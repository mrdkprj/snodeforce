import * as constants from "./lib/constants.js";
import { prepareSoql, executeSoql } from "./soql.js";
import { prepareApex, executeAnonymous } from "./apex.js";

const main = function() {
    let _selectedAnchor = null;
    let _anchorObject = null;

    // --test
    let _grid = null;
    $("#test").on("click", function(e){
        const options = $.getAjaxOptions("/test", "post", {}, "", null);
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
    // Events
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

    $("#menus").on("click", "a", function(e) {

        const clickedAnchor = e.target.id;

        if (_selectedAnchor === clickedAnchor) {
            return;
        }

        _selectedAnchor = clickedAnchor;
        _anchorObject = this;

        changeDisplayDiv(_selectedAnchor);

    });

    $(document).on("click", ".dropdown-menu a", function(e){

        if(e.target.classList.contains("checkmark")){
            return;
        }

        document.querySelectorAll(".dropdown-menu a").forEach(element => element.classList.remove("checkmark"));

        e.target.classList.add("checkmark");

        document.getElementById("username").textContent = e.target.textContent;

    });

    $("#username").on("click", function(e){
        document.getElementById("dropdownMenu").classList.add("open");
    })

    $("#username").on("blur", function(e){
        document.getElementById("dropdownMenu").classList.remove("open");
    })

    //------------------------------------------------
    // grid
    //------------------------------------------------
    function prepareUser(){

        document.getElementById("username").textContent = constants.defaultUser;

        const dropdown = document.getElementById("dropdownMenu");

        constants.users.forEach(user => {
            const list = document.createElement("li");
            list.classList.add("user");
            const checkmark = document.createElement("a");
            checkmark.href = "javascript:void(0)";
            checkmark.textContent = user;
            if(user == constants.defaultUser){
                checkmark.classList.add("checkmark");
            }
            list.appendChild(checkmark);
            dropdown.appendChild(list);
        });
    }

    //------------------------------------------------
    // Insert Tab
    //------------------------------------------------
    function insertTab(e) {
        const elem = e.target;
        const start = elem.selectionStart;
        const end = elem.selectionEnd;
        elem.value = "" + (elem.value.substring(0, start)) + "\t" + (elem.value.substring(end));
        elem.selectionStart = elem.selectionEnd = start + 1;
    };

    //------------------------------------------------
    // Menu list
    //------------------------------------------------
    function changeDisplayDiv(target){

        changeAnchorClass(_anchorObject);

        document.getElementById("mainArea").className = "";
        document.getElementById("mainArea").classList.add(target);

    };

    function changeAnchorClass(target){
        document.querySelectorAll(".menu-item").forEach(element => element.classList.remove("displayed"));
        target.classList.add("displayed");
    };

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