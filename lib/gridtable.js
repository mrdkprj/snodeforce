"use strict";

const Direction = {
	Up:1,
	Down:2,
	Left:3,
	Right:4,
	Home:5,
	End:6
};

class GridTable {

	constructor(rootElement, params) {

		this.rootNode = rootElement;
		this.rootNode.innerHTML = "";
		this.rootHeight = params.height ? params.height : 500;

		this.rows = params.rows;
		this.header = params.header;
		this._rows = null;

		if(Array.isArray(params.readOnly)){
			this.readOnly = false;
			this.readOnlyColumns = new Set(params.readOnly);
		}else{
			this.readOnly = params.readOnly;
			this.readOnlyColumns = new Set();
		}

		this.baseRowHeight = 22;
		this.headerHeight = 28;
		this.itemCount = this.rows.length;
		this.totalContentHeight = 0;
		this.childPositions = null;
		this.columnPositions = null;
		this.startNode = 0;
		this.endNode = 0;
		this.visibleNodesCount = 0;
		this.nodeOffsetY = 0;
		this.nodeOffsetX = 0;
		this.visibleViewportHeight = 0;

		this.calculationBaseStyles = {
			baseHeight: this.baseRowHeight,
			font: "12px Verdana,Arial,sans-serif",
			lineHeight: 21,
			borderWidth: 1,
		}
		this.sizeBase = Util.getSizeBase(this.header, this.rows, this.calculationBaseStyles);
		this.updateColumnWidths();

		this.lastPostion = {X:0,Y:0};
		this.scrollCallback = null;
		this.filtered = false;
		this.isDragging = false;
		this.isResizing = false;
		this.isSearching = false;

		this.container = null;
		this.table = null;
		this.table = null;
		this.visibleNodes = null;
		this.focusHolder = null;
		this.cornerCell = null;
		this.rowHeaderCellsVirtual = [];
		this.columnHeaderCells = [];

		this.current = null;
		this.last = null;
		this.nextCell = null;
		this.selection = new Selection();
		this.virtualSelection = new Selection();

		this.animationFrame = null;
		this.resizeAnimationFrame = null;
		this.scrollInterval = null;

		this.SelectionMode = {
			Cell: 1,
			Row: 2,
			Column: 3,
			All: 4,
		}

		this.ResizeMode = {
			None:0,
			Column: 1,
			Row:2,
		}

		this.sortMap = {0: "asc"};

		this.history = new EditHistory(this.rows);
		this.searchUtil = new SearchUtil();

		this.currentSelectionMode = this.SelectionMode.Cell;
		this.currentResizeMode = this.ResizeMode.None;
/*
		this.viewport.style.height = this.rootHeight + "px";
		this.viewport.style.overflow = "auto";
		this.viewport.style.position = "relative";
*/
		this.rootNode.style.height = "100%";
		this.rootNode.style.position = "relative";

		document.addEventListener("mousedown", this.onDocumentMouseDown.bind(this));
		document.addEventListener("mouseup", this.onDocumentMouseUp.bind(this));
		document.addEventListener("copy" , this.onDocumentCopy.bind(this));
		document.addEventListener("mousemove", this.onDocumentMouseMove.bind(this));
		//this.viewport.addEventListener("scroll", this.onRootScroll.bind(this));

		this.mouseoverEvent = document.createEvent("HTMLEvents");
		this.mouseoverEvent.initEvent("mouseover", true, true);
		this.mouseoverEvent.eventName = "mouseover";

		//this.prepareVirtualScroll(this.viewport.scrollTop, this.viewport.scrollLeft, true);
		this.prepareVirtualScroll(0, 0, true);
		this.createGridTable();

	}

	prepareVirtualScroll(scrollTop, scrollLeft, reset){

		const findEndNode = (nodePositions, startNode, itemCount, height) => {
			let endNode;
			for (endNode = startNode; endNode < itemCount; endNode++) {
				if (nodePositions[endNode] > nodePositions[startNode] + height) {
					return endNode;
				}
			}

			return endNode;
		}

		const getChildPositions = (itemCount) => {
			const results = [0];
			for (let i = 1; i < itemCount; i++) {
				results.push(results[i - 1] + this.getChildHeight(i - 1));
			}
			return results;
		}

		const renderAhead = 20;

		if(reset){
			this.childPositions = getChildPositions(this.itemCount);
			this.totalContentHeight = this.childPositions[this.itemCount - 1] + this.getChildHeight(this.itemCount - 1);
		}

		const firstVisibleNode = Util.findClosest(scrollTop, this.childPositions, this.itemCount);
		const lastVisibleNode = findEndNode(this.childPositions, firstVisibleNode, this.itemCount, this.rootHeight);

		this.startNode = Math.max(0, firstVisibleNode - renderAhead);
		this.endNode = Math.min(this.itemCount - 1, lastVisibleNode + renderAhead);

		this.visibleNodesCount = (this.endNode - this.startNode) + 1;

		this.visibleViewportHeight = this.rootHeight - this.headerHeight;

		this.nodeOffsetY = this.childPositions[this.startNode];
		this.nodeOffsetX = scrollLeft;

	}

	getChildHeight(index){
		return this.sizeBase.heights[index];
	}

	createGridTable(){

		const getContainer = () => {
			const container = document.createElement("div");
			container.classList.add("gtbl-container");
			container.style.height = this.totalContentHeight + "px";
			return container;
		}

		const getCornerCell = () => {
			const cornerCell = document.createElement("div");
			cornerCell.classList.add("gtbl-header-cell", "gtbl-corner-cell");
			cornerCell.style.width = this.columnWidths[0] + "px";
			cornerCell.addEventListener("click", this.onCornerCellClick.bind(this));
			return cornerCell;
		}

		const getColumnHeader = () => {

			const columnHeader = document.createElement("div");
			columnHeader.classList.add("gtbl-row", "gtbl-row-header");

			this.cornerCell = getCornerCell();
			columnHeader.appendChild(this.cornerCell);

			this.header.forEach((item, index) => {
				const header = document.createElement("div");
				header.classList.add("gtbl-header-cell", "gtbl-col-header-cell");
				header.style.width = this.columnWidths[index + 1] + "px";
				header.addEventListener("click", this.onColumnHeaderCellClick.bind(this));

				const link = document.createElement("a");
				link.classList.add("sort-link");
				link.textContent = item;
				link.addEventListener("click", this.onColumnHeaderCellDblClick.bind(this));
				header.appendChild(link);

				const slidebar = document.createElement("div");
				slidebar.classList.add("col-slidebar");
				slidebar.addEventListener("mousedown", this.onSlidebarMousedown.bind(this));
				header.appendChild(slidebar);

				this.columnHeaderCells.push(header);
				columnHeader.appendChild(header);
			});

			return columnHeader;
		}

		const getTable = () => {
			const table = document.createElement("div");
			table.classList.add("gtbl", "gtbl-grid");
			table.style.top = "0px";
			return table;
		}

		const getFocusHolder = () => {
			const focusHolder = document.createElement("input");
			focusHolder.classList.add("focus-holder");
			focusHolder.type ='text';
			focusHolder.addEventListener("keydown", this.onFocusHolderKeydown.bind(this));
			focusHolder.addEventListener("keypress", this.onFocusHolderKeypress.bind(this));
			focusHolder.addEventListener("keyup", this.onFocusHolderKeyUp.bind(this));
			focusHolder.addEventListener("paste", this.onFocusHolderPaste.bind(this));
			return focusHolder;
		}

		const getInputHolder = () => {
			this.editor = document.createElement("textarea");
			this.editor.spellcheck = false;
			this.editor.classList.add("cell-editor");
			this.editor.addEventListener("blur", this.onEditorBlur.bind(this));
			this.editor.addEventListener("keydown", this.onEditorKeydown.bind(this));
			this.editor.addEventListener("keypress", this.onEditorKeypress.bind(this));
			this.editor.addEventListener("paste", this.onEditorPaste.bind(this))

			const inputHolder = document.createElement("div");
			inputHolder.classList.add("input-holder");
			inputHolder.appendChild(this.editor);
			return inputHolder;
		}

		const getSearchDialog = () => {
			const dialog = document.createElement("div");
			dialog.classList.add("dialog");
			dialog.style.top = (this.headerHeight + 1) + "px";
			dialog.style.right = "20px";
			const txt = document.createElement("textarea");
			txt.spellcheck = false;
			txt.classList.add("dialog-txt");
			txt.addEventListener("keydown", this.onSearchDialogKeydown.bind(this));

			this.searchResultArea = document.createElement("div");
			this.searchResultArea.classList.add("search-result");
			this.searchResultArea.textContent = "0/0";

			dialog.appendChild(txt);
			dialog.appendChild(this.searchResultArea);

			return dialog;
		}
/*
		const header = getColumnHeader();
		this.viewport.appendChild(header);
		this.container = getContainer();
		this.viewport.appendChild(this.container);

		this.table = getTable();
		this.container.appendChild(this.table);

		this.table.appendChild(this.getVisibleChildNodes());
		this.visibleNodes = Array.from(this.table.childNodes);

		this.focusHolder = getFocusHolder();
		this.viewport.appendChild(this.focusHolder);

		this.inputHolder = getInputHolder();
		this.viewport.appendChild(this.inputHolder);

		this.dialog = getSearchDialog();
		this.viewport.appendChild(this.dialog);
*/
		this.viewport = document.createElement("div");
		this.viewport.style.height = this.rootHeight + "px";
		this.viewport.classList.add("gtbl-viewport");
		this.viewport.addEventListener("scroll", this.onRootScroll.bind(this));

		const header = getColumnHeader();
		this.viewport.appendChild(header);
		this.container = getContainer();

		this.table = getTable();
		this.table.appendChild(this.getVisibleChildNodes());
		this.visibleNodes = Array.from(this.table.childNodes);
		this.container.appendChild(this.table);
		this.viewport.appendChild(this.container);

		this.rootNode.appendChild(this.viewport);

		this.focusHolder = getFocusHolder();
		this.rootNode.appendChild(this.focusHolder);

		this.inputHolder = getInputHolder();
		this.viewport.appendChild(this.inputHolder);

		this.dialog = getSearchDialog();
		this.rootNode.appendChild(this.dialog);
	}

