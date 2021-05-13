export default function apex({request, GridTable, Tab, Message}) {

    let _selectedTabId = 0;
    const tabComponent = new Tab();
    const message = new Message("apexArea");
    const _grids = {};
    const _logNames = {};
    const EVENT_COLUMN_INDEX = 1;
    const USER_DEBUG = "USER_DEBUG";

    //------------------------------------------------
    // Execute Anonymous
    //------------------------------------------------
    this.executeAnonymous = async function(){

        const apexCode = document.getElementById("apexCode").value;

        if(apexCode == ""){
            return;
        }

        message.hide();
        _selectedTabId = getActiveTabElementId();

        try{
            const result = await request("/apex", {code: apexCode});
            afterExecuteAnonymous(result);
        }catch(ex){
            message.display(ex.message);
        }
    };

    function afterExecuteAnonymous(json){

        const elementId = "apexGrid" + _selectedTabId;
        _logNames[elementId] = json.logName;
        writeLogInfo(json);

        if(_grids[elementId]){
            _grids[elementId].destroy();
        }

        _grids[elementId] = new GridTable(document.getElementById(elementId), json);
    };

    function writeLogInfo(json){
        const infoArea = document.getElementById("logInfo" + _selectedTabId);
        infoArea.innerHTML = "";

        const log = document.createElement("span");
        log.textContent = json.logName;
        log.style["margin-right"] = "10px";
        const debugOnly = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("debug-only");
        debugOnly.append(checkbox,"Debug only");

        infoArea.appendChild(log);
        infoArea.appendChild(debugOnly);

    }

    this.openDebugOption = function(e){
        e.preventDefault();
        const parent = document.getElementById("debugOptionArea");
        if(parent.classList.contains("open")){
            parent.classList.remove("open");
        }else{
            parent.classList.add("open");
        }
    }
    //------------------------------------------------
    // Filter debug only
    //------------------------------------------------
    this.onDebugOnly = function(e){
        if (e.target.checked == true) {
            filterLog();
        } else {
            clearFilter();
        }
    }

    function filterLog(){
        const elementId = getActiveGridElementId();
        const grid = _grids[elementId];
        grid.filter(EVENT_COLUMN_INDEX,USER_DEBUG);
    };

    function clearFilter(){
        const elementId = getActiveGridElementId();
        const grid = _grids[elementId];
        grid.clearFilter();
    };

    //------------------------------------------------
    // Export
    //------------------------------------------------
    this.exportLog = function(){
        const elementId = getActiveGridElementId();
        const grid = _grids[elementId];
        if(grid){
            grid.export({
                fileName: _logNames[elementId],
                bom: true
            });
        }
    }

    //------------------------------------------------
    // Create tab
    //------------------------------------------------
    function createTab(newTab){

        const newTabId = newTab.tabIndex;

        tabComponent.activate(newTab.tabIndex);

        const parent = document.createElement("div");
        parent.classList.add("result-tab");
        parent.setAttribute("tabId", newTabId)

        const resultDiv = document.createElement("div");
        resultDiv.id = "logInfo" + newTabId;
        resultDiv.classList.add("result-info");
        resultDiv.setAttribute("tabId", newTabId);

        const gridDiv = document.createElement("div");
        gridDiv.id = "apexGrid" + newTabId;
        gridDiv.classList.add("result-grid")
        gridDiv.setAttribute("tabId",newTabId)

        parent.appendChild(resultDiv)
        parent.appendChild(gridDiv)

        newTab.content.appendChild(parent);
    };

    //------------------------------------------------
    // Active grid
    //------------------------------------------------
    function getActiveTabElementId(){
        return tabComponent.activeTabIndex;
    };

    function getActiveGridElementId(){
        return "apexGrid" + getActiveTabElementId();
    };

    //------------------------------------------------
    // page load actions
    //------------------------------------------------
    this.prepare = function(){
        tabComponent.afterAddTab(createTab);
        tabComponent.create(document.getElementById("apexTabArea"), "apexTab", "Grid");
        tabComponent.addTab();
    }
};
