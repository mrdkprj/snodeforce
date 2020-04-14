"use strict";
class GridTable {

	constructor(rootElement, data) {

		this.rootElement = $(rootElement);
		this.rootHeight = 500;

		this.animationFrame = null;
		this.rows = data.rows;
		this.header = data.header;
		this._rows = null;

		this.baseRowHeight = 22;
		this.headerHeight = 27;
		this.itemCount = this.rows.length;
		this.totalContentHeight = 0;
		this.childPositions = null;
		this.startNode = 0;
		this.endNode = 0;
		this.visibleNodesCount = 0;
		this.nodeOffsetY = 0;
		this.nodeOffsetX = 0;
		this.visibleViewportHeight = 0;
		this.barHeight = 0;
		this.barWidth = 0;

		this.sizeBase = Util.getSizeBase(this.header, this.rows, this.rootElement.css("font"));
		this.columnWidths = this.sizeBase.widths;

		this.lastPostion = {X:0,Y:0};
		this.scrollCallback = null;
		this.filtered = false;
		this.isDragging = false;

		this.container = null;
		this.table = null;
		this.viewport = null;
		this.visibleNodes = null;
		this.focusHolder = null;
		this.cornerCell = null;
		this.rowHeaderCells = [];
		this.columnHeaderCells = [];

		this.current = null;
		this.last = null;
		this.nextCell = null;
		this.selection = new Selection();
		this.virtualSelection = new Selection();
		this.preferredDirection = null;

		this.Delta = {
				Up:1,
				Down:2,
				Left:3,
				Right:4,
				Home:5,
				End:6
		};

		this.SelectionMode = {
			Cell: 1,
			Row: 2,
			Column: 3,
			All: 4,
			ContentSelectable: 5
		}

		this.sortMap = {0: "asc"};

		this.currentSelectionMode = this.SelectionMode.Cell;

		$(document).on("mousedown", this.onDocumentMouseDown.bind(this));
		$(document).on("mouseup", this.onDocumentMouseUp.bind(this));
		$(document).on("copy" , this.onDocumentCopy.bind(this));
		$(document).on("mousemove", this.onDocumentMouseMove.bind(this));
		this.rootElement.on("scroll", this.onRootScroll.bind(this));

		this.scrollInterval = null;

		this.initialize();
	}

	initialize(){
		this.rootElement.empty();
		this.rootElement.height(this.rootHeight + "px");
		this.rootElement.css("overflow","auto");

		this.prepareVirtualScroll(this.rootElement.scrollTop(), this.rootElement.scrollLeft(), true);
		this.createGridTable();
		this.barHeight = this.rootHeight - this.rootElement[0].clientHeight;
		this.barWidth = this.rootElement.width() - this.rootElement[0].clientWidth;
	}

	prepareVirtualScroll(scrollTop, scrollLeft, reset){

		const findStartNode = (scrollTop, nodePositions, itemCount) => {
			let startRange = 0;
			let endRange = itemCount > 0 ? itemCount - 1 : 0;

			while (endRange !== startRange) {

				const middle = Math.floor((endRange - startRange) / 2 + startRange);

				if (nodePositions[middle] <= scrollTop && nodePositions[middle + 1] > scrollTop) {
					return middle;
				}

				if (middle === startRange) {
					return endRange;
				}

				if (nodePositions[middle] <= scrollTop) {
					startRange = middle;
				}else{
					endRange = middle;
				}
			}

			return itemCount;
		}

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

		const firstVisibleNode = findStartNode(scrollTop, this.childPositions, this.itemCount);

		this.startNode = Math.max(0, firstVisibleNode - renderAhead);

		const lastVisibleNode = findEndNode(this.childPositions, firstVisibleNode, this.itemCount, this.rootHeight);
		this.endNode = Math.min(this.itemCount - 1, lastVisibleNode + renderAhead);

		this.visibleNodesCount = this.endNode - this.startNode + 1;

		this.visibleViewportHeight = this.rootHeight - this.headerHeight;

		this.nodeOffsetY = this.childPositions[this.startNode];
		this.nodeOffsetX = scrollLeft;
	}

	getChildHeight(index){
		if(this.sizeBase.heights[index] > 1){
			return (this.baseRowHeight * this.sizeBase.heights[index]) - (this.sizeBase.heights[index] - 1);
		}else{
			return this.baseRowHeight;
		}
	}