	createRow(rowIndex){

		const rowData = this.rows[rowIndex];

		const isFirstRow = rowIndex == 0;

		const rowDiv = document.createElement("div");
		rowDiv.classList.add("gtbl-row", "gtbl-detail");

		const rowHeaderCell = document.createElement("div");
		rowHeaderCell.classList.add("gtbl-header-cell", "gtbl-row-header-cell");
		rowHeaderCell.style.height = this.getChildHeight(rowIndex) + "px";
		rowHeaderCell.addEventListener("click", this.onRowHeaderCellClick.bind(this));

		const rowNumber = document.createElement("span");
		rowNumber.classList.add("row-number");
		rowNumber.textContent = rowIndex + 1;
		rowHeaderCell.appendChild(rowNumber);

		const slidebar = document.createElement("div");
		slidebar.classList.add("row-slidebar");
		slidebar.addEventListener("mousedown", this.onRowSlidebarMousedown.bind(this));
		rowHeaderCell.appendChild(slidebar);

		if(isFirstRow){
			rowHeaderCell.style.width = this.columnWidths[0] + "px";
		}

		this.rowHeaderCellsVirtual.push(rowHeaderCell);

		rowDiv.appendChild(rowHeaderCell);

		const fragment = document.createDocumentFragment();

		rowData.forEach((cellvalue, cellIndex) => {
			const cell = document.createElement("div");
			cell.classList.add("gtbl-value-cell");
			cell.textContent = Util.toStringNullSafe(cellvalue);
			cell.addEventListener("mousedown", this.onCellMouseDown.bind(this));
			cell.addEventListener("mouseup", this.onCellMouseUp.bind(this));
			cell.addEventListener("mouseover", this.onCellMouseOver.bind(this));
			cell.addEventListener("dblclick", this.onCellDblClick.bind(this));

			if(isFirstRow){
				cell.style.width = this.columnWidths[cellIndex + 1] + "px";
			}

			fragment.appendChild(cell);

		});

		rowDiv.appendChild(fragment);

		return rowDiv;
	}

	getVisibleChildNodes(){
		this.rowHeaderCellsVirtual = [];

		const fragment = document.createDocumentFragment();
		new Array(this.visibleNodesCount)
					.fill(null)
					.forEach((_, index) => fragment.appendChild(this.createRow(index + this.startNode)));
		return fragment;
	}

	getRowDataAt(index){
		return [index + 1].concat(this.rows[index]);
	}

	changeRowValue(rowArray, arrayIndex, keepCurrent){

		const addRow = (index) => {
			const newRow = this.createRow(index);
			this.visibleNodes.push(newRow);
			this.table.appendChild(newRow);
		}

		const shouldMarkAsCurrent = (rowIndex, colIndex) => {

			if(this.isSearching){
				if(this.searchUtil.CurrentResult.RowIndex == rowIndex && this.searchUtil.CurrentResult.ColumnIndex == colIndex - 1){
					return true;
				}
			}

			if(!this.current){
				return false;
			}

			if(this.current.Cell.RowIndex != rowIndex){
				return false;
			}

			if(this.current.Cell.ColumnIndex != colIndex - 1){
				return false;
			}



			return true;
		}

		const shouldChangeLast = (rowIndex, colIndex) => {

			if(this.isSearching){
				if(this.searchUtil.CurrentResult.RowIndex == rowIndex && this.searchUtil.CurrentResult.ColumnIndex == colIndex - 1){
					return true;
				}
			}

			if(!this.last){
				return false;
			}

			if(this.last.Cell.RowIndex != rowIndex){
				return false;
			}

			if(this.last.Cell.ColumnIndex != colIndex - 1){
				return false;
			}



			return true;
		}

		if(arrayIndex > this.visibleNodes.length - 1){
			addRow(arrayIndex);
		}

		const rowIndex = arrayIndex + this.startNode;

		rowArray.forEach((value, index) => {

			const node = this.visibleNodes[arrayIndex].childNodes[index];
			if(index == 0){
				node.style.height = this.getChildHeight(rowIndex) + "px"
				 node.childNodes[0].textContent = Util.toStringNullSafe(value);
			}else{
				node.textContent = Util.toStringNullSafe(value);
			}

			if(keepCurrent){
				return;
			}

			// Update current cell
			if(shouldMarkAsCurrent(rowIndex, index)){
				this.markCurrent(node, true);

				if(this.isEditing){
					this.prepareEditor();
				}
			}

			// Update last selected cell
			if(shouldChangeLast(rowIndex, index)){
				this.last = this.toCellNode(node);
			}

		});
	}

	doVirtualScroll(e){

		this.prepareVirtualScroll(e.target.scrollTop, e.target.scrollLeft);

		if(this.current){
			this.clearCurrent();
		}

		if(this.isEditing){
			this.initEditor();
		}

		this.alterViewportOffset();

		new Array(this.visibleNodesCount)
			.fill(null)
			.map((_, index) => this.getRowDataAt(index + this.startNode))
			.forEach((row, rowIndex) => this.changeRowValue(row, rowIndex));

		//if(this.visibleNodesCount < this.visibleNodes.length - 0){
			const count = (this.visibleNodes.length - 0) - this.visibleNodesCount;
			this.visibleNodes.splice(this.visibleNodesCount, count).forEach(el => el.remove());
			this.rowHeaderCellsVirtual.splice(this.visibleNodesCount, count);
		//}

		this.changeHighlightByScroll();

		if(this.scrollCallback){
			this.scrollCallback.action(this.scrollCallback.args)
			this.scrollCallback = null;
		}
	}

	alterViewportOffset(){
		this.table.style.top = this.nodeOffsetY + "px";
	}

	alterScrollPosition(top, left){
		if(top != null){
			this.viewport.scrollTop = top;
		}

		if(left != null){
			this.viewport.scrollLeft = left;
		}
	}

