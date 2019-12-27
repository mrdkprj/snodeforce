"use strict";

class GridTable {

	constructor(rootElement, data) {

		this.rootElement = $(rootElement);
		this.rootElement.empty();
		this.rootElement.height("500px");
		this.rootElement.css("overflow","auto");
		this.rootHeight = this.rootElement.height();
		this.rows = data.rows;
		this.header = data.header;
		this.sourceData = null;
		this.rowHeight = 22;
		this.itemCount = this.rows.length;
		this.totalContentHeight = this.itemCount * this.rowHeight;
		this.nodePadding = 1;
		this.extraRowCount = 0;
		this.startNode = 0;
		this.visibleNodesCount = 0;
		this.nodeOffsetY = 0;
		this.scrollCallback = null;
		this.columnWidths = null;
		this.filtered = false;
		this.headerHeight = 27;
		this.visibleViewportHeight = 0;
		this.container = null;
		this.table = null;
		this.viewport = null;
		this.visibleNodes = null;
		this.focusHolder = null;
		this.currentCell = null;
		this.currentCell = null;
		this.selectedCells = [];
		this.isDragging = false;
		this.startRowIndex = null;
		this.startCellIndex = null;
		this.endCellIndex = null;
		this.endRowIndex = null;
		this.isScrollSelecting = false;
		this.isAllSelected = false;
		this.isSelectingX = false;
		this.isSelectingY = false;
		this.lastSelectedCell = null;
		this.Delta = {
				Up:1,
				Down:2,
				Left:3,
				Right:4
			}

		this.assignEventHandlers();
		this.createGridTable();
	}

	assignEventHandlers(){
		$(document).on("mousedown", this.onDocumentMouseDown.bind(this));
		$(document).on("mouseup", this.onDocumentMouseUp.bind(this));
		$(document).on("keydown", this.onDocumentKeyDown.bind(this));
		$(document).on("copy" , this.onDocumentCopy.bind(this));
		this.rootElement.on("scroll", this.onRootScroll.bind(this));
	}

	createGridTable(){

		const _this = this;

		this.calculateWidths();

		const _guid = "gtbl_".concat(this.generateUuid());

		const rootScrollTop = this.rootElement.scrollTop();

		this.startNode = Math.floor(rootScrollTop / this.rowHeight) - this.nodePadding;
		this.startNode = Math.max(0, this.startNode);

		this.visibleNodesCount = Math.ceil(this.rootHeight / this.rowHeight) + this.extraRowCount * this.nodePadding;
		this.visibleNodesCount = Math.min(this.itemCount - this.startNode, this.visibleNodesCount);
		this.visibleViewportHeight = (this.rowHeight * (this.visibleNodesCount - 2)) - this.headerHeight;

		this.nodeOffsetY = this.startNode * this.rowHeight;

		this.container = $("<div>", { class: "gtbl-container", css: {"height": this.totalContentHeight + "px", "overflow": "hidden", "display":"inline-block"}});
		this.container.id = _guid;
		this.rootElement.append(this.container);

		this.table = $("<div>", { class: "gtbl gtbl-grid" });
		this.container.append(this.table);

		const _rowHeader = $("<div>", { class: "gtbl-row gtbl-row-header gtbl-hidden-row-header"});
		const _cornerCell = $("<div>", { class: "gtbl-header-cell gtbl-corner-cell stick"});
		_cornerCell.width(this.columnWidths[0] + "px");
		_cornerCell.on("click", this.onCornerCellClick.bind(this));
		_rowHeader.append(_cornerCell);
		this.header.forEach(function (item, index) {
			const header = $("<div>", { class: "gtbl-header-cell gtbl-col-header-cell stick", text: item });
			header.width(_this.columnWidths[index + 1] + "px");
			_rowHeader.append(header);
		});
		this.rootElement.prepend(_rowHeader);

		this.viewport = $("<div>", { class: "node-container", css:{"transform": "translateY(" + this.nodeOffsetY + "px)"}});
		this.table.append(this.viewport);

		this.visibleNodes = this.getVisibleChildNodes();
		this.viewport.append(this.visibleNodes);

		this.focusHolder = $("<input id='focusHolder' type='text' value='' style='position:fixed;top:-100px;left:-100px;'/>");
		this.rootElement.append(this.focusHolder);
	}