	createGridTable(){

		const getContainer = () => {
			const container = $("<div>", { class: "gtbl-container", css: {"height": this.totalContentHeight + "px", "overflow": "hidden", "display":"inline-block"}});
			container.id = "gtbl_".concat(this.generateUuid());;
			return container;
		}

		const getColumnHeader = () => {

			const columnHeader = $("<div>", { class: "gtbl-row gtbl-row-header gtbl-hidden-row-header"});

			this.cornerCell = getCornerCell();
			columnHeader.append(this.cornerCell);

			this.header.forEach((item, index) => {
				//const header = $("<div>", { class: "gtbl-header-cell gtbl-col-header-cell stick", text: item });
				const header = $("<div>", { class: "gtbl-header-cell gtbl-col-header-cell stick"});
				header.width(this.columnWidths[index + 1] + "px");
				header.css("min-width", this.columnWidths[index + 1] + "px");
				header.on("click", this.onColumnHeaderCellClick.bind(this));
				header.on("dblclick", this.onColumnHeaderCellDblClick.bind(this));

				const link = $("<a>", { class: "sort-link", text: item});
				link.on("click", this.onColumnHeaderCellDblClick.bind(this));
				header.append(link);

				this.columnHeaderCells.push(header);
				columnHeader.append(header);
			});

			return columnHeader;
		}

		const getCornerCell = () => {
			const cornerCell = $("<div>", { class: "gtbl-header-cell gtbl-corner-cell stick"});
			cornerCell.width(this.columnWidths[0] + "px");
			cornerCell.css("min-width", this.columnWidths[0] + "px");
			cornerCell.on("click", this.onCornerCellClick.bind(this));
			return cornerCell;
		}

		const getTable = () => {
			return $("<div>", { class: "gtbl gtbl-grid" });
		}

		const getViewport = () => {
			return $("<div>", { class: "node-container", css:{"transform": "translateY(0px)"}});
		}

		const getFocusHolder = () => {
			const focusHolder = $("<input class='focusHolder' type='text' value='' style='position:fixed;top:-100px;left:-100px;'/>");
			focusHolder.on("keydown", this.onFocusHolderKeyDown.bind(this));
			focusHolder.on("keyup", this.onFocusHolderKeyUp.bind(this));
			return focusHolder;
		}

		this.container = getContainer();
		this.rootElement.append(this.container);
		this.rootElement.prepend(getColumnHeader());

		this.table = getTable();
		this.container.append(this.table);

		this.viewport = getViewport();
		this.table.append(this.viewport);

		this.visibleNodes = this.getVisibleChildNodes();
		this.viewport.append(this.visibleNodes);

		this.focusHolder = getFocusHolder();
		this.rootElement.append(this.focusHolder);
	}

	createRow(rowIndex){

		const rowData = this.rows[rowIndex];

		const isFirstRow = rowIndex == 0;

		const rowDiv = $("<div>", { class: "gtbl-row gtbl-detail" });

		const rowHeaderCell = $("<div>", { class: "gtbl-header-cell gtbl-row-header-cell stick", css:{"transform": "translate3D(0px, 0px, 0px)"}, text: rowIndex + 1 });
		rowHeaderCell.on("click", this.onRowHeaderCellClick.bind(this));

		if(isFirstRow){
			rowHeaderCell.width(this.columnWidths[0] + "px");
			rowHeaderCell.css("min-width", this.columnWidths[0] + "px");
		}

		this.rowHeaderCells.push(rowHeaderCell);

		rowDiv.append(rowHeaderCell);

		rowData.forEach((cellvalue, cellIndex) => {
			const cell = $("<div>", { class: "gtbl-value-cell", text: Util.toStringNullSafe(cellvalue)});
			cell.on("mousedown", this.onCellMouseDown.bind(this));
			cell.on("mouseup", this.onCellMouseUp.bind(this));
			cell.on("mouseover", this.onCellMouseOver.bind(this));
			cell.on("dblclick", this.onCellDblClick.bind(this));

			if(isFirstRow){
				cell.width(this.columnWidths[cellIndex + 1] + "px");
				cell.css("min-width",this.columnWidths[cellIndex + 1] + "px");
			}

			rowDiv.append(cell);

		});

		return rowDiv;
	}

	getVisibleChildNodes(){
		this.rowHeaderCells = [];

		return new Array(this.visibleNodesCount)
					.fill(null)
					.map((_, index) => this.createRow(index + this.startNode));
	}