	moveCellByCtrlArrowKey(direction, withShiftkey){

		this.bypassHighlightByScroll = !withShiftkey;
		this.shiftKey = withShiftkey;

		let anchor;
		if(withShiftkey){
			anchor = this.last;
		}else{
			anchor = this.current;
		}

		const scrollTop = this.viewport.scrollTop;
		const scrollLeft = this.viewport.scrollLeft;

		switch(direction){
			case Direction.End:
				this.alterScrollPosition(this.viewport.scrollHeight, this.viewport.scrollWidth);
				break;
			case Direction.Home:
				this.alterScrollPosition(0,0);
				break;
			case Direction.Left:
				this.alterScrollPosition(null, 0);
				break;
			case Direction.Right:
				this.alterScrollPosition(null, this.viewport.scrollWidth);
				break;
			case Direction.Up:
				this.alterScrollPosition(0);
				break;
			case Direction.Down:
				this.alterScrollPosition(this.viewport.scrollHeight);
				break;
		}

		if(scrollTop != this.viewport.scrollTop || scrollLeft != this.viewport.scrollLeft){
			this.scrollCallback = this.createCallback(this.changeCellByCtrlArrowKey, {anchor, direction});
		}else{
			this.changeCellByCtrlArrowKey({anchor, direction});
		}
	}

	indexOf(node){
		return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
	}

	rowIndexOf(node){
		return Array.prototype.indexOf.call(this.rowHeaderCellsVirtual, node);
	}

	changeCellByCtrlArrowKey(args){

		let row, cell;

		switch(args.direction){
			case Direction.End:
				row = this.visibleNodes[this.visibleNodes.length - 2];
				cell = row.childNodes[row.childNodes.length - 1]
				break;
			case Direction.Home:
				row = this.visibleNodes[0];
				cell = row.childNodes[1];
				break;
			case Direction.Left:
				row = this.visibleNodes[this.indexOf(args.anchor.Node.parentNode)];
				cell = row.childNodes[1];
				break;
			case Direction.Right:
				row = this.visibleNodes[this.indexOf(args.anchor.Node.parentNode)];
				cell = row.childNodes[row.childNodes.length - 1]
				break;
			case Direction.Up:
				row = this.visibleNodes[0];
				cell = row.childNodes[this.indexOf(args.anchor.Node)];
				break;
			case Direction.Down:
				row = this.visibleNodes[this.visibleNodes.length - 2];
				cell = row.childNodes[this.indexOf(args.anchor.Node)];
				break;
		}

		if(this.shiftKey){
			this.selectByShift(cell);
		}else{
			this.selectByMouseDown(cell);
		}
	}

	moveCellByArrowKey(direction, withShiftkey){

		this.bypassHighlightByScroll = !withShiftkey;
		this.shiftKey = withShiftkey;

		const moveCellAllowed = (direction, cellNode) => {

			switch(direction){
				case Direction.Left:
					if(cellNode.Cell.ColumnIndex  <= 0){
						return false;
					}
					break;
				case Direction.Right:
					if(cellNode.Cell.ColumnIndex == this.header.length - 1){
						return false;
					}
					break;
				case Direction.Up:
					if(cellNode.Cell.RowIndex  == 0){
						return false;
					}
					break;
				case Direction.Down:
					if(cellNode.Cell.RowIndex + 1 == this.rows.length){
						return false;
					}
					break;
			}

			return true;
		}

		let target;
		if(withShiftkey){
			target = this.last;
		}else{
			target = this.current;
		}

		if(!moveCellAllowed(direction, target)){
			return;
		}

		if(this.scrollRequired(target)){
			this.scrollCallback = this.createCallback(this.changeCellByArrowKey, {direction});
		}else{
			this.changeCellByArrowKey({direction});
		}
	}

	createCallback(action, args){
		return {action: action.bind(this), args: args};
	}

	changeCellByArrowKey(args){

		let cell;
		let anchor;

		if(this.shiftKey){
			anchor = this.last;
		}else{
			anchor = this.current;
		}

		switch(args.direction){
			case Direction.Home:
				cell = anchor.Node.parentNode.childNodes[1];
				break;
			case Direction.End:
				cell = anchor.Node.parentNode.childNodes[this.header.length];
				break;
			case Direction.Left:
				cell = anchor.Node.previousElementSibling;
				break;
			case Direction.Right:
				cell = anchor.Node.nextElementSibling;
				break;
			case Direction.Up:
				cell = anchor.Node.parentNode.previousElementSibling.childNodes[this.indexOf(anchor.Node)];
				break;
			case Direction.Down:
				cell = anchor.Node.parentNode.nextElementSibling.childNodes[this.indexOf(anchor.Node)];
				break;
		}

		if(this.shiftKey){
			this.alterLast(cell);
		}else{
			this.selectByMouseDown(cell);
		}
	}

	scrollRequired(cellNode){

		let scrollRequired = false;
		let scrollPositionLeft = null;
		let scrollPositionTop = null;
		//const positionTop = this.childPositions[cellNode.Cell.RowIndex];
		//const positionLeft = cellNode.Node.getBoundingClientRect().left;
		const scrollTop = this.viewport.scrollTop;
		const scrollLet = this.viewport.scrollLeft;

		const positionTop = this.childPositions[cellNode.Cell.RowIndex];
		const positionLeft = (this.viewport.getBoundingClientRect().left - scrollLet) + this.columnPositions[cellNode.Cell.ColumnIndex + 1];

		// hidden below
		if(positionTop > scrollTop + this.visibleViewportHeight){
			scrollPositionTop = positionTop
			scrollRequired = true;
		}

		// hidden above
		if(positionTop < scrollTop){
			scrollPositionTop = positionTop;
			scrollRequired = true;
		}

		// hidden left
		if(scrollLet > positionLeft){
			scrollPositionLeft = positionLeft - this.columnWidths[0];
			scrollRequired = true;
		}

		// hidden right
		if(Util.css(this.viewport, "width") + scrollLet < positionLeft){
			const position = positionLeft - (Util.css(this.viewport, "width") + scrollLet);
			const barWidth = Util.css(this.viewport, "width") - this.viewport.clientWidth;
			scrollPositionLeft = positionLeft - position + barWidth;
			scrollRequired = true;
		}

		if(scrollRequired){
			this.alterScrollPosition(scrollPositionTop, scrollPositionLeft);
		}

		return scrollRequired;
	}

	hasFocus(){
		return document.activeElement == this.focusHolder;
	}

	setFocus(){
		this.focusHolder.focus();
	}

	selectByMouseDown(cell){
		this.markCurrent(cell);
		this.last = this.current;
		this.updateSelection(this.current.Cell.RowIndex, this.current.Cell.RowIndex,this.current.Cell.ColumnIndex,this.current.Cell.ColumnIndex);
		this.updateVirtualSelection(this.current);
	}

	selectByShift(cell){
		this.clearSelection();
		this.last = this.toCellNode(cell);
		this.updateVirtualSelection(this.last);
		this.updateSelection(this.current.Cell.RowIndex, this.last.Cell.RowIndex, this.current.Cell.ColumnIndex, this.last.Cell.ColumnIndex);
		this.changeHighlight(cell);
	}

	markCurrent(cell, preventScroll){

		this.clearSelection();

		if(this.current){
			this.clearCurrent();
		}

		this.current = this.toCellNode(cell);

		this.current.Node.classList.add("current");
		this.rowHeaderCellsVirtual[this.indexOf(cell.parentNode)].classList.add("row-highlight");
		this.columnHeaderCells[this.indexOf(cell) - 1].classList.add("row-highlight");

		if(preventScroll){
			return;
		}

		this.scrollHorizontally(cell);
		this.scrollVertically(cell);
	}

	clearCurrent(){
		this.current.Node.classList.remove("current");
	}

	changeHighlight(cell) {

		const container = this.container;
		const cellIndex = this.indexOf(cell) - 1;
		const rowIndex = this.indexOf(cell.parentNode);

		this.resetSelection();

		const rowStart = Math.min(rowIndex, this.virtualSelection.Start.RowIndex);
		const rowEnd = Math.max(rowIndex, this.virtualSelection.Start.RowIndex);
		const cellStart = Math.min(cellIndex, this.virtualSelection.Start.ColumnIndex);
		const cellEnd = Math.max(cellIndex, this.virtualSelection.Start.ColumnIndex);

		for (let i = rowStart; i <= rowEnd; i++) {

			const row = container.querySelectorAll(".gtbl-detail")[i];

			const rowCells = row.querySelectorAll(".gtbl-value-cell");

			this.rowHeaderCellsVirtual[i].classList.add("row-highlight");

			for (let j = cellStart; j <= cellEnd; j++) {

				rowCells[j].classList.add("highlight");

				this.columnHeaderCells[j].classList.add("row-highlight");
			}
		}

		this.updateSelection(this.current.Cell.RowIndex, rowIndex + this.startNode, cellStart, cellEnd);
	}

