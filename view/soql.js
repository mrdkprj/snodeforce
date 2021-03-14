const soql = new function() {

    const _grids = {};
    const tabComponent = new Tab();
    const _sObjects = {};
    const DEFAULT_DATA_TYPE = "";
    const DEFAULT_CONTENT_TYPE = null;
    const POST = "post";

    //------------------------------------------------
    // Execute SOQL
    //------------------------------------------------
    this.executeSoql = function(soqlInfo) {

        if ($.isAjaxBusy()) {
            return;
        }

        const soql = soqlInfo == null ? document.getElementById("inputSoql").value : soqlInfo.soql

        if(soql == ""){
            return;
        }

        hideMessageArea();

        const tooling = document.getElementById("useTooling").checked;

        const params = {soql: soql, tooling: tooling, tabId: getActiveTabElementId()};
        const options = $.getAjaxOptions("/soql", POST, params, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
        const callbacks = $.getAjaxCallbacks(displayQueryResult, displayError, null);

        $.executeAjax(options, callbacks);
    };

    function displayQueryResult(json){

        const elementId = "soqlGrid" + json.soqlInfo.tabId;

        _sObjects[elementId] = json;

        document.getElementById("soqlInfo" + json.soqlInfo.tabId).textContent = json.soqlInfo.timestamp;
        const history = document.createElement("li");
        history.textContent = json.soqlInfo.soql;
        document.getElementById("soqlList").appendChild(history);

        if(_grids[elementId]){
            _grids[elementId].destroy();
        }

        _grids[elementId] = new GridTable(document.getElementById(elementId), json);
    };

    //------------------------------------------------
    // Rerun SOQL
    //------------------------------------------------
    this.rerun = function(){

        const elementId = getActiveGridElementId();

        if (_sObjects[elementId]) {
            this.executeSoql(_sObjects[elementId].soql_info);
        }
    }

    //------------------------------------------------
    // History
    //------------------------------------------------
    this.toggleSoqlHistory = function(){
        if (document.getElementById("soqlContent").classList.contains("history-opened")) {
            this.closeSoqlHistory();
        } else {
            this.openSoqlHistory();
        }
    }

    this.openSoqlHistory = function(){
        document.getElementById("soqlContent").classList.add("history-opened");
    }

    this.closeSoqlHistory = function(){
        document.getElementById("soqlContent").classList.remove("history-opened");
    }

    //------------------------------------------------
    // Export
    //------------------------------------------------
    this.exportResult = function(){
        const elementId = getActiveGridElementId();
        const grid = _grids[elementId];

        if(grid){
            grid.export({
                fileName: "query_result",
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
        resultDiv.classList.add("result-info");
        resultDiv.setAttribute("tabId", newTabId);

        const soqlInfoDiv = document.createElement("div");
        soqlInfoDiv.classList.add("soql-info-area");

        const infoDiv = document.createElement("div");
        infoDiv.id = "soqlInfo"+ newTabId;
        infoDiv.innerText = "0 rows";

        const btnArea = document.createElement("div");
        btnArea.classList.add("rerun");
        btnArea.classList.add("refresh-sm");
        const btn = document.createElement("div");
        btn.classList.add("refresh-btn-sm");
        btnArea.appendChild(btn);

        soqlInfoDiv.appendChild(infoDiv);
        soqlInfoDiv.appendChild(btnArea);


        resultDiv.appendChild(soqlInfoDiv)

        const gridDiv = document.createElement("div");
        gridDiv.id = "soqlGrid" + newTabId;
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
        return "soqlGrid" + getActiveTabElementId();
    };

    //------------------------------------------------
    // message
    //------------------------------------------------
    function displayError(json){
        const messageArea = document.getElementById("soqlArea").querySelector(".message");
        messageArea.textContent = json.error;
        messageArea.style.display = "block";
    };

    function hideMessageArea(){
        const messageArea = document.getElementById("soqlArea").querySelector(".message");
        messageArea.textContent = "";
        messageArea.style.display = "none";
    };

    //------------------------------------------------
    // page load actions
    //------------------------------------------------
    this.prepare = function(){
        tabComponent.afterAddTab(createTab);
        tabComponent.create(document.getElementById("soqlTabArea"), "soqlTab", "Grid");
        tabComponent.addTab();
    }
};