	doVirtualScroll(e){

		const getRowDataAt = (index) => {
			return [index + 1].concat(this.rows[index]);
		}

		const addRow = (index) => {
			const newItem = this.createRow(index);
			this.visibleNodes.push(newItem);
			this.viewport.append(newItem);
		}

		const changeRowValue = (rowArray, arrayIndex) => {

			if(arrayIndex > this.visibleNodes.length - 1){
				addRow(arrayIndex);
			}

			const rowIndex = arrayIndex + this.startNode;

			rowArray.forEach((value, index) => {

				const node = this.visibleNodes[arrayIndex][0].childNodes[index];
				node.innerHTML = value;

				// Update current cell
				if(shouldMarkAsCurrent(rowIndex, index)){
					this.markCurrent($(node), true);
					if(this.currentSelectionMode == this.SelectionMode.ContentSelectable){
						this.markCurrentCellAsSelectable();
					}
				}

				// Update last selected cell
				if(shouldChangeLast(rowIndex, index)){
					this.last = this.toCellNode($(node));
				}

			});
		}

		const shouldMarkAsCurrent = (rowIndex, colIndex) => {

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

		this.prepareVirtualScroll(e.target.scrollTop, e.target.scrollLeft);

		if(this.current){
			this.current.Node.removeClass("current");
			this.clearSelectable();
		}

		this.alterTransform();

		new Array(this.visibleNodesCount)
			.fill(null)
			.map((_, index) => getRowDataAt(index + this.startNode))
			.forEach((row, rowIndex) => changeRowValue(row, rowIndex));

		if(this.visibleNodesCount < this.visibleNodes.length - 1){
			const count = (this.visibleNodes.length - 1) - this.visibleNodesCount;
			this.visibleNodes.splice(this.visibleNodesCount, count).forEach(el => el[0].remove());
			this.rowHeaderCells.splice(this.visibleNodesCount, count);
		}

		this.changeHighlightByScroll();

		if(this.scrollCallback){
			this.scrollCallback();
			this.scrollCallback = null;
		}
	}

	alterTransform(){
		this.viewport.css("transform","translateY(" + this.nodeOffsetY + "px)");
		this.rowHeaderCells.forEach(cell => cell.css("transform","translate3D(" + this.nodeOffsetX + "px,0px,0px)"));
	}

	alterScrollPosition(top, left){
		if(top != null){
			this.rootElement.scrollTop(top);
		}

		if(left != null){
			this.rootElement.scrollLeft(left);
		}
	}

	moveCellByCtrlArrowKey(direction, withShiftkey){

		this.bypassHighlightByScroll = !withShiftkey;
		this.preferredDirection = direction;
		this.shiftKey = withShiftkey;
		if(withShiftkey){
			this.anchor = this.last;
		}else{
			this.anchor = this.current;
		}

		const scrollTop = this.rootElement.scrollTop();
		const scrollLeft = this.rootElement.scrollLeft();

		switch(direction){
			case this.Delta.End:
				this.alterScrollPosition(this.rootElement[0].scrollHeight, this.rootElement[0].scrollWidth);
				break;
			case this.Delta.Home:
				this.alterScrollPosition(0,0);
				break;
			case this.Delta.Left:
				this.alterScrollPosition(null, 0);
				break;
			case this.Delta.Right:
				this.alterScrollPosition(null, this.rootElement[0].scrollWidth);
				break;
			case this.Delta.Up:
				this.alterScrollPosition(0);
				break;
			case this.Delta.Down:
				this.alterScrollPosition(this.rootElement[0].scrollHeight);
				break;
		}

		if(scrollTop != this.rootElement.scrollTop() || scrollLeft != this.rootElement.scrollLeft()){
			this.scrollCallback = this.changeCellByCtrlArrowKey;
		}else{
			this.changeCellByCtrlArrowKey();
		}
	}

	changeCellByCtrlArrowKey(){

		let row, cell;

		switch(this.preferredDirection){
			case this.Delta.End:
				row = this.visibleNodes[this.visibleNodes.length - 2];
				cell = row[0].children[row[0].children.length - 1]
				break;
			case this.Delta.Home:
				row = this.visibleNodes[0];
				cell = row[0].children[1];
				break;
			case this.Delta.Left:
				row = this.visibleNodes[this.anchor.Node.parent().index()];
				cell = row[0].children[1];
				break;
			case this.Delta.Right:
				row = this.visibleNodes[this.anchor.Node.parent().index()];
				cell = row[0].children[row[0].children.length - 1]
				break;
			case this.Delta.Up:
				row = this.visibleNodes[0];
				cell = row[0].children[this.anchor.Node.index()];
				break;
			case this.Delta.Down:
				row = this.visibleNodes[this.visibleNodes.length - 2];
				cell = row[0].children[this.anchor.Node.index()];
				break;
		}

		if(this.shiftKey){
			this.selectByShift($(cell));
		}else{
			this.selectByMouseDown($(cell));
		}
	}

	moveCellByArrowKey(direction, withShiftkey){

		this.bypassHighlightByScroll = !withShiftkey;
		this.preferredDirection = direction;
		this.shiftKey = withShiftkey;

		const changeLastRowIndex = (direction, cellNode) => {
			switch(direction){
				case this.Delta.Left:
					cellNode.Cell.ColumnIndex--;
					break;
				case this.Delta.Right:
					cellNode.Cell.ColumnIndex++;
					break;
				case this.Delta.Up:
					cellNode.Cell.RowIndex--;
					break;
				case this.Delta.Down:
					cellNode.Cell.RowIndex++;
					break;
			}
		}

		const moveCellAllowed = (direction, cellNode) => {

			switch(direction){
				case this.Delta.Left:
					if(cellNode.Cell.ColumnIndex  <= 0){
						return false;
					}
					return true;
				case this.Delta.Right:
					if(cellNode.Cell.ColumnIndex == this.header.length - 1){
						return false;
					}
					return true;
				case this.Delta.Up:
					if(cellNode.Cell.RowIndex  == 0){
						return false;
					}
					return true;
				case this.Delta.Down:
					if(cellNode.Cell.RowIndex + 1 == this.rows.length){
						return false;
					}
					return true;
			}
		}

		let target;
		if(withShiftkey){
			target = this.last;
		}else{
			target = this.current;
		}

		if(!moveCellAllowed(direction, target)) return;

		if(this.scrollRequired(target)){
			this.scrollCallback = this.changeCellByArrowKey;
		}else{
			this.changeCellByArrowKey();
		}
	}

	changeCellByArrowKey(){

		let cell;

		if(this.shiftKey){
			this.anchor = this.last;
		}else{
			this.anchor = this.current;
		}

		switch(this.preferredDirection){
			case this.Delta.Home:
				cell = this.anchor.Node.parent().children().eq(1);
				break;
			case this.Delta.End:
				cell = this.anchor.Node.parent().children().eq(this.header.length);
				break;
			case this.Delta.Left:
				cell = this.anchor.Node.prev();
				break;
			case this.Delta.Right:
				cell = this.anchor.Node.next();
				break;
			case this.Delta.Up:
				cell = this.anchor.Node.parent().prev().children().eq(this.anchor.Node.index());
				break;
			case this.Delta.Down:
				cell = this.anchor.Node.parent().next().children().eq(this.anchor.Node.index());
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
		let leftPosition = null;
		let topPosition = null;
		const positionTop = this.childPositions[cellNode.Cell.RowIndex];
		const scrollTop = this.rootElement.scrollTop();

		// below
		if(positionTop > scrollTop + this.visibleViewportHeight){
			topPosition = positionTop// + (this.rootHeight - this.getChildHeight(cellNode.Cell.RowIndex));
			scrollRequired = true;
		}

		// above
		if(positionTop < scrollTop){
			topPosition = positionTop;
			scrollRequired = true;
		}

		// hidden below
		/*
		if(cellNode.Cell.RowIndex > this.startNode + this.visibleNodesCount){
			console.log(1)
			position = this.baseRowHeight * (cellNode.Cell.RowIndex - (this.visibleNodesCount - 3));
			this.alterScrollPosition(this.rootElement.scrollTop() + position);
			scrollRequired = true;
		}
		*/

		// hidden left
		if(this.rootElement.scrollLeft() > cellNode.Node.position().left){
			leftPosition = cellNode.Node.position().left - this.columnWidths[0];
			//this.alterScrollPosition(null, leftPosition);
			scrollRequired = true;
		}

		// hidden right
		if(this.rootElement.outerWidth(true) + this.rootElement.scrollLeft() < cellNode.Node.position().left){
			const position = cellNode.Node.position().left - (this.rootElement.outerWidth(true) + this.rootElement.scrollLeft());
			leftPosition = cellNode.Node.position().left - position + this.barWidth;
			//this.alterScrollPosition(null, leftPosition);
			scrollRequired = true;
		}

		/*
		// hidden above
		if(cellNode.Cell.RowIndex < this.startNode){
			console.log(3)
			position = this.baseRowHeight * cellNode.Cell.RowIndex;
			this.alterScrollPosition(position);
			scrollRequired = true;
		}
		*/

		if(scrollRequired){
			this.alterScrollPosition(topPosition, leftPosition);
		}

		return scrollRequired;
	}

	hasFocus(){
		return this.focusHolder.is(":focus");
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
			this.current.Node.removeClass("current");
		}

		this.current = this.toCellNode(cell);

		this.current.Node.addClass("current");
		this.rowHeaderCells[cell.parent().index()].addClass("row-highlight");
		this.columnHeaderCells[cell.index() - 1].addClass("row-highlight");

		if(preventScroll){
			return;
		}

		this.scrollHorizontally(cell);
		this.scrollVertically(cell);
	}

	markCurrentCellAsSelectable(){
		this.current.Node.addClass("selectable");
	}

	clearSelectable(){
		this.viewport.find(".selectable").removeClass("selectable");
	}

	changeHighlight(cell) {

		const container = this.container;
		const cellIndex = cell.index() - 1;
		const rowIndex = cell.parent().index();

		this.resetSelection();

		const rowStart = Math.min(rowIndex, this.virtualSelection.Start.RowIndex);
		const rowEnd = Math.max(rowIndex, this.virtualSelection.Start.RowIndex);
		const cellStart = Math.min(cellIndex, this.virtualSelection.Start.ColumnIndex);
		const cellEnd = Math.max(cellIndex, this.virtualSelection.Start.ColumnIndex);

		for (let i = rowStart; i <= rowEnd; i++) {

			const row = container.find(".gtbl-detail").eq(i);

			const rowCells = row.find(".gtbl-value-cell");

			this.rowHeaderCells[i].addClass("row-highlight");

			for (let j = cellStart; j <= cellEnd; j++) {

				rowCells.eq(j).addClass("highlight");

				this.columnHeaderCells[j].addClass("row-highlight");
			}
		}

		this.updateSelection(this.current.Cell.RowIndex, rowIndex + this.startNode, cellStart, cellEnd);
	}

	scrollHorizontally(target, padding){

		let paddingValue = 0;

		const position = target.position();
		const scrollLeft = this.rootElement.scrollLeft();

		if(this.lastPostion.X == position.left){
			return;
		}

		this.lastPostion.X = position.left;

		if(scrollLeft + position.left - this.columnWidths[0] <= 0){
			return;
		}

		if(this.rootElement[0].scrollWidth == target.outerWidth(true) + position.left){
			this.alterScrollPosition(null, this.rootElement[0].scrollWidth);
			return;
		}

		if(position.left - target.prev().outerWidth(true) == 0){
			this.alterScrollPosition(null, 0);
			return;
		}

		if(scrollLeft >= position.left){
			if(padding){
				paddingValue = this.columnWidths[this.last.Cell.ColumnIndex]
			}
			this.alterScrollPosition(null, position.left - this.columnWidths[0] - paddingValue);
			return;
		}

		if(scrollLeft + this.rootElement.outerWidth(true) <= position.left + target.outerWidth(true) + this.barHeight){
			const by = ((position.left + target.outerWidth(true)) + this.barHeight) - (scrollLeft + this.rootElement.outerWidth(true));
			if(padding){
				paddingValue = this.columnWidths[this.last.Cell.ColumnIndex + 1]
			}
			this.alterScrollPosition(null, scrollLeft + by + paddingValue);
			return;
		}

	}

	scrollVertically(target, padding){

		let paddingValue = 0;

		const targetCellNode = this.toCellNode(target);
		const positionTop = this.childPositions[targetCellNode.Cell.RowIndex]
		const scrollTop = this.rootElement.scrollTop();

		if(this.lastPostion.Y == positionTop){
			return;
		}

		this.lastPostion.Y = positionTop;

		if(scrollTop + positionTop <= 0){
			return;
		}

		if(this.rootElement[0].scrollHeight == target.outerHeight(true) + positionTop){
			this.alterScrollPosition(this.rootElement[0].scrollHeight);
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

		if(scrollTop + this.visibleViewportHeight <= positionTop + this.getChildHeight(targetCellNode.Cell.RowIndex)){

			const by = (positionTop + this.getChildHeight(targetCellNode.Cell.RowIndex)) - (scrollTop + this.visibleViewportHeight)

			if(padding){
				paddingValue = this.getChildHeight(this.last.Cell.RowIndex + 1);
			}

			this.alterScrollPosition(scrollTop + by + paddingValue);

			return;
		}


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

		const container = this.container
		const rowStart = Math.min(this.virtualSelection.End.RowIndex, this.virtualSelection.Start.RowIndex);
		const rowEnd = Math.max(this.virtualSelection.End.RowIndex, this.virtualSelection.Start.RowIndex);
		const cellStart = Math.min(this.virtualSelection.End.ColumnIndex, this.virtualSelection.Start.ColumnIndex);
		const cellEnd = Math.max(this.virtualSelection.End.ColumnIndex, this.virtualSelection.Start.ColumnIndex);

		if(this.currentSelectionMode == this.SelectionMode.All){
			this.cornerCell.addClass("row-highlight");
		}

		if(this.currentSelectionMode == this.SelectionMode.Row){
			this.columnHeaderCells.forEach(cell => cell.addClass("row-highlight"));
		}

		for (let i = rowStart; i <= rowEnd; i++) {

			const row = container.find(".gtbl-detail").eq(i);

			const rowCells = row.find(".gtbl-value-cell");

			this.rowHeaderCells[i].addClass("row-highlight");

			for (let j = cellStart; j <= cellEnd; j++) {

				rowCells.eq(j).addClass("highlight");

				if(this.currentSelectionMode != this.SelectionMode.Row){
					this.columnHeaderCells[j].addClass("row-highlight");
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

		this.cornerCell.addClass("row-highlight");

		Array.from(this.visibleNodes).forEach(node => {
			Array.from(node.children()).forEach((cell, index) => {
				if(index > 0){
					this.highlightSelection($(cell));
				}
			});
		})

		this.updateSelection(0, this.rows.length - 1, 0, this.header.length - 1);
	}

	selectRow(rowHeaderCell){

		this.currentSelectionMode = this.SelectionMode.Row

		const selectedRowIndex = parseInt(rowHeaderCell.innerHTML) - 1;

		this.markCurrent($(rowHeaderCell).next(), true);
		this.last = this.toCellNode($(rowHeaderCell).parent().children().eq(this.header.length));

		this.columnHeaderCells.forEach(cell => cell.addClass("row-highlight"));

		rowHeaderCell.parentNode.childNodes.forEach((cell, index) => {
			if(index > 0){
				$(cell).addClass("highlight");
			}else{
				$(cell).addClass("row-highlight");
			}
		});

		this.updateSelection(selectedRowIndex, selectedRowIndex, 0, this.header.length - 1);
		this.setFocus();
	}

	selectColumn(columnCell){

		this.currentSelectionMode = this.SelectionMode.Column

		const cell = $(columnCell);
		const columnIndex = cell.index();

		this.markCurrent(this.visibleNodes[0].children().eq(columnIndex), true);
		this.current.Cell.RowIndex = 0;
		this.last = this.toCellNode(this.visibleNodes[this.visibleNodes.length - 1].children().eq(columnIndex));

		cell.addClass("row-highlight");
		this.visibleNodes.forEach((row, index) => {
			this.rowHeaderCells[index].addClass("row-highlight");
			row.children().eq(columnIndex).addClass("highlight");
		});

		this.virtualSelection.Start.ColumnIndex = columnIndex - 1;
		this.virtualSelection.End.ColumnIndex = columnIndex - 1;

		this.updateSelection(0, this.rows.length - 1, columnIndex - 1, columnIndex - 1);
		this.setFocus();
	}

	highlightSelection(selectedCell){
		selectedCell.addClass("highlight");
		this.rowHeaderCells[selectedCell.parent().index()].addClass("row-highlight");
		this.columnHeaderCells.forEach(cell => cell.addClass("row-highlight"));
	}

	clearSelection(){
		this.cornerCell.removeClass("row-highlight");
		this.viewport.find(".highlight").removeClass("highlight");
		this.rowHeaderCells.forEach(cell => cell.removeClass("row-highlight"));
		this.columnHeaderCells.forEach(cell => cell.removeClass("row-highlight"));
	}

	toCellNode(cell){
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
		this.selection = new Selection();
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

		const dataArray = [];

		for(let row = this.selection.Start.RowIndex; row <= this.selection.End.RowIndex; row++){
			dataArray.push(
				this.rows[row].slice(this.selection.Start.ColumnIndex, this.selection.End.ColumnIndex + 1)
								.map(item => escapeNewLine(item)).join("\t")
			);
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

	// =================================
	//  Event handlers
	// ---------------------------------

	onRootScroll(e){

		if (this.animationFrame) {
			window.cancelAnimationFrame(this.animationFrame);
		}

		this.animationFrame = window.requestAnimationFrame(() => this.doVirtualScroll(e));
	}

	onDocumentMouseDown(e) {
		this.isDragging = false;
		this.clearSelectable();
		this.resetInterval();
	}

	onDocumentMouseUp(e) {
		this.isDragging = false;
		this.resetInterval();
	}

	onDocumentMouseMove(e){

		const getDelta = (e) => {

			const rect = this.rootElement[0].getBoundingClientRect();

			if(e.clientX < rect.left){
				return this.Delta.Left;
			}

			if(e.clientX > this.rootElement.width()){
				return this.Delta.Right;
			}

			if(e.clientY < rect.top){
				return this.Delta.Up;
			}

			if(e.clientY > rect.top){
				return this.Delta.Down;
			}

			return null;

		}

		if(!this.hasFocus() || !this.isDragging){
			return true;
		}

		if(e.target.classList.contains("gtbl-value-cell") || e.target.classList.contains("gtbl-header-cell")){
			this.resetInterval();
			return true;
		}

		this.resetInterval();

		this.scrollInterval = window.setInterval(this.keepScroll.bind(this), 50, getDelta(e.originalEvent));
	}

	keepScroll(direction){

		const getNextCell = (direction) => {

			const row = this.last.Cell.RowIndex;
			const col = this.last.Cell.ColumnIndex;

			switch(direction){
				case this.Delta.Up:
					if(row > 0){
						return this.last.Node.parent().prev().children().eq(this.last.Node.index());
					}else{
						return null;
					}
				case this.Delta.Down:
					if(row < this.rows.length - 1){
						return this.last.Node.parent().next().children().eq(this.last.Node.index());
					}else{
						return null;
					}
				case this.Delta.Left:
					if(col > 0){
						return this.last.Node.prev();
					}else{
						return null;
					}
				case this.Delta.Right:
					if(col < this.header.length - 1){
						return this.last.Node.next();
					}else{
						return null;
					}
			}
		}

		const scrollToNextCell = (direction) => {

			const nextCellNode = this.toCellNode(this.nextCell);
			let position;

			if(!nextCellNode.Node[0]){
				switch(direction){
					case this.Delta.Up:
						position = this.childPositions[this.startNode - 1];
						break;
					case this.Delta.Down:
						position = this.childPositions[this.endNode + 1];
						break;
				}

				this.alterScrollPosition(position);
				this.nextCell = null;

				return true;
			}

			return this.scrollRequired(nextCellNode);
		}

		this.nextCell = getNextCell(direction);

		if(this.nextCell){

			if(scrollToNextCell(direction)){
				this.preferredDirection = direction;
				this.scrollCallback = this.triggerCellMouseOver;
			}else{
				this.triggerCellMouseOver();
			}

		}else{
			this.resetInterval();
		}

	}

	triggerCellMouseOver(){

		if(!this.nextCell){

			switch(this.preferredDirection){
				case this.Delta.Up:
					this.nextCell = this.visibleNodes[0].children().eq(this.last.Node.index());
					break;
				case this.Delta.Down:
					this.nextCell = this.visibleNodes[this.visibleNodes.length - 1].children().eq(this.last.Node.index());
					break;
			}
		}

		this.nextCell.trigger('mouseover');
		this.nextCell = null;
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


	onDocumentCopy(e){
		if(this.hasFocus()){
			this.copyToClipboard(e);
		}
	}

	onCornerCellClick(e){
		this.setFocus();
		this.selectAll();
	}

	onFocusHolderKeyUp(e){
		if(this.shiftKey && e.keyCode == 16){
			this.isDragging = false;
		}
	}

	onFocusHolderKeyDown(e){

		if(!this.hasFocus()) return true;

		// Ctrl + A
		if (e.ctrlKey && e.key === "a" && this.current) {
			this.selectAll();
			return false;
		}

		if(e.ctrlKey){
			switch(e.keyCode){
				// Ctrl + End
				case 35:
					this.moveCellByCtrlArrowKey(this.Delta.End, e.shiftKey);
					return false;
				// Ctrl + Home
				case 36:
					this.moveCellByCtrlArrowKey(this.Delta.Home, e.shiftKey);
					return false;
				// Ctrl + Left
				case 37:
					this.moveCellByCtrlArrowKey(this.Delta.Left, e.shiftKey);
					return false;
				// Ctrl + Right
				case 39:
					this.moveCellByCtrlArrowKey(this.Delta.Right, e.shiftKey);
					return false;
				// Ctrl + Up
				case 38:
					this.moveCellByCtrlArrowKey(this.Delta.Up, e.shiftKey);
					return false;
				// Ctrl + Down
				case 40:
					this.moveCellByCtrlArrowKey(this.Delta.Down, e.shiftKey);
					return false;
			}
		}

		switch (e.keyCode) {
			// Ctrl + End
			case 35:
				this.moveCellByArrowKey(this.Delta.End);
				return false;
			// Ctrl + Home
			case 36:
				this.moveCellByArrowKey(this.Delta.Home);
				return false;
			// Left
			case 37:
				this.moveCellByArrowKey(this.Delta.Left, e.shiftKey);
				return false;
			// Right
			case 39:
				this.moveCellByArrowKey(this.Delta.Right, e.shiftKey);
				return false;
			// Up
			case 38:
				this.moveCellByArrowKey(this.Delta.Up, e.shiftKey);
				return false;
			// Down
			case 40:
				this.moveCellByArrowKey(this.Delta.Down, e.shiftKey);
				return false;
		}

	}

	onCellDblClick(e){
		this.currentSelectionMode = this.SelectionMode.ContentSelectable;
		this.markCurrentCellAsSelectable();
	}

	onCellMouseUp(e) {
		this.isDragging = false;
	}

	onCellMouseDown(e) {

		this.setFocus();

		const cell = $(e.target);

		if(cell.hasClass("selectable")){
			e.stopPropagation();
			return true;
		}

		this.clearSelectable();

		this.isDragging = true;
		this.bypassHighlightByScroll = false;
		this.currentSelectionMode = this.SelectionMode.Cell

		if(e.shiftKey){
			this.selectByShift(cell);
		}else{
			this.selectByMouseDown(cell);
		}

		return false;
	}

	onCellMouseOver(e) {

		if (!this.isDragging) return;

		const cell = $(e.target);

		this.clearSelection();

		this.last = this.toCellNode(cell);

		if(this.current.Cell.equals(this.last.Cell)){
			this.rowHeaderCells[cell.parent().index()].addClass("row-highlight");
			this.columnHeaderCells[cell.index() - 1].addClass("row-highlight");
			return;
		}

		this.changeHighlight(cell);

		this.scrollHorizontally(cell, true);
		this.scrollVertically(cell, true);
	}

	onRowHeaderCellClick(e){
		this.selectRow(e.target);
	}

	onColumnHeaderCellClick(e){
		this.selectColumn(e.target);
	}

	onColumnHeaderCellDblClick(e){
		e.stopPropagation();
		this.selectColumn(e.target.parentNode);
		this.sort($(e.target).parent().index() - 1);
	}

	// ---------------------------------

	filter(columnIndex, value){
		if(columnIndex == 0){
			return;
		}

		if(this.filtered){
			return;
		}

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
		if(!this.filtered){
			return;
		}

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
			content = [this.header].concat(this.rows).map(row => row.map(cell => escapeCsv(cell)).join(delimitter)).join("\n");
		}else{
			content = this.rows.map(row => row.map(cell => escapeCsv(cell)).join(delimitter)).join("\n");
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
		this.rootElement.append(link);
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

		const getRowDataAt = (index) => {
			return [index + 1].concat(this.rows[index]);
		}

		const addRow = (index) => {
			const newItem = this.createRow(index);
			this.visibleNodes.push(newItem);
			this.viewport.append(newItem);
		}

		const changeRowValue = (rowArray, arrayIndex) => {

			if(arrayIndex > this.visibleNodes.length - 1){
				addRow(arrayIndex);
			}

			const rowIndex = arrayIndex + this.startNode;

			rowArray.forEach((value, index) => {

				const node = this.visibleNodes[arrayIndex][0].childNodes[index];
				node.innerHTML = value;

			});
		}

		this.sizeBase = Util.getSizeBase(this.header, this.rows, this.rootElement.css("font"));
		this.prepareVirtualScroll(this.rootElement.scrollTop(), this.rootElement.scrollLeft(), true);
		//this.viewport.empty();
		//this.visibleNodes = this.getVisibleChildNodes();
		//this.viewport.append(this.visibleNodes);
		//this.visibleNodes = this.getVisibleChildNodes();
		this.alterTransform();
		this.updateVirtualSelection();
		new Array(this.visibleNodesCount)
			.fill(null)
			.map((_, index) => getRowDataAt(index + this.startNode))
			.forEach((row, rowIndex) => changeRowValue(row, rowIndex));
			/*
			this.prepareVirtualScroll(0, 0, true)
			this.container.css("height", this.totalContentHeight);

			this.alterTransform();

			this.viewport.empty();
			this.visibleNodes = this.getVisibleChildNodes();
			this.viewport.append(this.visibleNodes);
			this.rootElement.scrollTop(0);
			this.rootElement.scrollLeft(0);
			*/
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

class Util{

	static toStringNullSafe(value){

		if(value == null){
			return "";
		}

		return value.toString();

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

	static reduceRowHeights(a, b){
		const len = this.toStringNullSafe(b).split("\n").length;
		return len > a ? len : a;
	}

	static getSizeBase(header, rows, font){

		const heightBases = rows.map(item => {
			return item.reduce(this.reduceRowHeights.bind(this), 1);
		});
		const _numberColumnWidth = this.getStringWidth(rows.length, false, font);
		const _maxLengthValues = this.reduceString([header].concat(rows));

		return {
			widths: [_numberColumnWidth].concat(_maxLengthValues.map(item => this.getStringWidth(item, true, font))),
			heights: heightBases
		};
	}
}