	scrollHorizontally(target, padding){

		let paddingValue = 0;

		const scrollLeft = this.viewport.scrollLeft;
		const positionLeft = (target.getBoundingClientRect().left - this.viewport.getBoundingClientRect().left) + scrollLeft;

		if(this.lastPostion.X == positionLeft){
			return;
		}

		this.lastPostion.X = positionLeft;

		if(scrollLeft + positionLeft - this.columnWidths[0] <= 0){
			return;
		}

		if(this.viewport.scrollWidth == Util.css(target, "width") + positionLeft){
			this.alterScrollPosition(null, this.viewport.scrollWidth);
			return;
		}

		if(positionLeft - Util.css(target.previousElementSibling, "width") == 0){
			this.alterScrollPosition(null, 0);
			return;
		}

		if(scrollLeft >= positionLeft){
			if(padding){
				paddingValue = this.columnWidths[this.last.Cell.ColumnIndex]
			}
			this.alterScrollPosition(null, positionLeft - this.columnWidths[0] - paddingValue);
			return;
		}

		if(scrollLeft + Util.css(this.viewport, "width") <= positionLeft + Util.css(target, "width") + this.getScrollbarHeight()){
			const scrollby = ((positionLeft + Util.css(target, "width")) + this.getScrollbarHeight()) - (scrollLeft + Util.css(this.viewport, "width"));
			if(padding){
				paddingValue = this.columnWidths[this.last.Cell.ColumnIndex + 1]
			}
			this.alterScrollPosition(null, scrollLeft + scrollby + paddingValue);
			return;
		}

	}

	scrollVertically(target, padding){

		let paddingValue = 0;

		const targetCellNode = this.toCellNode(target);
		const positionTop = this.childPositions[targetCellNode.Cell.RowIndex]
		const scrollTop = this.viewport.scrollTop;

		if(this.lastPostion.Y == positionTop){
			return;
		}

		this.lastPostion.Y = positionTop;

		if(scrollTop + positionTop <= 0){
			return;
		}

		if(this.viewport.scrollHeight == Util.css(target, "height") + positionTop){
			this.alterScrollPosition(this.viewport.scrollHeight);
			return;
		}

		if(positionTop - this.headerHeight == 0){
			this.alterScrollPosition(0);
			return;
		}

		if(scrollTop > positionTop){
			if(padding){
				paddingValue = this.getChildHeight(this.current.Cell.RowIndex - 1);
			}
			this.alterScrollPosition(positionTop - paddingValue);
			return;
		}

		if(scrollTop + this.visibleViewportHeight <= positionTop + this.getChildHeight(targetCellNode.Cell.RowIndex) + this.getScrollbarHeight()){

			const scrollby = (positionTop + this.getChildHeight(targetCellNode.Cell.RowIndex)) - (scrollTop + this.visibleViewportHeight) + this.getScrollbarHeight();

			if(padding){
				paddingValue = this.getChildHeight(this.last.Cell.RowIndex + 1);
			}

			this.alterScrollPosition(scrollTop + scrollby + paddingValue);

			return;
		}


	}

	getScrollbarHeight(){
		return this.rootHeight - this.viewport.clientHeight;
	}

	changeHighlightByScroll(){

		const changeHighlightRequired = () => {

			if(this.currentSelectionMode == this.SelectionMode.All || this.currentSelectionMode == this.SelectionMode.Column){
				return true;
			}

			if(this.bypassHighlightByScroll){
				return false;
			}

			if(!this.current || !this.last){
				return false;
			}

			if(this.current.Cell.equals(this.last.Cell)){
				return false;
			}

			return true;

		}

		const updateVirtualSelectionRequired = () => {

			if(this.currentSelectionMode == this.SelectionMode.All || this.currentSelectionMode == this.SelectionMode.Column){
				return true;
			}

			if(this.current.Cell.RowIndex >= this.last.Cell.RowIndex){

				if(this.current.Cell.RowIndex < this.startNode){
					return false;
				}

				if(this.last.Cell.RowIndex > this.startNode + this.visibleNodesCount - 1){
					return false;
				}

				return true;

			}else{

				if(this.last.Cell.RowIndex < this.startNode){
					return false;
				}

				if(this.current.Cell.RowIndex  > this.startNode + this.visibleNodesCount - 1){
					return false;
				}

				return true;
			}
		}

		if(!changeHighlightRequired()){
			return true;
		}

		this.clearSelection();

		if(!updateVirtualSelectionRequired()){
			return true;
		}

		this.updateVirtualSelection(this.last);

		const rowStart = Math.min(this.virtualSelection.End.RowIndex, this.virtualSelection.Start.RowIndex);
		const rowEnd = Math.max(this.virtualSelection.End.RowIndex, this.virtualSelection.Start.RowIndex);
		const cellStart = Math.min(this.virtualSelection.End.ColumnIndex, this.virtualSelection.Start.ColumnIndex);
		const cellEnd = Math.max(this.virtualSelection.End.ColumnIndex, this.virtualSelection.Start.ColumnIndex);

		if(this.currentSelectionMode == this.SelectionMode.All){
			this.cornerCell.classList.add("row-highlight");
		}

		if(this.currentSelectionMode == this.SelectionMode.Row){
			this.columnHeaderCells.forEach(cell => cell.classList.add("row-highlight"));
		}

		for (let i = rowStart; i <= rowEnd; i++) {

			const row = this.container.querySelectorAll(".gtbl-detail")[i];

			const rowCells = row.querySelectorAll(".gtbl-value-cell");

			this.rowHeaderCellsVirtual[i].classList.add("row-highlight");

			for (let j = cellStart; j <= cellEnd; j++) {

				rowCells[j].classList.add("highlight");

				if(this.currentSelectionMode != this.SelectionMode.Row){
					this.columnHeaderCells[j].classList.add("row-highlight");
				}
			}
		}
	}

	updateVirtualSelection(target){

		// All cell selection
		if(this.currentSelectionMode == this.SelectionMode.All){
			this.virtualSelection.Start.RowIndex = 0;
			this.virtualSelection.End.RowIndex = this.visibleNodesCount - 1;
			this.virtualSelection.Start.ColumnIndex = 0;
			this.virtualSelection.End.ColumnIndex = this.header.length - 1;
			return;
		}

		// Column selection
		if(this.currentSelectionMode == this.SelectionMode.Column){
			this.virtualSelection.Start.RowIndex = 0;
			this.virtualSelection.End.RowIndex = this.visibleNodesCount - 1;
			return;
		}

		// Upward selection
		if(this.current.Cell.RowIndex >= target.Cell.RowIndex){
			this.virtualSelection.Start.RowIndex = Math.min(this.visibleNodesCount - 1, this.current.Cell.RowIndex - this.startNode);
			this.virtualSelection.End.RowIndex = Math.max(0, this.last.Cell.RowIndex - this.startNode);
		// Downward selection
		}else{
			this.virtualSelection.Start.RowIndex = Math.max(0, this.current.Cell.RowIndex - this.startNode);
			this.virtualSelection.End.RowIndex =Math.min(this.visibleNodesCount - 1, this.last.Cell.RowIndex - this.startNode);
		}

		this.virtualSelection.Start.ColumnIndex = this.current.Cell.ColumnIndex;
		this.virtualSelection.End.ColumnIndex = target.Cell.ColumnIndex;
	}

	selectAll(){

		this.currentSelectionMode = this.SelectionMode.All

		this.cornerCell.classList.add("row-highlight");

		this.visibleNodes.forEach(node => {
			node.childNodes.forEach((cell, index) => {
				if(index > 0){
					this.highlightSelection(cell);
				}
			});
		})

		this.updateSelection(0, this.rows.length - 1, 0, this.header.length - 1);
	}