	getVisibleChildNodes(){
		const _this = this;
		return new Array(this.visibleNodesCount)
		.fill(null)
		.map((_, index) => _this.renderItem(index + _this.startNode));
	}

	onRootScroll(e){

		const _this = this;
		this.startNode = Math.floor(e.target.scrollTop / this.rowHeight) - this.nodePadding;
		this.startNode = Math.max(0, this.startNode);

		this.nodeOffsetY = this.startNode * this.rowHeight;

		if(this.currentCell){
			this.currentCell.Node.removeClass("current");
		}

		this.viewport.css("transform","translateY(" + this.nodeOffsetY + "px)");
		$(".gtbl-row-header-cell").css("transform","translate3D(" + e.target.scrollLeft + "px,0,0)");

		new Array(this.visibleNodesCount).fill(null)
		.map((_, index) => _this.getRowAt(index + _this.startNode))
		.forEach((row, rowIndex) => _this.changeRowValue(row, rowIndex));

		this.selectOnScroll(e);

		if(this.scrollCallback){
			this.scrollCallback();
			this.scrollCallback = null;
		}
	}

	getRowAt(i){
		return [i + 1].concat(this.rows[i]);
	}

	changeRowValue(rowArray, arrayIndex){

		const _this = this;
		const rowIndex = arrayIndex + this.startNode;

		rowArray.forEach((value, index) => {

			const node = _this.visibleNodes[arrayIndex][0].childNodes[index];
			node.innerHTML = value;
			if(_this.currentCell && _this.currentCell.RowIndex == rowIndex && _this.currentCell.ColumnIndex == index - 1){
				_this.currentCell = _this.getCellNode($(node));
				_this.currentCell.Node.addClass("current");
			}
		});
	}

	calculateWidths(){
		const _font = this.rootElement.css("font");
		const _numberColumnWidth = getStringWidth(this.rows.length, false);
		const _maxLengthValues = reduceString([this.header].concat(this.rows));
		this.columnWidths = [_numberColumnWidth].concat(_maxLengthValues.map(item => getStringWidth(item, true)));

		function transpose(array) {
			return Object.keys(array[0]).map(function(key) {
				return array.map(function(item) { return item[key]; });
			});
		}

		function reduceString(array){
			return transpose(array).map(item => item.reduce(function (a, b) { return a.length > b.length ? a : b; }));
		}

		function getStringWidth(text, padding){
			const canvas = getStringWidth.canvas || (getStringWidth.canvas = document.createElement("canvas"));
			const context = canvas.getContext("2d");
			context.font = _font;
			const metrics = context.measureText(text);
			/*
			if(metrics.width > 500){
				return 500;
			}
			*/
			if(padding){
				return metrics.width + 32;
			}else{
				return metrics.width + 20;
			}
		}
	}

	renderItem(i){

		const _this = this;

		const row = this.rows[i];

		const rowDiv = $("<div>", { class: "gtbl-row gtbl-detail" });

		const rowHeaderCell = $("<div>", { class: "gtbl-header-cell gtbl-row-header-cell stick", css:{"transform": "translate3D(0, 0, 0)"}, text: i + 1 });

		if(i == 0){
			rowHeaderCell.width(this.columnWidths[0] + "px");
		}

		rowDiv.append(rowHeaderCell);

		row.forEach(function (cellvalue, cellIndex) {
			const cell = $("<div>", { class: "gtbl-value-cell", text: cellvalue });
			cell.on("mousedown", _this.onCellMouseDown.bind(_this));
			cell.on("mouseup", _this.onCellMouseUp.bind(_this));
			cell.on("mouseover", _this.onCellMouseOver.bind(_this));
			cell.on("dblclick", _this.onCellDblClick.bind(_this));

			if(i == 0){
				cell.width(_this.columnWidths[cellIndex + 1] + "px");
			}

			rowDiv.append(cell);

		});

		return rowDiv;
	}


	onCellDblClick(e){
		this.currentCell.Node.addClass("edit");
	}

	onDocumentMouseDown(e) {
		this.isDragging = false;
			/*clearSelection();
			if(this.currentCell){
				this.currentCell.Node.removeClass("current");
				this.currentCell = null;
			}*/
	}

	onDocumentMouseUp(e) {
		this.isDragging = false;
	}

