const describe = new function() {

    let _selectedTabId = 0;
    const tabComponent = new Tab();
    const pulldown = new Pulldown();
    const _grids = {};
    const _logNames = {};
    const DEFAULT_DATA_TYPE = "";
    const DEFAULT_CONTENT_TYPE = null;
    const POST = "post";

    //------------------------------------------------
    // Execute Anonymous
    //------------------------------------------------
    this.executeAnonymous = function(){
        if ($.isAjaxBusy()) {
            return false;
        }

        const describeCode = document.getElementById("describeCode").value;

        if(describeCode == ""){
            return;
        }

        hideMessageArea();
        _selectedTabId = getActiveTabElementId();

        const val = {code: describeCode};
        const action = "/describe";
        const options = $.getAjaxOptions(action, POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
        const callbacks = $.getAjaxCallbacks(afterExecuteAnonymous, displayError, null);
        $.executeAjax(options, callbacks);
    };

    function afterExecuteAnonymous(json){
        const elementId = "describeGrid" + _selectedTabId;
        _logNames[elementId] = json.logName;
        writeLogInfo(json);

        if(_grids[elementId]){
            _grids[elementId].destroy();
        }

        _grids[elementId] = new GridTable(document.getElementById(elementId), json);
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
        resultDiv.id = "sobjectInfo" + newTabId;
        resultDiv.classList.add("result-info");
        resultDiv.setAttribute("tabId", newTabId);

        const gridDiv = document.createElement("div");
        gridDiv.id = "describeGrid" + newTabId;
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
        return "describeGrid" + getActiveTabElementId();
    };


    this.listSobjects = function(){
        const val = {};
        const action = "/listsobjects";
        const options = $.getAjaxOptions(action, POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
        const callbacks = $.getAjaxCallbacks(afterListSobjects, displayError, null);
        $.executeAjax(options, callbacks);
    }

    function afterListSobjects(json){
        pulldown.create(json.lists);
    }

    //------------------------------------------------
    // message
    //------------------------------------------------
    function displayError(json){
        const messageArea = document.getElementById("apexArea").querySelector(".message");
        messageArea.textContent = json.error;
        messageArea.style.display = "block";
    };

    function hideMessageArea(){
        const messageArea = document.getElementById("apexArea").querySelector(".message");
        messageArea.textContent = "";
        messageArea.style.display = "none";
    };

    //------------------------------------------------
    // page load actions
    //------------------------------------------------
    this.prepare = function(){
        tabComponent.afterAddTab(createTab);
        tabComponent.create(document.getElementById("describeTabArea"), "describeTab", "Grid");
        tabComponent.addTab();
        const parent = document.getElementById("sobjectList");
        parent.appendChild(pulldown.pulldown);
    }
};
