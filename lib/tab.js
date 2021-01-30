class Tab{

    constructor(){
    }

    create(rootElement, baseTabId, tabName){

        this.tabArea = document.createElement("div");
        this.tab = document.createElement("ul");
        this.tab.classList.add("tab-wrap");
        this.tabArea.appendChild(this.tab);

        this.tabs = {};
        this.arr = [];
        this.tabIndex = -1;
        this.activeTabIndex = -1;
        this.baseTabId = baseTabId;
        this.baseTabName = tabName;
        this.addBtn = null;

        rootElement.appendChild(this.tabArea);
    }

    addTab(){

        this.tabIndex++;
        const tabContentId = this.baseTabId + this.tabIndex;

        if(this.addBtn == null){
            const addLi = document.createElement("li");
            addLi.classList.add("add-tab-li");
            const addDiv = document.createElement("div");
            addDiv.classList.add("add-tab-btn");
            addDiv.classList.add("icon-plus");
            addLi.appendChild(addDiv);
            this.tab.appendChild(addLi);
            this.addBtn = addLi;
            addLi.addEventListener("click", this.addTab.bind(this));
        }

        const li = document.createElement("li");
        li.classList.add("tab-label");
        li.classList.add("noselect");
        li.setAttribute("tab-control", tabContentId);
        li.setAttribute("tab-index", this.tabIndex);
        li.addEventListener("click", this._activate.bind(this));

        const a = document.createElement("span");
        a.classList.add("tab-anchor");
        a.innerText = this.baseTabName + this.tabIndex;
        const span = document.createElement("span");
        span.classList.add("closebtn-sm");
        span.innerHTML = "&#10006;";

        li.appendChild(a);
        li.appendChild(span);
        this.tab.insertBefore(li, this.addBtn);

        const content = document.createElement("div");
        content.classList.add("tab-content");
        content.id = tabContentId;
        this.tabArea.appendChild(content);

        this.tabs[this.tabIndex] = li;

        const newTab = {
            tab: li,
            content: content,
            tabIndex: this.tabIndex
        };

        if(this.afterAddTabCallBack){
            this.afterAddTabCallBack(newTab);
        }

        return newTab;
    }

    afterAddTab(callback){
        this.afterAddTabCallBack = callback;
    }

    _activate(e){
        let tabIndex;
        if(e.target.classList.contains("tab-anchor")){
            tabIndex = e.target.parentElement.getAttribute("tab-index");
        }else{
            tabIndex = e.target.getAttribute("tab-index");
        }
        this.activate(tabIndex);
    }

    activate(tabIndex){

        if(this.tabs[tabIndex]){

            if(this.tabs[this.activeTabIndex]){
                const currentLi = this.tabs[this.activeTabIndex];
                currentLi.classList.remove("active");
                const currentContnet = document.getElementById(currentLi.getAttribute("tab-control"));
                currentContnet.classList.remove("active-tab-content");
            }

            this.activeTabIndex = tabIndex;
            const li = this.tabs[tabIndex];
            li.classList.add("active");
            const content = document.getElementById(li.getAttribute("tab-control"));
            content.classList.add("active-tab-content");
        }
    }

    _closeTab(){

    }
}