	onCornerCellClick(e){
		this.setFocus();
		this.selectAll();
	}

	onDocumentKeyDown(e){

		if(!this.hasFocus()){
			return true;
		}

		if (e.ctrlKey && e.key === "a" && this.currentCell) {
			e.preventDefault();
			this.selectAll();
		}

		// left
		if(e.keyCode == 37){

			if(this.currentCell.ColumnIndex  <= 0) return;

			if(this.shouldScrollToCurrent()){
				this.scrollCallback = moveLeft;
				return;
			}
			this.moveLeft();
		}

		// right
		if(e.keyCode == 39){

			if(this.currentCell.ColumnIndex == this.header.length - 1) return;

			if(this.shouldScrollToCurrent()){
				this.scrollCallback = moveRight;
				return;
			}
			this.moveRight();
		}

		// up
		if(e.keyCode == 38){

			if(this.currentCell.RowIndex  == 0) return;

			if(this.shouldScrollToCurrent()){
				this.scrollCallback = moveUp;
				return;
			}
			this.moveUp();
		}

		// down
		if(e.keyCode == 40){

			if(this.currentCell.RowIndex + 1 == this.rows.length) return;

			if(this.shouldScrollToCurrent()){
				this.scrollCallback = moveDown;
				return;
			}
			this.moveDown();

		}

	}

	shouldScrollToCurrent(){

		// hidden below
		if(this.currentCell.RowIndex > this.startNode + this.visibleNodesCount){
			const position = this.rowHeight * (this.currentCell.RowIndex - (this.visibleNodesCount - 3));
			this.rootElement.scrollTop(this.rootElement.scrollTop() + position);
			return true;
		}

		// hidden above
		if(this.currentCell.RowIndex < this.startNode){
			const position = this.rowHeight * this.currentCell.RowIndex;
			this.rootElement.scrollTop(position);
			return true;
		}

		return false;
	}

	moveUp(){
		const up = this.currentCell.Node.parent().prev().children().eq(this.currentCell.Node.index());
		this.markCurrent(up);
	}

	moveDown(){
		const down = this.currentCell.Node.parent().next().children().eq(this.currentCell.Node.index());
		this.markCurrent(down);
	}

	moveLeft(){
		const prev = this.currentCell.Node.prev();
		this.markCurrent(prev)
	}

	moveRight(){
		const next = this.currentCell.Node.next();
		this.markCurrent(next)
	}

	onDocumentCopy(e){
		if(this.hasFocus()){
			this.copyToClipboard(e);
		}
	}

	hasFocus(){
		return this.focusHolder.is(":focus");
	}

	setFocus(){
		this.focusHolder.focus();
	}

	onCellMouseDown(e) {

		this.setFocus();

		const cell = $(e.target);

		if(cell.hasClass("edit")){
			return true;
		}else{
			$(".edit").removeClass("edit");
		}

		this.isDragging = true;
		this.isScrollSelecting = true;
		this.isAllSelected = false;
		this.lastSelectedCell = null;

		if (!e.shiftKey) {
			this.markCurrent(cell);
		}

		this.setSelectionDataRange(this.currentCell.RowIndex, this.currentCell.RowIndex,this.currentCell.ColumnIndex,this.currentCell.ColumnIndex);

		if (e.shiftKey) {
			this.clearSelection();
			this.lastSelectedCell = this.getCellNode(cell);
			this.setStartRow(this.lastSelectedCell);
			this.setSelectionDataRange(this.startRowIndex, this.lastSelectedCell.RowIndex, this.currentCell.ColumnIndex, this.lastSelectedCell.ColumnIndex);
			this.selectTo(cell);
		}else {
			this.startCellIndex = cell.index() - 1;
			this.startRowIndex = cell.parent().index();
		}

		return false;
	}

	onCellMouseUp(e) {
		this.isDragging = false;
		this.isScrollSelecting = false;
	}

	onCellMouseOver(e) {

		if (!this.isDragging) return;

		const cell = $(e.target);

		this.clearSelection();

		this.lastSelectedCell = this.getCellNode(cell);

		this.selectTo(cell);

		this.isSelectingX = this.scrollX(cell);
		this.isSelectingY = this.scrollY(cell);
		this.isScrollSelecting = this.isSelectingX || this.isSelectingY;
	}

