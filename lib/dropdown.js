import {Util} from "./gridtable.js";

export default class Dropdown{

	constructor(parent, options){
		this.container = document.createElement("div");
		this.container.classList.add("filter-dropdown");
		this.container.style.display = "none";
		this.container.setAttribute("tabindex", "0");
		this.container.addEventListener("blur", this.onBlur.bind(this));
		this.filterArea = document.createElement("div");
		this.filterArea.classList.add("filter-dropdown-area");
		this.filterAreaStyles = {
			width: this.filterArea.style.width,
			height: this.filterArea.style.height
		}

		const searchArea = document.createElement("div");
		searchArea.classList.add("search-text-area");
		const searchTextContainer = document.createElement("span");
		this.searchText = document.createElement("input");
		this.searchText.type = "text";
		this.searchText.classList.add("search-text");
		this.searchText.addEventListener("input", this.filter.bind(this));
		const clearTextBtn = document.createElement("div");
		clearTextBtn.classList.add("clear-text");
		clearTextBtn.innerHTML = "&#10006;";
		clearTextBtn.addEventListener("click", this.clearTextFilter.bind(this));
		searchTextContainer.append(this.searchText, clearTextBtn);
		searchArea.appendChild(searchTextContainer);

		this.dropdownArea = document.createElement("div");
		this.dropdownArea.classList.add("dropdown");
		this.dropdownArea.addEventListener("scroll", this.onScroll.bind(this));

		this.options = document.createElement("ul");
		this.options.classList.add("options");

		this.viewport = document.createElement("div");
		this.viewport.classList.add("dropdown-viewport")
		this.viewport.appendChild(this.options);
		this.dropdownArea.appendChild(this.viewport);

		const buttonArea = document.createElement("div");
		buttonArea.classList.add("btn-area");
		const buttons = document.createElement("div");
		buttons.classList.add("btns");
		const okBtn = document.createElement("button");
		okBtn.classList.add("btn","btn-sub");
		okBtn.textContent = "OK";
		okBtn.addEventListener("click", this._onOKButtonClick.bind(this));
		const clearFilterBtn = document.createElement("button");
		clearFilterBtn.classList.add("btn","btn-sub");
		clearFilterBtn.textContent = "Clear";
		clearFilterBtn.addEventListener("click", this.clear.bind(this));
		const cancelBtn = document.createElement("button");
		cancelBtn.classList.add("btn","btn-sub");
		cancelBtn.addEventListener("click", this.close.bind(this));
		cancelBtn.textContent = "Cancel";

		buttons.append(okBtn, clearFilterBtn, cancelBtn);
		buttonArea.appendChild(buttons);

		this.filterArea.append(searchArea, this.dropdownArea, buttonArea);
		this.container.append(this.filterArea);
		parent.appendChild(this.container)

		this.animationFrame = null;

		this._init();

		this.afterDropdownClose = options.afterDropdownClose;
		this.clearFilter = options.clearFilter;
		this.calculationBaseStyles = {
			rowHeight: 20,
			font: "12px Verdana,Arial,sans-serif",
			width: 200,
			height:200,
			padding:0
		}
	}

	_init(){
		this.isFiltered = false;
		this.IsOpened = false;
		this.visibleIndices = [];
		this.filteredIndices = [];
		this._rawIndex = [];
		this.checkedIndex = new Set();
		this.filteredValue = null;
		this.prev = {
			filteredIndices: null,
			checkedIndex: null,
			filteredValue: null,
			type:null
		}
		this.itemCount = 0;
		this.currentColumnIndex = -1;
		this.values = null;
		this.selectedValues = [];
		this.visibleNodes = null;
		this.nodeOffsetY = 0;
		this.type = null;
	}

	open(index, values, rect){

		this.IsOpened = true;
		this.currentColumnIndex = index;
		this.values = Array.from(values);
		this.values.unshift("Select All");
		this.itemCount = this.values.length;
		this.selectedValues = [];

		if(this.isFiltered && this.currentColumnIndex == this.filteredColumn){
			this._restore();
			this._rawIndex = this.values.map((e,i) => i);
			this.searchText.value = this.filteredValue;
		}else{
			this.filteredIndices = this.values.map((e,i) => i);
			this._rawIndex = this.filteredIndices;
			this.checkedIndex = new Set();
			this.filteredValue = null;
			this.type = Util.getType(values);
			this.searchText.value = this.filteredValue;
		}

		this._createOptions();

		const marginLeft = rect.width - this.calculationBaseStyles.width;
		const left = rect.X + marginLeft > rect.minLeft ? rect.X + marginLeft : rect.minLeft;

		this.container.style.top = rect.Y + "px";
		this.container.style.left = left + "px";
		this.container.style.display = "block";
		this.dropdownArea.scrollTop = 0;
		this.dropdownArea.scrollLeft = 0;

		this.container.focus();
		this.viewport.style.width = Util.getStringWidth(Util.reduceString(this.values), true, this.calculationBaseStyles) + "px";
		this.viewport.style.height = this.totalContentHeight + "px";
	}

