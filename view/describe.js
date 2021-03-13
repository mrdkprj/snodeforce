const describe = new function() {

    let _selectedTabId = 0;
    const tabComponent = new Tab();
    const pulldown = new Pulldown();
    const _grids = {};
    const _sobjects = {};
    const DEFAULT_DATA_TYPE = "";
    const DEFAULT_CONTENT_TYPE = null;
    const POST = "post";

    //------------------------------------------------
    // Describe
    //------------------------------------------------
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

    this.describe = function(){
        if ($.isAjaxBusy()) {
            return false;
        }

        const sobject = pulldown.value;

        if(sobject == "" || sobject == null){
            return;
        }

        hideMessageArea();
        _selectedTabId = getActiveTabElementId();

        const val = {sobject: sobject};
        const action = "/describe";
        const options = $.getAjaxOptions(action, POST, val, DEFAULT_DATA_TYPE, DEFAULT_CONTENT_TYPE);
        const callbacks = $.getAjaxCallbacks(afterDescribe, displayError, null);
        $.executeAjax(options, callbacks);
    };

    function afterDescribe(json){
        const elementId = "describeGrid" + _selectedTabId;

        _sobjects[elementId] = json.name;

        writeSobjectInfo(json);

        if(_grids[elementId]){
            _grids[elementId].destroy();
        }

        _grids[elementId] = new GridTable(document.getElementById(elementId), json);
    };

    function writeSobjectInfo(json){
        const sobjectInfoArea = document.getElementById("sobjectInfo" + _selectedTabId);

        sobjectInfoArea.innerHTML = "";
        const name = document.createElement("div");
        name.textContent = "Name: " + json.name;
        const label = document.createElement("div");
        label.textContent = "Label: " + json.label;
        const prefix = document.createElement("div");
        prefix.textContent = "Prefix: " + json.prefix;

        sobjectInfoArea.append(name, label, prefix);
    }

    //------------------------------------------------
    // Export
    //------------------------------------------------
    this.exportResult = function(){
        const elementId = getActiveGridElementId();
        const grid = _grids[elementId];
        if(grid){
            grid.export({
                fileName: _sobjects[elementId],
                bom: false
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

    //------------------------------------------------
    // message
    //------------------------------------------------
    function displayError(json){
        const messageArea = document.getElementById("describeArea").querySelector(".message");
        messageArea.textContent = json.error;
        messageArea.style.display = "block";
    };

    function hideMessageArea(){
        const messageArea = document.getElementById("describeArea").querySelector(".message");
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