	selectRow(rowHeaderCell){

		this.currentSelectionMode = this.SelectionMode.Row

		const selectedRowIndex = parseInt(rowHeaderCell.textContent) - 1;

		this.markCurrent(rowHeaderCell.nextElementSibling, true);
		this.last = this.toCellNode(rowHeaderCell.parentNode.childNodes[this.header.length]);

		this.columnHeaderCells.forEach(cell => cell.classList.add("row-highlight"));

		rowHeaderCell.parentNode.childNodes.forEach((cell, index) => {
			if(index > 0){
				cell.classList.add("highlight");
			}else{
				cell.classList.add("row-highlight");
			}
		});

		this.updateSelection(selectedRowIndex, selectedRowIndex, 0, this.header.length - 1);
		this.setFocus();
	}

	selectColumn(columnCell){

		this.currentSelectionMode = this.SelectionMode.Column

		const columnIndex = this.indexOf(columnCell);

		this.markCurrent(this.visibleNodes[0].childNodes[columnIndex], true);
		this.current.Cell.RowIndex = 0;
		this.last = this.toCellNode(this.visibleNodes[this.visibleNodes.length - 1].childNodes[columnIndex]);

		columnCell.classList.add("row-highlight");
		this.visibleNodes.forEach((row, index) => {
			this.rowHeaderCellsVirtual[index].classList.add("row-highlight");
			row.childNodes[columnIndex].classList.add("highlight");
		});

		this.virtualSelection.Start.ColumnIndex = columnIndex - 1;
		this.virtualSelection.End.ColumnIndex = columnIndex - 1;

		this.updateSelection(0, this.rows.length - 1, columnIndex - 1, columnIndex - 1);
		this.setFocus();

	}

	highlightSelection(selectedCell){
		selectedCell.classList.add("highlight");
		this.rowHeaderCellsVirtual[this.indexOf(selectedCell.parentNode)].classList.add("row-highlight");
		this.columnHeaderCells.forEach(cell => cell.classList.add("row-highlight"));
	}

	clearSelection(){
		this.cornerCell.classList.remove("row-highlight");
		this.table.querySelectorAll(".highlight").forEach(el => el.classList.remove("highlight"));
		this.rowHeaderCellsVirtual.forEach(cell => cell.classList.remove("row-highlight"));
		this.columnHeaderCells.forEach(cell => cell.classList.remove("row-highlight"));
	}

	toCellNode(cell){
		return	{
			Node: cell,
			Cell: new Cell(this.indexOf(cell.parentNode) + this.startNode, this.indexOf(cell) - 1)
		};
	}

	updateSelection(startRow, endRow, startCol, endCol){
		this.selection.Start = new Cell(Math.min(startRow, endRow), Math.min(startCol,endCol));
		this.selection.End = new Cell(Math.max(startRow, endRow), Math.max(startCol,endCol))
	}

	resetSelection(){
		this.selection = new Selection();
	}

	resetViewport(){

		this.current = null;
		this.last = null;
		this.resetSelection();

		this.itemCount = this.rows.length;
		this.prepareVirtualScroll(0, 0, true)
		this.container.style.height = this.totalContentHeight;

		this.alterViewportOffset();

		this.table.innerHTML = "";
		this.table.appendChild(this.getVisibleChildNodes());
		this.visibleNodes = Array.from(this.table.childNodes);
		this.alterScrollPosition(0,0);
	}

	resizeColumn(e){
		e.stopPropagation();
		e.preventDefault();
		const diff = e.pageX - this.lastSliderPosition;
		this.lastSliderPosition = e.pageX;
		const currentWidth = Util.css(this.resizingCell.Node, "width");
		const newWidth = currentWidth + diff;
		if(newWidth > 2){
			this.resizingCell.Node.style.width = newWidth + "px";
			this.firstRowCell.style.width = newWidth + "px";
		}
	}

	resizeRow(e){
		e.stopPropagation();
		e.preventDefault();
		const diff = e.pageY - this.lastSliderPosition;
		this.lastSliderPosition = e.pageY;
		const currentHeight = Util.css(this.resizingCell.Node, "height");
		const newHeight = currentHeight + diff;
		if(newHeight > 2){
			this.resizingCell.Node.style.height = newHeight + "px";
		}
	}

	moveSlidebar(e){
		if(!this.isResizing) return;

		if (this.resizeAnimationFrame) {
			window.cancelAnimationFrame(this.resizeAnimationFrame);
		}

		this.resizeAnimationFrame = window.requestAnimationFrame(() => this.resizeFrame(e));
	}

	updateColumnWidths(){
		this.columnWidths = this.sizeBase.widths
		this.columnPositions = [0];
		for (let i = 1; i < this.columnWidths.length; i++) {
			this.columnPositions.push(this.columnPositions[i - 1] + this.columnWidths[i - 1]);
		}
	}

	keepScroll(direction){

		const getNextCell = (direction) => {

			const row = this.last.Cell.RowIndex;
			const col = this.last.Cell.ColumnIndex;

			switch(direction){
				case Direction.Up:
					if(row > 0){
						return this.last.Node.parentNode.previousElementSibling.childNodes[this.indexOf(this.last.Node)];
					}else{
						return null;
					}
				case Direction.Down:
					if(row < this.rows.length - 1){
						return this.last.Node.parentNode.nextElementSibling.childNodes[this.indexOf(this.last.Node)];
					}else{
						return null;
					}
				case Direction.Left:
					if(col > 0){
						return this.last.Node.previousElementSibling
					}else{
						return null;
					}
				case Direction.Right:
					if(col < this.header.length - 1){
						return this.last.Node.nextElementSibling;
					}else{
						return null;
					}
			}
		}

		const scrollToNextCell = (direction, nextCell) => {

			const nextCellNode = this.toCellNode(nextCell);
			let position;

			if(!nextCellNode.Node){
				switch(direction){
					case Direction.Up:
						position = this.childPositions[this.startNode - 1];
						break;
					case Direction.Down:
						position = this.childPositions[this.endNode + 1];
						break;
				}

				this.alterScrollPosition(position);
				nextCell = null;

				return true;
			}

			return this.scrollRequired(nextCellNode);
		}

		const nextCell = getNextCell(direction);

		if(nextCell){

			if(scrollToNextCell(direction, nextCell)){
				this.scrollCallback = this.createCallback(this.triggerCellMouseOver, {nextCell, direction})
			}else{
				this.triggerCellMouseOver({nextCell, direction});
			}

		}else{
			this.resetInterval();
		}

	}

	triggerCellMouseOver(args){

		if(!args.nextCell){

			switch(args.direction){
				case Direction.Up:
					args.nextCell = this.visibleNodes[0].childNodes[this.indexOf(this.last.Node)];
					break;
				case Direction.Down:
					args.nextCell = this.visibleNodes[this.visibleNodes.length - 1].childNodes[this.indexOf(this.last.Node)];
					break;
			}
		}

		args.nextCell.dispatchEvent(this.mouseoverEvent);
	}

	alterLast(cell){
		this.selectByShift(cell);
		this.scrollHorizontally(cell);
		this.scrollVertically(cell);
	}

	resetInterval(){
		if(this.scrollInterval){
			window.clearInterval(this.scrollInterval);
			this.scrollInterval = null;
		}
	}

	// =================================
	//  Event handlers
	// ---------------------------------

	onRootScroll(e){

		if (this.animationFrame) {
			window.cancelAnimationFrame(this.animationFrame);
		}

		this.animationFrame = window.requestAnimationFrame(() => this.doVirtualScroll(e));
	}

	onSlidebarMousedown(e){
		this.isResizing = true;
		this.currentResizeMode = this.ResizeMode.Column;
		this.resizeFrame = this.resizeColumn;
		this.lastSliderPosition = e.pageX;
		this.resizingCell = this.toCellNode(e.target.parentNode);
		this.resizingCell.Node.classList.add("noselect");
		this.viewport.style.cursor = "col-resize";
		this.firstRowCell = this.visibleNodes[0].childNodes[this.indexOf(this.resizingCell.Node)];
	}

	onRowSlidebarMousedown(e){
		this.isResizing = true;
		this.currentResizeMode = this.ResizeMode.Row;
		this.resizeFrame = this.resizeRow;
		this.lastSliderPosition = e.pageY;
		this.resizingCell = this.toCellNode(e.target.parentNode)
		this.resizingCell.Node.classList.add("noselect");
		this.viewport.style.cursor = "row-resize";
	}

	onDocumentMouseDown(e) {
		this.isDragging = false;
		this.resetInterval();
	}