	_createOptions(checkAll){

		this._prepareVirtualScroll(0, true);
		this.options.innerHTML = "";
		this.visibleNodes = [];

		const options = document.createDocumentFragment();
		this.visibleIndices.forEach(visibleIndex => {
			const li = document.createElement("li");
			const label = document.createElement("label");
			label.classList.add("option");
			const chk = document.createElement("input");
			if(visibleIndex == 0){
				chk.classList.add("select-all");
			}
			chk.type = "checkbox";
			if(checkAll){
				chk.checked = true;
			}
			chk.addEventListener("change", this.toggleCheck.bind(this));
			if(this.filteredColumn == this.currentColumnIndex && this.checkedIndex.has(visibleIndex)){
				chk.checked = true;
			}
			const sp = document.createElement("span");
			sp.textContent = this.values[visibleIndex];
			label.append(chk, sp);
			li.append(label);
			options.append(li);
			this.visibleNodes.push(label);

		})

		this.options.append(options);
	}

	close(){
		this.IsOpened = false;
		this.container.style.display = "none";
	}

	filter(e){

		if(this.searchText.value == null || this.searchText.value == ""){
			this.clearTextFilter();
			return;
		}

		this.filteredValue = e.target.value;
		this.filteredIndices = [];

		const target = Util.toStringNullSafe(e.target.value).toUpperCase();

		this.values.forEach((row, rowIndex) => {

			if(rowIndex == 0 || Util.toStringNullSafe(row).toUpperCase().includes(target)){
				this.filteredIndices.push(rowIndex);
			}

		});

		this._createOptions(true);

		this.checkedIndex = new Set(this.filteredIndices);
	}

	clearTextFilter(){
		this.searchText.value = null;
		this.filteredValue = null;
		this.filteredIndices = this._rawIndex;
		this.checkedIndex = new Set();
		this._createOptions();
	}

	clear(){
		this.isFiltered = false;
		this.close();
		if(this.clearFilter){
			this.clearFilter();
		}
	}

	toggleCheck(e){

		if(e.target.classList.contains("select-all")){
			if(e.target.checked){
				this.options.querySelectorAll("input").forEach((e,i) => {if(i > 0) e.checked = true});
				this.checkedIndex = new Set(this.filteredIndices);
			}else{
				this.options.querySelectorAll("input").forEach((e,i) => {if(i > 0) e.checked = false});
				this.checkedIndex = new Set();
			}
		}else{
			const value = Util.convert(e.target.nextElementSibling.textContent, this.type);

			if(e.target.checked){
				this.checkedIndex.add(this.values.indexOf(value));
			}else{
				this.checkedIndex.delete(this.values.indexOf(value));
			}
		}


	}

	_onOKButtonClick(e){

		const isFiltered = () => {

			if(this.checkedIndex.size == this.itemCount) return false;

			if(this.checkedIndex.size > 0) return true;

			return false;
		}

		this.isFiltered = isFiltered();

		if(this.isFiltered){
			this.filteredColumn = this.currentColumnIndex;
			this.SelectedValues = Array.from(this.checkedIndex).map(e => this.values[e]);
			this._save();
		}

		if(this.afterDropdownClose){
			this.afterDropdownClose(this.currentColumnIndex, this.SelectedValues);
		}

		this.close();
	}

	_save(){
		this.prev.filteredIndices = this.filteredIndices;
		this.prev.checkedIndex = this.checkedIndex;
		this.prev.filteredValue = this.filteredValue;
		this.prev.type = this.type;
	}

	_restore(){
		this.filteredIndices = this.prev.filteredIndices;
		this.checkedIndex = this.prev.checkedIndex;
		this.filteredValue = this.prev.filteredValue;
		this.type = this.prev.type;
	}


	onScroll(e){
		if (this.animationFrame) {
			window.cancelAnimationFrame(this.animationFrame);
		}

		this.animationFrame = window.requestAnimationFrame(() => this.doVirtualScroll(e));
	}

	_prepareVirtualScroll(scrollTop, reset){

		const nodePadding = 0;

		if(reset){
			this.totalContentHeight = this.itemCount * this.calculationBaseStyles.rowHeight;
		}

		this.startNode = Math.floor(scrollTop / this.calculationBaseStyles.rowHeight) - nodePadding;
		this.startNode = Math.max(0, this.startNode);

		let visibleNodesCount = Math.ceil(this.calculationBaseStyles.height / this.calculationBaseStyles.rowHeight) + 2 * nodePadding;
		visibleNodesCount = Math.min(this.itemCount - this.startNode, visibleNodesCount);

		this.nodeOffsetY = this.startNode * this.calculationBaseStyles.rowHeight;

		this.visibleIndices = this.filteredIndices.slice(this.startNode, this.startNode + visibleNodesCount);

	}


	doVirtualScroll(e){

		this._prepareVirtualScroll(e.target.scrollTop, false);

		this.visibleIndices.forEach((visibleIndex, rowIndex) => {

			if(visibleIndex == 0){
				this.visibleNodes[rowIndex].childNodes[0].classList.add("select-all");
			}else{
				this.visibleNodes[rowIndex].childNodes[0].classList.remove("select-all");
			}

			this.visibleNodes[rowIndex].childNodes[0].checked = this.checkedIndex.has(visibleIndex)

			this.visibleNodes[rowIndex].childNodes[1].textContent = this.values[visibleIndex]
		});

		this.options.style.top = this.nodeOffsetY + "px";

	}

	onBlur(e){

		if(!this.container.contains(e.relatedTarget)){
			this.close();
		}
	}

}