	selectTo(cell) {
		const _this = this;
		const row = cell.parent();
		const cellIndex = cell.index() - 1;
		const rowIndex = row.index();

		this.selectedCells = [];

		const rowStart = Math.min(rowIndex, this.startRowIndex);
		const rowEnd = Math.max(rowIndex, this.startRowIndex);
		const cellStart = Math.min(cellIndex, this.startCellIndex);
		const cellEnd = Math.max(cellIndex, this.startCellIndex);

		for (var i = rowStart; i <= rowEnd; i++) {

			const row = _this.container.find(".gtbl-detail").eq(i);

			const rowCells = row.find(".gtbl-value-cell");
			for (var j = cellStart; j <= cellEnd; j++) {
				rowCells.eq(j).addClass("highlight");
			}
		}

		this.setSelectionDataRange(this.currentCell.RowIndex, rowIndex + this.startNode,
			cellStart, cellEnd);
	}

	markCurrent(target){

		this.clearSelection();

		if(this.currentCell){
			this.currentCell.Node.removeClass("current");
		}

		this.currentCell = this.getCellNode(target);

		this.currentCell.Node.addClass("current");

		this.isSelectingX = this.scrollX(target);
		this.isSelectingY = this.scrollY(target);
		this.isScrollSelecting = this.isSelectingX || this.isSelectingY;
	}

	scrollX(target){
		const position = target.position();
		const scrollLeft = this.rootElement.scrollLeft();

		if(scrollLeft + position.left - this.columnWidths[0] <= 0){
			return false;
		}

		if(position.left - target.prev().outerWidth() == 0){
			this.rootElement.scrollLeft(0);
			return true;
		}

		if(scrollLeft >= position.left){
			this.rootElement.scrollLeft(scrollLeft - target.width());
			return true;
		}

		if(scrollLeft + position.left + target.width() >= this.rootElement.width()){
			this.rootElement.scrollLeft(scrollLeft + target.width());
			return true;
		}

		return false;
	}

	scrollY(target){
		const pad = 0;//10;
		const position = target.position();
		const scrollTop = this.rootElement.scrollTop();

		if(scrollTop + position.top == 0 || scrollTop + position.top + this.rowHeight == this.totalContentHeight){
			return false;
		}

		if(position.top - this.headerHeight == 0){
			this.rootElement.scrollTop(0);
			return true;
		}

		if(scrollTop >= position.top + pad){
			this.rootElement.scrollTop(scrollTop - this.rowHeight);
			return true;
		}

		if(position.top + this.rowHeight == this.totalContentHeight){
			this.rootElement.scrollTop(this.totalContentHeight);
			return true;
		}

		if(scrollTop +  this.visibleViewportHeight + pad <= position.top){
			this.rootElement.scrollTop(scrollTop + this.rowHeight);
			return true;
		}

		return false;
	}

	selectOnScroll(e){

		if(!this.isScrollSelecting){
			this.isDragging = false;
		}

		if(this.isAllSelected){
			return true;
		}

		if(this.lastSelectedCell){

			this.clearSelection();

			this.virtualSelectTo(this.container, this.lastSelectedCell, true);
		}
	}

	setStartRow(cell){
		const endRowIndex = cell.RowIndex;
		let rowIndex, startRowIndex;
		let dir;
		// up
		if(this.currentCell.RowIndex >= endRowIndex){
			if(this.currentCell.RowIndex < this.startNode){
				return;
			}
			dir = this.Delta.Up;
			rowIndex = Math.abs(this.startNode - this.currentCell.RowIndex);
			startRowIndex = Math.max(0, this.lastSelectedCell.RowIndex - this.startNode);
		// down
		}else{
			if(cell.RowIndex < this.startNode){
				return;
			}
			dir = this.Delta.Down;
			rowIndex = Math.abs(this.startNode - this.lastSelectedCell.RowIndex);
			startRowIndex = Math.max(0, this.currentCell.RowIndex - this.startNode);
		}

		if(dir == this.Delta.Up){
			this.startRowIndex = Math.max(rowIndex, startRowIndex);
			this.endRowIndex = Math.min(rowIndex, startRowIndex);
		}else{
			this.startRowIndex = Math.min(rowIndex, startRowIndex);
			this.endRowIndex = Math.max(rowIndex, startRowIndex);
		}

		this.startCellIndex = this.currentCell.ColumnIndex;
		this.endCellIndex = cell.ColumnIndex;

	}

