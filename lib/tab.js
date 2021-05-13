export default class Tab{

    constructor(){
    }

    create(rootElement, baseTabId, tabName){

        this.tabArea = document.createElement("div");
        this.tab = document.createElement("ul");
        this.tab.classList.add("tab-label-container");
        this.tabArea.appendChild(this.tab);

        this.tabElements = {};
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
            addLi.classList.add("add-tab-label");
            const addDiv = document.createElement("div");
            addDiv.classList.add("add-tab-btn");
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
        span.classList.add("close-tab-btn");
        span.innerHTML = "&#10006;";
        span.addEventListener("click", this.closeTab.bind(this));

        li.appendChild(a);
        li.appendChild(span);
        this.tab.insertBefore(li, this.addBtn);

        const content = document.createElement("div");
        content.classList.add("tab-content");
        content.id = tabContentId;
        this.tabArea.appendChild(content);

        this.tabElements[this.tabIndex] = li;

        const tabData = {
            tab: li,
            content: content,
            tabIndex: this.tabIndex
        };

        if(this.afterAddTabCallback){
            this.afterAddTabCallback(tabData);
        }

        return tabData;

    }

    afterAddTab(callback){
        this.afterAddTabCallback = callback;
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

        if(this.tabElements[tabIndex]){

            if(this.tabElements[this.activeTabIndex]){
                const currentLi = this.tabElements[this.activeTabIndex];
                currentLi.classList.remove("active-tab");
                const currentContnet = document.getElementById(currentLi.getAttribute("tab-control"));
                currentContnet.classList.remove("active-tab-content");
            }

            this.activeTabIndex = tabIndex;
            const li = this.tabElements[tabIndex];
            li.classList.add("active-tab");
            const content = document.getElementById(li.getAttribute("tab-control"));
            content.classList.add("active-tab-content");
        }
    }

    closeTab(e){

        if(Object.keys(this.tabElements).length > 1){
            const li = e.target.parentElement;
            const tabindex = parseInt(li.getAttribute("tab-index"))
            const content = document.getElementById(li.getAttribute("tab-control"));
            const prevLi = li.previousSibling;
            const postLi = li.nextSibling;
            li.parentElement.removeChild(li);
            this.tabArea.removeChild(content);
            delete this.tabElements[tabindex];

            if(this.activeTabIndex == tabindex){
                if(prevLi){
                    this.activate(prevLi.getAttribute("tab-index"));
                }else{
                    this.activate(postLi.getAttribute("tab-index"));
                }
            }
        }

    }
}