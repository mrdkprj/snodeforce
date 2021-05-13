import * as constants from "../lib/constants.js"
import SOQL from "./soql.js"
import Describe from "./describe.js"
import Apex from "./apex.js"
import {Http, Message} from "../lib/utils.js"
import GridTable from "../lib/gridtable.js"
import Pulldown from "../lib/pulldown.js"
import Tab from "../lib/tab.js"

const request = new Http().request;
const soql = new SOQL({request, GridTable, Tab, Message});
const describe = new Describe({request, GridTable, Tab, Pulldown, Message});
const apex = new Apex({request, GridTable, Tab, Message});

const main = new function(){

    this.insertTab = function(e){
        const elem = e.target;
        const start = elem.selectionStart;
        const end = elem.selectionEnd;
        elem.value = "" + (elem.value.substring(0, start)) + "\t" + (elem.value.substring(end));
        elem.selectionStart = elem.selectionEnd = start + 1;
    };

    this.prepareUser = function(){

        document.getElementById("username").textContent = constants.defaultUser;

        const dropdown = document.getElementById("dropdownMenu");

        constants.users.forEach(user => {
            const list = document.createElement("li");
            const anchor = document.createElement("a");
            anchor.classList.add("dropdown-menu-item");
            anchor.textContent = user;
            if(user == constants.defaultUser){
                anchor.classList.add("checkmark");
            }
            list.appendChild(anchor);
            dropdown.appendChild(list);
        });
    }

    this.toggleUserList = function(){
        const userList = document.getElementById("userList");
        if(userList.classList.contains("open")){
            userList.classList.remove("open");
        }else{
            userList.classList.add("open");
        }
    }

    this.changeUser = function(e){
        if(e.target.classList.contains("checkmark")){
            return;
        }

        document.querySelectorAll(".dropdown-menu a").forEach(element => element.classList.remove("checkmark"));

        e.target.classList.add("checkmark");

        document.getElementById("username").textContent = e.target.textContent;
    }

    this.closeUserList = function(){
        document.getElementById("userList").classList.remove("open");
    }

    this.changeDisplayDiv = function(e){

        if (e.target.classList.contains("displayed")) {
            return;
        }

        document.querySelectorAll(".menu-item").forEach(function(element){
            element.classList.remove("displayed");
        });
        e.target.classList.add("displayed");

        document.getElementById("mainArea").className = "";
        document.getElementById("mainArea").classList.add(e.target.id);

    };

};

(function(){

    // --test
    document.getElementById("test").addEventListener("click", async e => {
        const res = await request("/test", {});
        const _selectedTabId = 0;
        const elementId = "soqlGrid" + _selectedTabId;
        res.readOnly = [2,4];
        const _grid = new GridTable(document.getElementById(elementId), res);
    });
    // --

    document.addEventListener("keydown", e => {

        if (e.ctrlKey && (e.key === "r" || e.key === "Enter")) {
            e.preventDefault();

            if (e.target.id === "inputSoql"){
                soql.executeSoql();
            }

            if(e.target.id === "apexCode") {
                apex.executeAnonymous();
            }
        }

        // tab
        if (e.key === "Tab") {
            if (e.target.id === "inputSoql" || e.target.id === "apexCode") {
                e.preventDefault();
                main.insertTab(e);
            }
        }

    });

    document.addEventListener("mousedown", e => {

        if(e.target.classList.contains("dropdown-menu-item")){
            main.changeUser(e);
        }
    })

    document.addEventListener("click", e => {

        if(e.target.classList.contains("menu-item")){
            main.changeDisplayDiv(e);
        }

        if(e.target.classList.contains("rerun")){
            soql.rerun();
        }

        if(e.target.classList.contains("debug-only")){
            apex.onDebugOnly(e);
        }
    })

    document.addEventListener("dblclick", e => {

        if(e.target.classList.contains("history")){
            soql.replaceSoql(e);
        }
    });

    //------------------------------------------------
    // Menu
    //------------------------------------------------
    document.getElementById("username").addEventListener("click", e => main.toggleUserList());

    document.getElementById("username").addEventListener("blur", e => main.closeUserList());

    //------------------------------------------------
    // SOQL
    //------------------------------------------------
    document.getElementById("executeSoqlBtn").addEventListener("click", e => soql.executeSoql());

    document.getElementById("soqlExportBtn").addEventListener("click", e => soql.exportResult());

    document.getElementById("soqlHistoryBtn").addEventListener("click", e => soql.toggleSoqlHistory());

    document.getElementById("closeHistoryBtn").addEventListener("click", e => soql.closeSoqlHistory());

    //------------------------------------------------
    // Describe
    //------------------------------------------------
    document.getElementById("listSobjectBtn").addEventListener("click", e => describe.listSobjects());

    document.getElementById("describeBtn").addEventListener("click", e => describe.describe());

    document.getElementById("describeExportBtn").addEventListener("click", e => describe.exportResult());

    //------------------------------------------------
    // Apex
    //------------------------------------------------
    document.getElementById("executeAnonymousBtn").addEventListener("click", e => apex.executeAnonymous());

    document.getElementById("apexExportBtn").addEventListener("click", e => apex.exportLog());

    main.prepareUser();
    soql.prepare();
    describe.prepare();
    apex.prepare();

}());