	virtualSelectTo(table, cell) {
		this.setStartRow(cell);
		const rowStart = Math.min(this.endRowIndex, this.startRowIndex);
		const rowEnd = Math.max(this.endRowIndex, this.startRowIndex);
		const cellStart = Math.min(this.endCellIndex, this.startCellIndex);
		const cellEnd = Math.max(this.endCellIndex, this.startCellIndex);

		for (var i = rowStart; i <= rowEnd; i++) {

			const row = table.find(".gtbl-detail").eq(i);

			const rowCells = row.find(".gtbl-value-cell");

			for (var j = cellStart; j <= cellEnd; j++) {
				rowCells.eq(j).addClass("highlight");
			}
		}
	}

	selectAll(){

		this.isAllSelected = true;

		Array.from(this.visibleNodes).forEach(node => {
			Array.from(node.children()).forEach((cell, index) => {
				if(index > 0){
					$(cell).addClass("highlight");
				}
			});
		})

		this.setSelectionDataRange(0, this.rows.length - 1, 0, this.header.length - 1);
	}

	clearSelection(){
		$(".highlight").removeClass("highlight");
	}

	getCellNode(cell){
		return	{
			Node: cell,
			RowIndex: cell.parent().index() + this.startNode,
			ColumnIndex: cell.index() - 1
		};
	}

	setSelectionDataRange(startRow, endRow, startCol, endCol){
		this.selectedCells = {
			StartRow: Math.min(startRow, endRow),
			EndRow: Math.max(startRow, endRow),
			StartColumn: Math.min(startCol,endCol),
			EndColumn: Math.max(startCol,endCol)
		}
	}

	resetSelectionDataRange(){
		setSelectionDataRange(0,0,0,0);
	}

	copyToClipboard(e){

		e.preventDefault();

		const _this = this;
		const dataArray = [];

		for(let row = this.selectedCells.StartRow; row <= this.selectedCells.EndRow; row++){
			dataArray.push(_this.rows[row].slice(_this.selectedCells.StartColumn, _this.selectedCells.EndColumn + 1).join("\t"));
		}

		const clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;

		clipboardData.setData("text/plain" , dataArray.join("\n"));
	}

	generateUuid() {
		let chars = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".split("");
		for (let i = 0, len = chars.length; i < len; i++) {
			switch (chars[i]) {
				case "x":
					chars[i] = Math.floor(Math.random() * 16).toString(16);
					break;
				case "y":
					chars[i] = (Math.floor(Math.random() * 4) + 8).toString(16);
					break;
			}
		}
		return chars.join("");
	}

	renderNodes(){

		this.currentCell = null;
		this.lastSelectedCell = null;
		this.startNode = 0;
		this.itemCount = this.rows.length;
		this.resetSelectionDataRange();

		this.totalContentHeight = this.itemCount * this.rowHeight;
		this.container.css("height", this.totalContentHeight);

		this.visibleNodesCount = Math.ceil(this.rootHeight / this.rowHeight) + this.extraRowCount * this.nodePadding;
		this.visibleNodesCount = Math.min(this.itemCount - this.startNode, this.visibleNodesCount);

		this.nodeOffsetY = this.startNode * this.rowHeight;

		this.viewport.css("transform","translateY(" + this.nodeOffsetY + "px)");
		$(".gtbl-row-header-cell").css("transform","translate3D(0,0,0)");

		this.viewport.empty();
		this.visibleNodes = this.getVisibleChildNodes();
		this.viewport.append(this.visibleNodes);
		this.rootElement.scrollTop(0);
		this.rootElement.scrollLeft(0);
	}

	filter(columnIndex, value){
		if(columnIndex == 0){
			return;
		}
		// test
		if(this.filtered){
			this.clearFilter();
			return;
		}
		// test
		this.filtered = true;
		this.sourceData = this.rows;
		const data = [];

		this.sourceData.forEach(function(row){

			row.forEach(function(item, index){{

				if(index == columnIndex && item == value){
					data.push(row);
					return false;
				}

			}});

		});

		this.rows = data;
		this.renderNodes();
	}

	clearFilter(){
		this.filtered = false;
		this.rows = this.sourceData;
		this.sourceData = null;
		this.renderNodes();
	}

}