	onDocumentMouseUp(e) {
		this.isDragging = false;
		this.resetInterval();

		if(this.currentResizeMode == this.ResizeMode.Row){
			this.sizeBase.heights[this.resizingCell.Cell.RowIndex] = Util.css(this.resizingCell.Node, "height");
			this.rowHeaderCellsVirtual[this.rowIndexOf(this.resizingCell.Node)].style.height = Util.css(this.resizingCell.Node, "height")  + "px";
			this.prepareVirtualScroll(this.viewport.scrollTop, this.viewport.scrollLeft, true);
			this.container.style.height = this.totalContentHeight + "px";
			this.alterViewportOffset();
		}else if(this.currentResizeMode == this.ResizeMode.Column){
			this.sizeBase.widths[this.resizingCell.Cell.ColumnIndex + 1] = Util.css(this.resizingCell.Node, "width");
			this.columnHeaderCells[this.resizingCell.Cell.ColumnIndex].style.width = Util.css(this.resizingCell.Node, "width")  + "px";
			this.updateColumnWidths();
		}

		if(this.isResizing){
			this.isResizing = false;
			this.currentResizeMode = this.ResizeMode.None;
			this.resizingCell.Node.classList.remove("noselect");
			this.viewport.style.cursor = "default";
		}
	}

	onDocumentMouseMove(e){

		const getDirection = (e) => {

			const rect = this.viewport.getBoundingClientRect();

			if(e.clientX < rect.left){
				return Direction.Left;
			}

			if(e.clientX > Util.css(this.viewport, "width")){
				return Direction.Right;
			}

			if(e.clientY < rect.top){
				return Direction.Up;
			}

			if(e.clientY > rect.top){
				return Direction.Down;
			}

			return null;

		}

		this.moveSlidebar(e);

		if(!this.hasFocus() || !this.isDragging){
			return true;
		}

		if(e.target.classList.contains("gtbl-value-cell") || e.target.classList.contains("gtbl-header-cell")){
			this.resetInterval();
			return true;
		}

		this.resetInterval();

		this.scrollInterval = window.setInterval(this.keepScroll.bind(this), 50, getDirection(e));
	}

	onDocumentCopy(e){
		if(this.hasFocus()){
			this.copyToClipboard(e);
		}
	}

	onCornerCellClick(e){
		this.setFocus();
		this.selectAll();
	}

	onCloneHeaderClick(e){
		if(this.isEditing){
			this.endEdit();
		}
		this.selectRow(this.rowHeaderCellsVirtual[this.indexOf(this.current.Node.parentNode)]);
	}

	onEditorKeydown(e){

		if(e.key == "Enter"){

			e.preventDefault();

			if(e.altKey || e.ctrlKey){
				const value = this.editor.value + "\n";
				this.editor.value = value;
				const size = this.calculateEditorSize(value + "\n");
				this.editor.style.height = size.height + "px";
			}else{
				this.endEdit();
				this.moveCellByArrowKey(Direction.Down, false);
			}

		}

	}

	onEditorKeypress(e){
		const size = this.calculateEditorSize(this.editor.value + e.key);
		this.editor.style.width = size.width + "px";
		this.editor.style.height = size.height + "px";
	}

	onFocusHolderPaste(e){
		e.preventDefault();
		const pastedData = Util.getClipboardText(e);
		this.beginEdit(pastedData);
		const size = this.calculateEditorSize(this.editor.value);
		this.editor.style.width = size.width + "px";
		this.editor.style.height = size.height + "px";
	}

	onEditorPaste(e){
		e.preventDefault();
		const pastedData = Util.getClipboardText(e);
		const currentText = this.editor.value;
		const caretPosition = this.editor.selectionStart;
		const newValue = currentText.slice(0, caretPosition) + pastedData + currentText.slice(caretPosition)
		this.editor.value = newValue;

		const size = this.calculateEditorSize(this.editor.value);
		this.editor.style.width = size.width + "px";
		this.editor.style.height = size.height + "px";
	}

	onEditorBlur(e){
		if(this.isEditing){
			this.endEdit();
		}
	}

	onFocusHolderKeyUp(e){

		if(this.shiftKey && e.key == "Shift"){
			this.isDragging = false;
		}

		if(e.key == "F2"){
			this.beginEdit();
			return false;
		}
	}

	onFocusHolderKeydown(e){

		if(!this.hasFocus()) return true;

		if (e.ctrlKey && e.key === "a") {
			e.preventDefault();
			this.selectAll();
			return;
		}

		if(e.ctrlKey && e.key === "z"){
			e.preventDefault();
			this.undoEdit();
			return;
		}

		if(e.ctrlKey && e.key === "y"){
			e.preventDefault();
			this.redoEdit();
			return;
		}

		if(e.key == "Enter"){
			e.preventDefault();
			this.moveCellByArrowKey(Direction.Down, false);
			return;
		}

		if(e.key == "F3"){
			if(this.dialog.style.display == "block"){

				e.preventDefault();
				if(e.shiftKey){
					this.doSearch(Direction.Up);
				}else{
					this.doSearch(Direction.Down);
				}
				return;
			}
		}

		if(e.ctrlKey && e.key == "f"){
			e.preventDefault();
			this.openSearchDialog();
			this.dialog.childNodes[0].focus();
			return;
		}

		if(e.key == "Escape"){
			e.preventDefault();
			this.closeSearchDialog();
		}

		if(e.ctrlKey){
			switch(e.key){
				case "End":
					e.preventDefault();
					this.moveCellByCtrlArrowKey(Direction.End, e.shiftKey);
					return false;
				case "Home":
					e.preventDefault();
					this.moveCellByCtrlArrowKey(Direction.Home, e.shiftKey);
					return false;
				case "ArrowLeft":
					e.preventDefault();
					this.moveCellByCtrlArrowKey(Direction.Left, e.shiftKey);
					return false;
				case "ArrowRight":
					e.preventDefault();
					this.moveCellByCtrlArrowKey(Direction.Right, e.shiftKey);
					return false;
				case "ArrowUp":
					e.preventDefault();
					this.moveCellByCtrlArrowKey(Direction.Up, e.shiftKey);
					return false;
				case "ArrowDown":
					e.preventDefault();
					this.moveCellByCtrlArrowKey(Direction.Down, e.shiftKey);
					return false;
			}
		}

		switch (e.key) {
			case "End":
				e.preventDefault();
				this.moveCellByArrowKey(Direction.End);
				return false;
			case "Home":
				e.preventDefault();
				this.moveCellByArrowKey(Direction.Home);
				return false;
			case "ArrowLeft":
				e.preventDefault();
				this.moveCellByArrowKey(Direction.Left, e.shiftKey);
				return false;
			case "ArrowRight":
				e.preventDefault();
				this.moveCellByArrowKey(Direction.Right, e.shiftKey);
				return false;
			case "ArrowUp":
				e.preventDefault();
				this.moveCellByArrowKey(Direction.Up, e.shiftKey);
				return false;
			case "ArrowDown":
				e.preventDefault();
				this.moveCellByArrowKey(Direction.Down, e.shiftKey);
				return false;
		}

	}

	onFocusHolderKeypress(e){
		e.preventDefault();
		this.beginEdit(e.key);
		this.onEditorKeypress(e);
		return false;
	}

	onSearchDialogKeydown(e){

		if(e.key == "Enter"){
			e.preventDefault();
			this.doSearch(Direction.Down);
		}

		if(e.key == "F3"){
			e.preventDefault();
			if(e.shiftKey){
				this.doSearch(Direction.Up);
			}else{
				this.doSearch(Direction.Down);
			}
		}

		if(e.key == "Escape"){
			e.preventDefault();
			this.closeSearchDialog();
			this.setFocus();
		}
	}

	onCellDblClick(e){
		this.beginEdit();
	}

	onCellMouseUp(e) {
		this.isDragging = false;
	}

	onCellMouseDown(e) {

		e.stopPropagation();

		this.setFocus();

		this.mouseButton = e.button;

		const cell = e.target;

		e.preventDefault();

		this.isDragging = true;
		this.bypassHighlightByScroll = false;
		this.currentSelectionMode = this.SelectionMode.Cell

		if(e.shiftKey){
			this.selectByShift(cell);
		}else{
			this.selectByMouseDown(cell);
		}
	}

