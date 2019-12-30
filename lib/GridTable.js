"use strict";

const GridTable = (() => {

    const wm = new WeakMap()

    const privates = function(instance) {
        return wm.get(instance) || wm.set(instance, {}).get(instance)
    }

	return class GridTable {

		constructor(rootElement, data) {

			this.rootElement = $(rootElement);
			this.rootHeight = 500;

			/*
						privates(this).data = {
				rows: data.rows,
				header: data.header,
				_rows: null
			}
			*/
			this.rows = data.rows;
			this.header = data.header;
			this._rows = null;

			this.rowHeight = 22;
			this.itemCount = this.rows.length;
			this.totalContentHeight = 0;
			this.nodePadding = 1;
			this.extraRowCount = 0;
			this.startNode = 0;
			this.visibleNodesCount = 0;
			this.nodeOffsetY = 0;
			this.nodeOffsetX = 0;
			this.headerHeight = 27;
			this.visibleViewportHeight = 0;

			this.columnWidths = Util.getColumnWidths(this.header, this.rows, this.rootElement.css("font"));

			this.lastPostion = {X:0,Y:0};
			this.scrollCallback = null;
			this.filtered = false;
			this.isDragging = false;
			this.scrolledBySelection = false;
			this.isAllSelected = false;

			this.container = null;
			this.table = null;
			this.viewport = null;
			this.visibleNodes = null;
			this.focusHolder = null;
			this.rowHeaderCells = [];

			this.current = null;
			this.last = null;
			this.selection = new Selection();
			this.virtualSelection = new Selection();

			this.startRowIndex = null;
			this.startCellIndex = null;
			this.endCellIndex = null;
			this.endRowIndex = null;

			this.Delta = {
					Up:1,
					Down:2,
					Left:3,
					Right:4
			};

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
			this.rootElement.empty();
			this.rootElement.height(this.rootHeight + "px");
			this.rootElement.css("overflow","auto");

			this.prepareVirtualScroll(this.rootElement.scrollTop(), this.rootElement.scrollLeft(), true);
			this.createContainer();
			this.createHeader();
			this.createTable();

			this.focusHolder = $("<input class='focusHolder' type='text' value='' style='position:fixed;top:-100px;left:-100px;'/>");
			this.rootElement.append(this.focusHolder);
		}

		prepareVirtualScroll(scrollTop, scrollLeft, reset){

			if(reset){
				this.totalContentHeight = this.itemCount * this.rowHeight;
			}

			this.startNode = Math.floor(scrollTop / this.rowHeight) - this.nodePadding;
			this.startNode = Math.max(0, this.startNode);

			if(reset){
				this.visibleNodesCount = Math.ceil(this.rootHeight / this.rowHeight) + this.extraRowCount * this.nodePadding;
				this.visibleNodesCount = Math.min(this.itemCount - this.startNode, this.visibleNodesCount);
				this.visibleViewportHeight = (this.rowHeight * (this.visibleNodesCount - 2)) - this.headerHeight;
			}

			this.nodeOffsetY = this.startNode * this.rowHeight;
			this.nodeOffsetX = scrollLeft;
		}

		createContainer(){
			this.container = $("<div>", { class: "gtbl-container", css: {"height": this.totalContentHeight + "px", "overflow": "hidden", "display":"inline-block"}});
			this.container.id = "gtbl_".concat(this.generateUuid());;
			this.rootElement.append(this.container);

			this.table = $("<div>", { class: "gtbl gtbl-grid" });
			this.container.append(this.table);
		}

		createHeader(){
			const _this = this;

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
		}

		createTable(){
			this.viewport = $("<div>", { class: "node-container", css:{"transform": "translateY(0px)"}});
			this.table.append(this.viewport);

			this.visibleNodes = this.getVisibleChildNodes();
			this.viewport.append(this.visibleNodes);
		}

		getVisibleChildNodes(){
			const _this = this;
			this.rowHeaderCells = [];

			return new Array(this.visibleNodesCount)
				.fill(null)
				.map((_, index) => _this.renderItem(index + _this.startNode));
		}

		renderItem(rowIndex){

			const _this = this;

			const _row = this.rows[rowIndex];

			const _isFirstRow = rowIndex == 0;

			const _rowDiv = $("<div>", { class: "gtbl-row gtbl-detail" });

			const _rowHeaderCell = $("<div>", { class: "gtbl-header-cell gtbl-row-header-cell stick", css:{"transform": "translate3D(0px, 0px, 0px)"}, text: rowIndex + 1 });

			if(_isFirstRow){
				_rowHeaderCell.width(this.columnWidths[0] + "px");
			}

			this.rowHeaderCells.push(_rowHeaderCell);

			_rowDiv.append(_rowHeaderCell);

			_row.forEach(function (cellvalue, cellIndex) {
				const cell = $("<div>", { class: "gtbl-value-cell", text: cellvalue });
				cell.on("mousedown", _this.onCellMouseDown.bind(_this));
				cell.on("mouseup", _this.onCellMouseUp.bind(_this));
				cell.on("mouseover", _this.onCellMouseOver.bind(_this));
				cell.on("dblclick", _this.onCellDblClick.bind(_this));

				if(_isFirstRow){
					cell.width(_this.columnWidths[cellIndex + 1] + "px");
				}

				_rowDiv.append(cell);

			});

			return _rowDiv;
		}

		onRootScroll(e){

			const _this = this;

			this.prepareVirtualScroll(e.target.scrollTop, e.target.scrollLeft);

			if(this.current){
				this.current.Node.removeClass("current");
			}

			this.alterTransform();

			const getRowAt = function(i){
				return [i + 1].concat(_this.rows[i]);
			}

			const changeRowValue = function(rowArray, arrayIndex){
				const rowIndex = arrayIndex + _this.startNode;

				rowArray.forEach((value, index) => {

					const node = _this.visibleNodes[arrayIndex][0].childNodes[index];
					node.innerHTML = value;

					if(_this.current && _this.current.Cell.RowIndex == rowIndex && _this.current.Cell.ColumnIndex == index - 1){
						_this.current = _this.getCellNode($(node));
						_this.current.Node.addClass("current");
					}

				});
			}

			new Array(this.visibleNodesCount)
				.fill(null)
				.map((_, index) => getRowAt(index + _this.startNode))
				.forEach((row, rowIndex) => changeRowValue(row, rowIndex));

			this.changeVirtualSelection();

			if(this.scrollCallback){
				this.scrollCallback();
				this.scrollCallback = null;
			}
		}

		alterTransform(){
			this.viewport.css("transform","translateY(" + this.nodeOffsetY + "px)");
			this.rowHeaderCells.forEach((cell) =>{
				cell.css("transform","translate3D(" + this.nodeOffsetX + "px,0px,0px)");
			});
		}


		onCellDblClick(e){
			this.current.Node.addClass("edit");
		}

		onDocumentMouseDown(e) {
			this.isDragging = false;
				/*clearSelection();
				if(this.current){
					this.current.Node.removeClass("current");
					this.current = null;
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

			if(!this.hasFocus()) return true;

			if (e.ctrlKey && e.key === "a" && this.current) {
				e.preventDefault();
				this.selectAll();
			}

			switch (e.keyCode) {
				// left
				case 37:
					if(this.current.Cell.ColumnIndex  <= 0) return;

					if(this.shouldScrollToCurrent()){
						this.scrollCallback = moveLeft;
						return;
					}
					this.moveLeft();
					break;

				// right
				case 39:
					if(this.current.Cell.ColumnIndex == this.header.length - 1) return;

					if(this.shouldScrollToCurrent()){
						this.scrollCallback = moveRight;
						return;
					}
					this.moveRight();
					break;

				// up
				case 38:
					if(this.current.Cell.RowIndex  == 0) return;

					if(this.shouldScrollToCurrent()){
						this.scrollCallback = moveUp;
						return;
					}
					this.moveUp();
					break;

				// down
				case 40:
					if(this.current.Cell.RowIndex + 1 == this.rows.length) return;

					if(this.shouldScrollToCurrent()){
						this.scrollCallback = moveDown;
						return;
					}
					this.moveDown();
					break;
			}

		}

		shouldScrollToCurrent(){

			// hidden below
			if(this.current.Cell.RowIndex > this.startNode + this.visibleNodesCount){
				const position = this.rowHeight * (this.current.Cell.RowIndex - (this.visibleNodesCount - 3));
				this.rootElement.scrollTop(this.rootElement.scrollTop() + position);
				return true;
			}

			// hidden above
			if(this.current.Cell.RowIndex < this.startNode){
				const position = this.rowHeight * this.current.Cell.RowIndex;
				this.rootElement.scrollTop(position);
				return true;
			}

			return false;
		}

		moveUp(){
			const up = this.current.Node.parent().prev().children().eq(this.current.Node.index());
			this.markCurrent(up);
		}

		moveDown(){
			const down = this.current.Node.parent().next().children().eq(this.current.Node.index());
			this.markCurrent(down);
		}

		moveLeft(){
			const prev = this.current.Node.prev();
			this.markCurrent(prev)
		}

		moveRight(){
			const next = this.current.Node.next();
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

		onCellMouseUp(e) {
			this.isDragging = false;
			this.scrolledBySelection = false;
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
			this.scrolledBySelection = true;
			this.isAllSelected = false;

			if (e.shiftKey) {
				this.selectByShift(cell);
			}else {
				this.selectByMouseDown(cell);
			}

			return false;
		}

		selectByMouseDown(cell){
			this.markCurrent(cell);
			this.last = this.current;
			this.updateSelection(this.current.Cell.RowIndex, this.current.Cell.RowIndex,this.current.Cell.ColumnIndex,this.current.Cell.ColumnIndex);
			//this.virtualSelection.StartCell = cell.index() - 1;
			//this.virtualSelection.StartRow = cell.parent().index();
			this.updateVirtualSelection(this.current);
		}

		selectByShift(cell){
			this.clearSelection();
			this.last = this.getCellNode(cell);
			this.updateVirtualSelection(this.last);
			this.updateSelection(this.startRowIndex, this.last.Cell.RowIndex, this.current.Cell.ColumnIndex, this.last.Cell.ColumnIndex);
			this.changeSelection(cell);
		}

		markCurrent(cell){

			this.clearSelection();

			if(this.current){
				this.current.Node.removeClass("current");
			}

			this.current = this.getCellNode(cell);

			this.current.Node.addClass("current");

			const isSelectingX = this.scrollX(cell);
			const isSelectingY = this.scrollY(cell);
			this.scrolledBySelection = isSelectingX || isSelectingY;
			this.isMarkScroll = true;
		}

		onCellMouseOver(e) {

			if (!this.isDragging) return;

			if(this.isMarkScroll){
				this.isMarkScroll = false;
				return;
			}

			const cell = $(e.target);

			this.clearSelection();

			this.last = this.getCellNode(cell);

			this.changeSelection(cell);

			const isSelectingX = this.scrollX(cell);
			const isSelectingY = this.scrollY(cell);
			this.scrolledBySelection = isSelectingX || isSelectingY;
		}

		changeSelection(cell) {

			const container = this.container;
			const cellIndex = cell.index() - 1;
			const rowIndex = cell.parent().index();

			this.selection = new Selection();

			const rowStart = Math.min(rowIndex, this.virtualSelection.Start.RowIndex);
			const rowEnd = Math.max(rowIndex, this.virtualSelection.Start.RowIndex);
			const cellStart = Math.min(cellIndex, this.virtualSelection.Start.ColumnIndex);
			const cellEnd = Math.max(cellIndex, this.virtualSelection.Start.ColumnIndex);

			for (var i = rowStart; i <= rowEnd; i++) {

				const row = container.find(".gtbl-detail").eq(i);

				const rowCells = row.find(".gtbl-value-cell");
				for (var j = cellStart; j <= cellEnd; j++) {
					rowCells.eq(j).addClass("highlight");
				}
			}

			this.updateSelection(this.current.Cell.RowIndex, rowIndex + this.startNode, cellStart, cellEnd);
		}

		scrollX(target){
			const position = target.position();
			const scrollLeft = this.rootElement.scrollLeft();

			if(this.lastPostion.X == position.left){
				return false;
			}

			this.lastPostion.X = position.left;

			if(scrollLeft + position.left - this.columnWidths[0] <= 0){
				return false;
			}

			if(position.left - target.prev().width() == 0){
				this.rootElement.scrollLeft(0);
				return true;
			}

			if(scrollLeft >= position.left){
				this.rootElement.scrollLeft(scrollLeft - target.width());
				return true;
			}

			if(scrollLeft + position.left + target.width() >= this.rootElement.width()){
				this.rootElement.scrollLeft((scrollLeft + position.left + target.outerWidth(true)) - this.rootElement.width());
				return true;
			}

			return false;
		}

		scrollY(target){
			const pad = 0;//10;
			const position = target.position();
			const scrollTop = this.rootElement.scrollTop();

			if(this.lastPostion.Y == position.top){
				return false;
			}
			console.log(position)
			this.lastPostion.Y = position.top;

			if(scrollTop + position.top == 0 || scrollTop + position.top + this.rowHeight == this.totalContentHeight){
				return false;
			}

			if(position.top - this.headerHeight == 0){
				this.rootElement.scrollTop(0);
				return true;
			}

			if(scrollTop >= position.top + pad){
				//this.rootElement.scrollTop(scrollTop - this.rowHeight);
				this.rootElement.scrollTop(position.top);
				return true;
			}

			if(position.top + this.rowHeight == this.totalContentHeight){
				this.rootElement.scrollTop(this.totalContentHeight);
				return true;
			}

			if(scrollTop + this.visibleViewportHeight + pad <= position.top){
				//this.rootElement.scrollTop(scrollTop + this.rowHeight);
				const by =  position.top - (scrollTop + this.visibleViewportHeight)
				console.log(by)
				//target.select();
				this.rootElement.scrollTop(scrollTop + by);
				return true;
			}

			return false;
		}

		changeVirtualSelection(){

			if(!this.scrolledBySelection){
				this.isDragging = false;
			}

			if(this.isAllSelected){
				return true;
			}

			if(!this.current || !this.last){
				return true;
			}

			if(this.current.Cell.equals(this.last.Cell)){
				return true;
			}

			this.clearSelection();
			this.updateVirtualSelection(this.last);

			const container = this.container
			const rowStart = Math.min(this.virtualSelection.End.RowIndex, this.virtualSelection.Start.RowIndex);
			const rowEnd = Math.max(this.virtualSelection.End.RowIndex, this.virtualSelection.Start.RowIndex);
			const cellStart = Math.min(this.virtualSelection.End.ColumnIndex, this.virtualSelection.Start.ColumnIndex);
			const cellEnd = Math.max(this.virtualSelection.End.ColumnIndex, this.virtualSelection.Start.ColumnIndex);

			for (var i = rowStart; i <= rowEnd; i++) {

				const row = container.find(".gtbl-detail").eq(i);

				const rowCells = row.find(".gtbl-value-cell");

				for (var j = cellStart; j <= cellEnd; j++) {
					rowCells.eq(j).addClass("highlight");
				}
			}
		}

		updateVirtualSelection(target){
			// up
			if(this.current.Cell.RowIndex >= target.Cell.RowIndex){
				if(this.current.Cell.RowIndex < this.startNode){
					return;
				}
				this.virtualSelection.Start.RowIndex = Math.abs(this.startNode - this.current.Cell.RowIndex);
				this.virtualSelection.End.RowIndex = Math.max(0, this.last.Cell.RowIndex - this.startNode);
			// down
			}else{
				if(target.Cell.RowIndex < this.startNode){
					return;
				}
				this.virtualSelection.Start.RowIndex = Math.max(0, this.current.Cell.RowIndex - this.startNode);
				this.virtualSelection.End.RowIndex = Math.abs(this.startNode - this.last.Cell.RowIndex);
			}

			this.virtualSelection.Start.ColumnIndex = this.current.Cell.ColumnIndex;
			this.virtualSelection.End.ColumnIndex = target.Cell.ColumnIndex;
		}
/*
		setSelectionRange2(cell){
			this.virtualSelection = {
				StartRow: 0,
				EndRow: 0,
				StartCell: 0,
				EndCelll: 0
			};
			const endRowIndex = cell.RowIndex;
			let rowIndex, startRowIndex;
			let dir;
			// up
			if(this.current.RowIndex >= endRowIndex){
				if(this.current.RowIndex < this.startNode){
					return;
				}
				dir = this.Delta.Up;
				rowIndex = Math.abs(this.startNode - this.current.RowIndex);
				startRowIndex = Math.max(0, this.last.RowIndex - this.startNode);
			// down
			}else{
				if(cell.RowIndex < this.startNode){
					return;
				}
				dir = this.Delta.Down;
				rowIndex = Math.abs(this.startNode - this.last.RowIndex);
				startRowIndex = Math.max(0, this.current.RowIndex - this.startNode);
			}

			if(dir == this.Delta.Up){
				this.startRowIndex = Math.max(rowIndex, startRowIndex);
				this.endRowIndex = Math.min(rowIndex, startRowIndex);
			}else{
				this.startRowIndex = Math.min(rowIndex, startRowIndex);
				this.endRowIndex = Math.max(rowIndex, startRowIndex);
			}

			this.startCellIndex = this.current.ColumnIndex;
			this.endCellIndex = cell.ColumnIndex;
		}
*/
		selectAll(){

			this.isAllSelected = true;

			Array.from(this.visibleNodes).forEach(node => {
				Array.from(node.children()).forEach((cell, index) => {
					if(index > 0){
						$(cell).addClass("highlight");
					}
				});
			})

			this.updateSelection(0, this.rows.length - 1, 0, this.header.length - 1);
		}

		clearSelection(){
			$(".highlight").removeClass("highlight");
		}

		getCellNode(cell){
			return	{
				Node: cell,
				Cell: new Cell(cell.parent().index() + this.startNode, cell.index() - 1)
			};
		}

		updateSelection(startRow, endRow, startCol, endCol){
			this.selection.Start = new Cell(Math.min(startRow, endRow), Math.min(startCol,endCol));
			this.selection.End = new Cell(Math.max(startRow, endRow), Math.max(startCol,endCol))
		}

		resetSelection(){
			this.updateSelection(0,0,0,0);
		}

		copyToClipboard(e){

			e.preventDefault();

			const _this = this;
			const dataArray = [];
			console.log(this.selection)

			for(let row = this.selection.Start.RowIndex; row <= this.selection.End.RowIndex; row++){
				dataArray.push(_this.rows[row].slice(_this.selection.Start.ColumnIndex, _this.selection.End.ColumnIndex + 1).join("\t"));
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

		resetViewport(){

			this.current = null;
			this.last = null;
			this.resetSelection();

			this.itemCount = this.rows.length;
			this.prepareVirtualScroll(0, 0, true)

			this.container.css("height", this.totalContentHeight);

			this.alterTransform();

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

			const _this = this;
			this.filtered = true;
			this._rows = this.rows;
			this.rows = [];

			this._rows.forEach(function(row){

				row.forEach(function(item, index){{

					if(index == columnIndex && item == value){
						_this.rows.push(row);
						return false;
					}

				}});

			});

			this.resetViewport();
		}

		clearFilter(){
			this.filtered = false;
			this.rows = this._rows;
			this._rows = null;
			this.resetViewport();
		}

	}
})()

class Cell{
	constructor(rowIndex, columnIndex){
		this.RowIndex = rowIndex ? rowIndex : 0;
		this.ColumnIndex = columnIndex ? columnIndex: 0;
	}

	equals(cell){
		return this.RowIndex == cell.RowIndex && this.ColumnIndex == cell.ColumnIndex;
	}
}

class Selection{
	constructor(start, end){
		this.Start = start ? start : new Cell();
		this.End = end ? end : new Cell();
	}
}

class Util{

	static transpose(array) {
		return Object.keys(array[0]).map(function(key) {
			return array.map(function(item) { return item[key]; });
		});
	}

	static reduceString(array){
		return this.transpose(array).map(item => item.reduce(this.compareLength));
	}

	static compareLength(a, b){
		const left = a.split("\n").reduce(function (a, b) { return a.length > b.length ? a : b; });
		const right = b.split("\n").reduce(function (a, b) { return a.length > b.length ? a : b; });

		return left.length > right.length ? left : right;
	}

	static getStringWidth(text, padding, font){
		const canvas = this.getStringWidth.canvas || (this.getStringWidth.canvas = document.createElement("canvas"));
		const context = canvas.getContext("2d");
		context.font = font;
		const metrics = context.measureText(text);

		if(padding){
			return metrics.width + 32;
		}else{
			return metrics.width + 20;
		}
	}

	static getColumnWidths(header, rows, font){
		const _numberColumnWidth = this.getStringWidth(rows.length, false, font);
		const _maxLengthValues = this.reduceString([header].concat(rows));

		return [_numberColumnWidth].concat(_maxLengthValues.map(item => this.getStringWidth(item, true, font)));
	}
}