	onCellMouseOver(e) {

		if (!this.isDragging) return;

		if(this.mouseButton != 0) return;

		const cell = e.target;

		this.clearSelection();

		this.last = this.toCellNode(cell);

		if(this.current.Cell.equals(this.last.Cell)){
			this.rowHeaderCellsVirtual[this.indexOf(cell.parentNode)].classList.add("row-highlight");
			this.columnHeaderCells[this.indexOf(cell) - 1].classList.add("row-highlight");
			return;
		}

		this.changeHighlight(cell);

		this.scrollHorizontally(cell, true);
		this.scrollVertically(cell, true);
	}

	onRowHeaderCellClick(e){
		if(this.resizingCell){
			this.resizingCell = null;
			return;
		}

		this.selectRow(e.target);
	}

	onColumnHeaderCellClick(e){
		if(this.resizingCell){
			this.resizingCell = null;
			return;
		}

		if(typeof window.getSelection != "undefined" && window.getSelection().toString()){
			return;
		}

		this.selectColumn(e.target);
	}

	onColumnHeaderCellDblClick(e){
		e.stopPropagation();
		this.selectColumn(e.target.parentNode);
		this.sort(this.indexOf(e.target.parentNode) - 1);
	}

	// ---------------------------------

	beginEdit(value){

		if(!this.current) return;

		this.isEditing = true;
		this.prepareEditor(value);

		if(this.readOnly || this.readOnlyColumns.has(this.current.Cell.ColumnIndex)){
			this.editor.setAttribute("readOnly", "true");
		}else{
			this.editor.removeAttribute("readOnly");
			this.history.begin(this.current, this.current.Node.textContent, this.sizeBase.heights[this.current.Cell.RowIndex]);
		}

		this.editor.focus();
	}

	prepareEditor(value){

		const scrollLeft = this.viewport.scrollLeft;
		const positionLeft = (this.current.Node.getBoundingClientRect().left - this.viewport.getBoundingClientRect().left) + scrollLeft;
		const position = { left:positionLeft, top:this.childPositions[this.current.Cell.RowIndex] };

		this.inputHolder.style.position = "absolute";
		this.inputHolder.style.top = position.top + this.headerHeight + "px";
		this.inputHolder.style.left = position.left + "px";

		this.editor.style.width = Util.css(this.current.Node, "width") + "px";
		this.editor.style.height = Util.css(this.current.Node, "height") + "px";

		this.editor.value = "";
		if(value){
			this.editor.value = value;
		}else{
			this.editor.value = this.current.Node.textContent;
		}
	}

	endEdit(){
		this.isEditing = false;
		this.current.Node.textContent = this.editor.value;
		this.history.end(this.editor.value, this.sizeBase.heights[this.current.Cell.RowIndex]);
		this.initEditor();
		this.recalculateViewport();
		this.setFocus();
	}

	endUndoRedo(memento){
		this.sizeBase.heights[memento.CellNode.Cell.RowIndex] = memento.height;
		this.recalculateViewport();
	}

	initEditor(){
		this.editor.style.width = "0px";
		this.editor.style.height = "0px";
		this.inputHolder.style.position = "fixed";
		this.inputHolder.style.top = "-100px";
		this.inputHolder.style.left = "-100px";
	}

	undoEdit(){
		if(!this.history.canUndo()) return;

		const memento = this.history.undo();
		this.endUndoRedo(memento);
		this.selectByMouseDown(memento.CellNode.Node)
	}

	redoEdit(){
		if(!this.history.canRedo()) return;

		const memento = this.history.redo();
		this.endUndoRedo(memento);
		this.selectByMouseDown(memento.CellNode.Node)
	}

	calculateEditorSize(value){

		const data = value.split("\n");
		const maxLengthValue = data.reduce((a,b) => Util.compareLength(a,b));
		let width = Util.getStringWidth(maxLengthValue, false, Util.css(this.viewport, "font")) - 28;

		if(width <= Util.css(this.current.Node, "width")){
			width = Util.css(this.current.Node, "width");
		}

		let height = Util.measureHeight(this.calculationBaseStyles, value);
		if(height > this.sizeBase.heights[this.current.Cell.RowIndex]){
			this.sizeBase.heights[this.current.Cell.RowIndex] = height;
		}else{
			height = this.getChildHeight(this.current.Cell.RowIndex)
		}

		return {width, height}
	}

	recalculateViewport(){
		this.prepareVirtualScroll(this.viewport.scrollTop, this.viewport.scrollLeft, true)
		this.container.style.height = this.totalContentHeight + "px";
		this.alterViewportOffset();
	}

	doSearch(direction){

		const currentRowIndex = this.current == null ? 0 : this.current.Cell.RowIndex;

		const value = this.dialog.childNodes[0].value;

		const found = this.searchUtil.search(this.rows, value, direction, currentRowIndex);

		this.searchResultArea.textContent = this.searchUtil.ResultText;

		if(!found){
			return;
		}

		this.isSearching = true;

		const target = 	{
			Node: null,
			Cell: new Cell(this.searchUtil.CurrentResult.RowIndex, this.searchUtil.CurrentResult.ColumnIndex)
		};


		if(this.scrollRequired(target) == false){
			const rowIndex = this.searchUtil.CurrentResult.RowIndex - this.startNode;
			const columnIndex = this.searchUtil.CurrentResult.ColumnIndex + 1;
			this.selectByMouseDown(this.visibleNodes[rowIndex].childNodes[columnIndex]);
		}

		this.isSearching = false;

	}

	closeSearchDialog(){
		this.table.querySelectorAll(".found").forEach(el => el.classList.remove("found"));
		this.dialog.classList.remove("open");
	}

	openSearchDialog(){
		this.dialog.classList.add("open");
	}

	copyToClipboard(e){

		e.preventDefault();

		const escapeNewLine = (value) => {

			const stringValue = Util.toStringNullSafe(value);

			if(stringValue.includes("\n")){
				return '"' + stringValue + '"';
			}

			return stringValue;
		}

		const dataArray = this.currentSelectionMode == this.SelectionMode.All ? [this.header] : [];

		for(let row = this.selection.Start.RowIndex; row <= this.selection.End.RowIndex; row++){
			dataArray.push(
				this.rows[row].slice(this.selection.Start.ColumnIndex, this.selection.End.ColumnIndex + 1)
								.map(item => escapeNewLine(item)).join("\t")
			);
		}

		const clipboardData = e.clipboardData || window.clipboardData || e.originalEvent.clipboardData;

		clipboardData.setData("text/plain" , dataArray.join("\n"));
	}

	filter(columnIndex, value){
		if(columnIndex == 0) return;

		if(this.filtered) return;

		this.filtered = true;
		this._rows = this.rows;
		this.rows = [];

		this._rows.forEach((row) => {

			row.forEach((item, colindex) => {

				if(colindex == columnIndex && item == value){
					this.rows.push(row);
					return false;
				}

			});

		});

		this.resetViewport();
	}

	clearFilter(){
		if(!this.filtered) return;

		this.filtered = false;
		this.rows = this._rows;
		this._rows = null;
		this.resetViewport();
	}

	export(options){

		const delimitter = options.delimitter ? options.delimitter : ",";
		const extension = options.extension ? options.extension : ".csv";
		const fileName = options.fileName ? options.fileName : "export";
		const bom = options.bom ? new Uint8Array([0xEF, 0xBB, 0xBF]) : null;
		const includeHeader = options.includeHeader ? options.includeHeader : true;

		const dblQuote = "\"";
		const sequences = [dblQuote, ",", "\n", "\r", "\r\n"];

		const escapeCsv = (data) => {
			if (sequences.some(chr => data.includes(chr))){
				return dblQuote + data + dblQuote;
			}else{
				return data;
			}
		}

		let content;
		if(includeHeader){
			content = [this.header].concat(this.rows).map(row => row.map(cell => escapeCsv(Util.toStringNullSafe(cell))).join(delimitter)).join("\n");
		}else{
			content = this.rows.map(row => row.map(cell => escapeCsv(Util.toStringNullSafe(cell))).join(delimitter)).join("\n");
		}

		let blob;
		if(bom){
			blob = new Blob([ bom, content ], { "type" : "text/csv" });
		}else{
			blob = new Blob([ content ], { "type" : "text/csv" });
		}

		const link = document.createElement('a');
		link.href = (window.URL ? URL : webkitURL).createObjectURL(blob);
		link.download = fileName + extension;
		this.viewport.append(link);
		link.click();
		link.remove();
	}

	sort(columnIndex){

		if(!this.sortMap[columnIndex]){
			this.sortMap[columnIndex] = "asc";
		}

		const ascending = this.sortMap[columnIndex];

		if(ascending === "asc"){
			this.rows.sort((a,b) => Util.toStringNullSafe(a[columnIndex]).localeCompare(Util.toStringNullSafe(b[columnIndex])));
			this.sortMap[columnIndex] = "desc";
		}else{
			this.rows.sort((a,b) => Util.toStringNullSafe(b[columnIndex]).localeCompare(Util.toStringNullSafe(a[columnIndex])));
			this.sortMap[columnIndex] = "asc";
		}

		this.sizeBase = Util.getSizeBase(this.header, this.rows, this.calculationBaseStyles);
		this.prepareVirtualScroll(this.viewport.scrollTop, this.viewport.scrollLeft, true);
		this.alterViewportOffset();
		this.updateVirtualSelection();
		new Array(this.visibleNodesCount)
			.fill(null)
			.map((_, index) => this.getRowDataAt(index + this.startNode))
			.forEach((row, rowIndex) => this.changeRowValue(row, rowIndex, true));
	}

	destroy(){
	}

}

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

class SearchUtil{

	constructor(){
		this._init();
	}

	_init(){
		this.Results = [];
		this.CurrentResult = {};
		this.SearchedValue = null;
		this.ResultText = "0/0";
	}

	search(rows, value, direction, currentRowIndex){

		if(value == null || value == ""){
			this._init();
			return false;
		}

		if(this._canContinue(value)){
			return this.continueSearch(direction);
		}

		this.CurrentResult = {};
		this.Results = [];
		this.SearchedValue = value;
		this.ResultText = "0/0";

		return this.startSearch(rows, value, currentRowIndex);
	}

	startSearch(rows, value, currentRowIndex){

		let exp;

		try{
			exp = new RegExp(value, 'i');
		}catch(e){
			return false;
		}

		rows.forEach( (row, rowIndex) => {

			row.forEach( (col, colIndex) => {

				if(exp.test(col)){
					const result = {Index: this.Results.length, RowIndex: rowIndex, ColumnIndex: colIndex};
					this.Results.push(result);
				}

			})

		})

		if(this.Results.length <= 0){
			return false;
		}

		const closestIndex = Util.findClosest(currentRowIndex, this.Results, this.Results.length -1, "RowIndex");

		this.CurrentResult = this.Results[closestIndex];

		this.ResultText = (closestIndex + 1) + "/" + this.Results.length;

		return true;
	}

	_canContinue(value){
		return this.SearchedValue == value && this.Results.length > 0;
	}

	continueSearch(direction){

		const nextIndex = direction == Direction.Down ? this.CurrentResult.Index + 1 : this.CurrentResult.Index - 1;

		if(direction == Direction.Down && this.Results.length == nextIndex){
			return false;
		}

		if(direction == Direction.Up && nextIndex == -1){
			return false;
		}

		this.CurrentResult = this.Results[nextIndex];

		this.ResultText = (nextIndex + 1) + "/" + this.Results.length;

		return true;

	}

}

class EditHistory{

	constructor(rows){
		this.rows = rows;
		this._undoStack = [];
		this._redoStack = [];
	}


	begin(cellNode, value, height){
		this.edition = {undo:{CellNode:cellNode, value:value, height: height}};
	}

	end(value, height){
		if(this.edition.value == value){
			this.edition = null;
			return;
		}

		this._redoStack = [];
		this.edition.redo = {CellNode:this.edition.undo.CellNode, value:value, height: height}
		this._undoStack.push(this.edition);
		this.rows[this.edition.undo.CellNode.Cell.RowIndex][this.edition.undo.CellNode.Cell.ColumnIndex] = value;
	}

	canUndo(){
		return this._undoStack.length > 0;
	}

	undo(){
		const stack = this._undoStack.pop();
		this._redoStack.push(stack);
		const undo = stack.undo;
		this.rows[undo.CellNode.Cell.RowIndex][undo.CellNode.Cell.ColumnIndex] = undo.value;
		undo.CellNode.Node.textContent = undo.value;
		return undo;
	}

	canRedo(){
		return this._redoStack.length > 0;
	}

	redo(){
		const stack = this._redoStack.pop();
		this._undoStack.push(stack);
		const redo = stack.redo;
		this.rows[redo.CellNode.Cell.RowIndex][redo.CellNode.Cell.ColumnIndex] = redo.value;
		redo.CellNode.Node.textContent = redo.value;
		return redo;
	}

	clear(){
		this._undoStack = [];
		this._redoStack = [];
	}

}

class Util{

	static css(element, className){

		let style;
		if(element.style[className]){
			style = element.style[className];
		}else{
			style = window.getComputedStyle(element)[className];
		}

		if(className.toUpperCase() == "WIDTH" || className.toUpperCase() == "HEIGHT"){
			return parseInt(style.replace("px",""));
		}else{
			return style;
		}

	}

	static toStringNullSafe(value){

		if(value == null){
			return "";
		}

		return value.toString();

	}

	static getClipboardText(e){
		const clipboardData = e.clipboardData || window.clipboardData || e.originalEvent.clipboardData;
		return clipboardData.getData('Text');
	}

	static findClosest(target, items, itemCount, key){
		let startRange = 0;
		let endRange = itemCount > 0 ? itemCount - 1 : 0;

		while (endRange !== startRange) {

			const middle = Math.floor((endRange - startRange) / 2 + startRange);

			const value = key == null ? items[middle] : items[middle][key];
			const nextValue = key == null ? items[middle + 1] : items[middle + 1][key];

			if (value <= target && nextValue > target) {
				return middle;
			}

			if (middle === startRange) {
				return endRange;
			}

			if (value <= target) {
				startRange = middle;
			}else{
				endRange = middle;
			}
		}

		return itemCount;
	}

	static getByteLength(value){

		const isMultiByteChr = (chr) => {
			if(chr >= 0x00 && chr < 0x81) return false;

			if(chr === 0xf8f0) return false;

			if(chr >= 0xff61 && chr < 0xffa0) return false;

			if(chr >= 0xf8f1 && chr < 0xf8f4) return false;

			return true;
		}

		let result = 0;

		for(let i = 0; i < value.length; i++){

			if(isMultiByteChr(value.charCodeAt(i))){
				result += 2;
		  	}else{
				result += 1;
		  	}
		}

		return result
	}

	static transpose(array) {
		return Object.keys(array[0]).map(key => {
			return array.map(item => {
				return item[key];
			});
		});
	}

	static reduceString(array){
		return this.transpose(array).map(item => item.reduce(this.compareLength.bind(this)));
	}

	static compareLength(a, b){
		const left = this.toStringNullSafe(a).split("\n").reduce((a, b) => this.getByteLength(a) > this.getByteLength(b) ? a : b);
		const right = this.toStringNullSafe(b).split("\n").reduce((a, b) => this.getByteLength(a) > this.getByteLength(b) ? a : b);

		return this.getByteLength(left) > this.getByteLength(right) ? left : right;
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

	static measureHeight(styles, text){
		const array = this.toStringNullSafe(text).split("\n");
		return (styles.lineHeight * array.length) + styles.borderWidth;
	}

	static reduceRowHeights(a, b){
		const comparingHeight = this.measureHeight(this.styles, b);
		return comparingHeight > a ? comparingHeight : a;
	}

	static getSizeBase(header, rows, styles){

		this.styles = styles;

		const heightBases = rows.map(item => {
			return item.reduce(this.reduceRowHeights.bind(this), this.styles.baseHeight);
		});

		const _numberColumnWidth = this.getStringWidth(rows.length, false, this.styles.font);
		const _maxLengthValues = this.reduceString([header].concat(rows));

		return {
			widths: [_numberColumnWidth].concat(_maxLengthValues.map(item => this.getStringWidth(item, true, this.styles.font))),
			heights: heightBases
		};
	}

}
