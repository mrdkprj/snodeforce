"use strict";
class GridTable {

	constructor(rootElement, params) {

		this.rootNode = rootElement;
		this.rootElement = $(rootElement);
		this.rootHeight = 500;

		this.rows = params.rows;
		this.header = params.header;
		this._rows = null;
		this.history = new EditHistory(this.rows);
		if(Array.isArray(params.readOnly)){
			this.readOnly = false;
			this.readOnlyColumns = new Set(params.readOnly);
		}else{
			this.readOnly = params.readOnly;
			this.readOnlyColumns = new Set();
		}

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

		this.rootElement.empty();
		this.calculator = document.createElement("div");
		this.calculator.classList.add("calc");
		this.rootNode.appendChild(this.calculator)
		this.sizeBase = Util.getSizeBase(this.header, this.rows, this.rootElement.css("font"), this.calculator, this.baseRowHeight);
		this.columnWidths = this.sizeBase.widths;

		this.lastPostion = {X:0,Y:0};
		this.scrollCallback = null;
		this.filtered = false;
		this.isDragging = false;
		this.isResizing = false;

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

		this.animationFrame = null;
		this.resizeAnimationFrame = null;
		this.scrollInterval = null;

		this.Direction = {
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

		this.ResizeMode = {
			None:0,
			Column: 1,
			Row:2,
		}

		this.sortMap = {0: "asc"};

		this.currentSelectionMode = this.SelectionMode.Cell;
		this.currentResizeMode = this.ResizeMode.None;

		this.rootElement.css({height:this.rootHeight, overflow:"auto", position:"relative"});

		$(document).on("mousedown", this.onDocumentMouseDown.bind(this));
		$(document).on("mouseup", this.onDocumentMouseUp.bind(this));
		$(document).on("copy" , this.onDocumentCopy.bind(this));
		$(document).on("mousemove", this.onDocumentMouseMove.bind(this));
		this.rootElement.on("scroll", this.onRootScroll.bind(this));

		this.prepareVirtualScroll(this.rootElement.scrollTop(), this.rootElement.scrollLeft(), true);
		this.createGridTable();

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
		return this.sizeBase.heights[index];
	}

	createGridTable(){

		const getContainer = () => {
			return $("<div>", { class: "gtbl-container", css: { height: this.totalContentHeight } });
		}

		const getCornerCell = () => {
			const cornerCell = $("<div>", { class: "gtbl-header-cell gtbl-corner-cell stick" });
			cornerCell.css("width", this.columnWidths[0]);
			cornerCell.on("click", this.onCornerCellClick.bind(this));
			return cornerCell;
		}

		const getColumnHeader = () => {

			const columnHeader = $("<div>", { class: "gtbl-row gtbl-row-header gtbl-hidden-row-header" });

			this.cornerCell = getCornerCell();
			columnHeader.append(this.cornerCell);

			this.header.forEach((item, index) => {
				const header = $("<div>", { class: "gtbl-header-cell gtbl-col-header-cell stick"});
				header.css("width", this.columnWidths[index + 1]);
				header.on("click", this.onColumnHeaderCellClick.bind(this));

				const link = $("<a>", { class: "sort-link", text: item });
				link.on("click", this.onColumnHeaderCellDblClick.bind(this));
				header.append(link);

				const slidebar = $("<div>", { class: "col-slidebar" });
				slidebar.on("mousedown", this.onSlidebarMousedown.bind(this));
				header.append(slidebar);

				this.columnHeaderCells.push(header);
				columnHeader.append(header);
			});

			return columnHeader;
		}

		const getViewport = () => {
			return $("<div>", { class: "gtbl gtbl-grid", css:{ transform: "translateY(0px)" } });
		}

		const getFocusHolder = () => {
			const focusHolder = $("<input>", { class:"focus-holder", type:"text", value:"" });
			focusHolder.on("keydown", this.onFocusHolderKeydown.bind(this));
			focusHolder.on("keypress", this.onFocusHolderKeypress.bind(this));
			focusHolder.on("keyup", this.onFocusHolderKeyUp.bind(this));
			focusHolder.on("paste", this.onFocusHolderpaste.bind(this));
			return focusHolder;
		}

		const getInputHolder = () => {
			this.editor = $("<textarea>", { class:"cell-editor", spellcheck: false });
			this.editor.blur(this.onEditorBlur.bind(this));
			this.editor.on("keydown", this.onEditorKeydown.bind(this));
			this.editor.on("keypress", this.onEditorKeypress.bind(this));
			this.editor.on("paste", this.onEditorPaste.bind(this))

			const inputHolder = $("<div>", {class:"input-holder"});
			inputHolder.append(this.editor);
			return inputHolder;
		}

		const getCloneHeader = () => {
			const cloneHeader = $("<div>", { class:"clone-header", css:{ width: parseInt(this.columnWidths[0]) } });
			cloneHeader.on("mousedown", this.onCloneHeaderClick.bind(this));
			return cloneHeader;
		}

		this.rootElement.append(getColumnHeader());
		this.container = getContainer();
		this.rootElement.append(this.container);

		this.viewport = getViewport();
		this.container.append(this.viewport);

		this.visibleNodes = this.getVisibleChildNodes();
		this.viewport.append(this.visibleNodes);

		this.focusHolder = getFocusHolder();
		this.rootElement.append(this.focusHolder);

		this.inputHolder = getInputHolder();
		this.rootElement.append(this.inputHolder);

		this.cloneHeader = getCloneHeader();
		this.rootElement.append(this.cloneHeader);

	}

	createRow(rowIndex){

		const rowData = this.rows[rowIndex];

		const isFirstRow = rowIndex == 0;

		const rowDiv = $("<div>", { class: "gtbl-row gtbl-detail" });

		const rowHeaderCell = $("<div>", { class: "gtbl-header-cell gtbl-row-header-cell", css:{ transform: "translateX(0px)", height: this.getChildHeight(rowIndex) } });
		rowHeaderCell.on("click", this.onRowHeaderCellClick.bind(this));

		const rowNumber = $("<span>", {class: "row-number", text: rowIndex + 1});
		rowHeaderCell.append(rowNumber);

		const slidebar = $("<div>", {class:"row-slidebar"});
		slidebar.on("mousedown", this.onRowSlidebarMousedown.bind(this));
		rowHeaderCell.append(slidebar);

		if(isFirstRow){
			rowHeaderCell.css("width", this.columnWidths[0]);
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
				cell.css("width",this.columnWidths[cellIndex + 1]);
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
			const newRow = this.createRow(index);
			this.visibleNodes.push(newRow);
			this.viewport.append(newRow);
		}

		const changeRowValue = (rowArray, arrayIndex) => {

			if(arrayIndex > this.visibleNodes.length - 1){
				addRow(arrayIndex);
			}

			const rowIndex = arrayIndex + this.startNode;

			rowArray.forEach((value, index) => {

				const node = this.visibleNodes[arrayIndex][0].childNodes[index];
				if(index == 0){
					node.style.height = this.getChildHeight(rowIndex) + "px"
 					node.childNodes[0].innerHTML = Util.toStringNullSafe(value);
				}else{
					node.innerHTML = Util.toStringNullSafe(value);
				}

				// Update current cell
				if(shouldMarkAsCurrent(rowIndex, index)){
					this.markCurrent($(node), true);
					if(this.currentSelectionMode == this.SelectionMode.ContentSelectable){
						this.markCurrentCellAsSelectable();
					}

					if(this.isEditing){
						this.prepareEditor();
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
			this.clearCurrent();
			this.clearSelectable();
		}

		if(this.isEditing){
			this.initEditor();
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
			this.scrollCallback.action(this.scrollCallback.args)
			this.scrollCallback = null;
		}
	}

	alterTransform(){
		this.viewport.css("transform","translateY(" + this.nodeOffsetY + "px)");
		this.rowHeaderCells.forEach(cell => cell.css("transform","translateX(" + this.nodeOffsetX + "px)"));
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
		this.shiftKey = withShiftkey;

		let anchor;
		if(withShiftkey){
			anchor = this.last;
		}else{
			anchor = this.current;
		}

		const scrollTop = this.rootElement.scrollTop();
		const scrollLeft = this.rootElement.scrollLeft();

		switch(direction){
			case this.Direction.End:
				this.alterScrollPosition(this.rootNode.scrollHeight, this.rootNode.scrollWidth);
				break;
			case this.Direction.Home:
				this.alterScrollPosition(0,0);
				break;
			case this.Direction.Left:
				this.alterScrollPosition(null, 0);
				break;
			case this.Direction.Right:
				this.alterScrollPosition(null, this.rootNode.scrollWidth);
				break;
			case this.Direction.Up:
				this.alterScrollPosition(0);
				break;
			case this.Direction.Down:
				this.alterScrollPosition(this.rootNode.scrollHeight);
				break;
		}

		if(scrollTop != this.rootElement.scrollTop() || scrollLeft != this.rootElement.scrollLeft()){
			this.scrollCallback = this.createCallback(this.changeCellByCtrlArrowKey, {anchor, direction});
		}else{
			this.changeCellByCtrlArrowKey({anchor, direction});
		}
	}

	changeCellByCtrlArrowKey(args){

		let row, cell;

		switch(args.direction){
			case this.Direction.End:
				row = this.visibleNodes[this.visibleNodes.length - 2].get(0);
				cell = row.children[row.children.length - 1]
				break;
			case this.Direction.Home:
				row = this.visibleNodes[0].get(0);
				cell = row.children[1];
				break;
			case this.Direction.Left:
				row = this.visibleNodes[args.anchor.Node.parent().index()].get(0);
				cell = row.children[1];
				break;
			case this.Direction.Right:
				row = this.visibleNodes[args.anchor.Node.parent().index()].get(0);
				cell = row.children[row.children.length - 1]
				break;
			case this.Direction.Up:
				row = this.visibleNodes[0].get(0);
				cell = row.children[args.anchor.Node.index()];
				break;
			case this.Direction.Down:
				row = this.visibleNodes[this.visibleNodes.length - 2].get(0);
				cell = row.children[args.anchor.Node.index()];
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
		this.shiftKey = withShiftkey;

		const moveCellAllowed = (direction, cellNode) => {

			switch(direction){
				case this.Direction.Left:
					if(cellNode.Cell.ColumnIndex  <= 0){
						return false;
					}
					break;
				case this.Direction.Right:
					if(cellNode.Cell.ColumnIndex == this.header.length - 1){
						return false;
					}
					break;
				case this.Direction.Up:
					if(cellNode.Cell.RowIndex  == 0){
						return false;
					}
					break;
				case this.Direction.Down:
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
			case this.Direction.Home:
				cell = anchor.Node.parent().children().eq(1);
				break;
			case this.Direction.End:
				cell = anchor.Node.parent().children().eq(this.header.length);
				break;
			case this.Direction.Left:
				cell = anchor.Node.prev();
				break;
			case this.Direction.Right:
				cell = anchor.Node.next();
				break;
			case this.Direction.Up:
				cell = anchor.Node.parent().prev().children().eq(anchor.Node.index());
				break;
			case this.Direction.Down:
				cell = anchor.Node.parent().next().children().eq(anchor.Node.index());
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
		const positionTop = this.childPositions[cellNode.Cell.RowIndex];
		const positionLeft = cellNode.Node.position().left;
		const scrollTop = this.rootElement.scrollTop();
		const scrollLet = this.rootElement.scrollLeft();

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
		if(this.rootElement.outerWidth(true) + scrollLet < positionLeft){
			const position = positionLeft - (this.rootElement.outerWidth(true) + scrollLet);
			const barWidth = this.rootElement.width() - this.rootNode.clientWidth;
			scrollPositionLeft = positionLeft - position + barWidth;
			scrollRequired = true;
		}

		if(scrollRequired){
			this.alterScrollPosition(scrollPositionTop, scrollPositionLeft);
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
			this.clearCurrent();
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

	clearCurrent(){
		this.current.Node.removeClass("current");
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

		if(this.rootNode.scrollWidth == target.outerWidth(true) + position.left){
			this.alterScrollPosition(null, this.rootNode.scrollWidth);
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

		if(scrollLeft + this.rootElement.outerWidth(true) <= position.left + target.outerWidth(true) + this.getScrollbarHeight()){
			const scrollby = ((position.left + target.outerWidth(true)) + this.getScrollbarHeight()) - (scrollLeft + this.rootElement.outerWidth(true));
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
		const scrollTop = this.rootElement.scrollTop();

		if(this.lastPostion.Y == positionTop){
			return;
		}

		this.lastPostion.Y = positionTop;

		if(scrollTop + positionTop <= 0){
			return;
		}

		if(this.rootNode.scrollHeight == target.outerHeight(true) + positionTop){
			this.alterScrollPosition(this.rootNode.scrollHeight);
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
		return this.rootHeight - this.rootNode.clientHeight;
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
			this.cornerCell.addClass("row-highlight");
		}

		if(this.currentSelectionMode == this.SelectionMode.Row){
			this.columnHeaderCells.forEach(cell => cell.addClass("row-highlight"));
		}

		for (let i = rowStart; i <= rowEnd; i++) {

			const row = this.container.find(".gtbl-detail").eq(i);

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

		this.visibleNodes.forEach(node => {
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

	onSlidebarMousedown(e){
		this.isResizing = true;
		this.currentResizeMode = this.ResizeMode.Column;
		this.resizeFrame = this.resizeColumn;
		this.lastSliderPosition = e.pageX;
		this.resizingCell = this.toCellNode($(e.target).parent());
		this.resizingCell.Node.addClass("noselect");
		this.rootElement.css("cursor", "col-resize");
		this.firstRowCell = this.visibleNodes[0].children().eq(this.resizingCell.Node.index());
	}

	resizeColumn(e){
		const diff = e.pageX - this.lastSliderPosition;
		this.lastSliderPosition = e.pageX;
		const currentWidth = this.resizingCell.Node.outerWidth();
		const newWidth = currentWidth + diff;
		if(newWidth > 2){
			this.resizingCell.Node.css("width", newWidth);
			this.firstRowCell.css("width", newWidth);
		}
		return false;
	}

	onRowSlidebarMousedown(e){
		this.isResizing = true;
		this.currentResizeMode = this.ResizeMode.Row;
		this.resizeFrame = this.resizeRow;
		this.lastSliderPosition = e.pageY;
		this.resizingCell = this.toCellNode($(e.target).parent())
		this.resizingCell.Node.addClass("noselect");
		this.rootElement.css("cursor", "row-resize");
	}

	resizeRow(e){
		const diff = e.pageY - this.lastSliderPosition;
		this.lastSliderPosition = e.pageY;
		const currentHeight = this.resizingCell.Node.outerHeight();
		const newHeight = currentHeight + diff;
		if(newHeight > 2){
			this.resizingCell.Node.css("height", newHeight);
		}
		return false;
	}

	moveSlidebar(e){
		if(!this.isResizing) return;

		if (this.resizeAnimationFrame) {
			window.cancelAnimationFrame(this.resizeAnimationFrame);
		}

		this.resizeAnimationFrame = window.requestAnimationFrame(() => this.resizeFrame(e));
	}

	onDocumentMouseDown(e) {
		this.isDragging = false;
		this.clearSelectable();
		this.resetInterval();
	}

	onDocumentMouseUp(e) {
		this.isDragging = false;
		this.resetInterval();

		if(this.currentResizeMode == this.ResizeMode.Row){
			this.sizeBase.heights[this.resizingCell.Cell.RowIndex] = this.resizingCell.Node.outerHeight();
			this.rowHeaderCells[this.resizingCell.Cell.RowIndex].css("height", this.resizingCell.Node.outerHeight())
			this.prepareVirtualScroll(this.rootElement.scrollTop(), this.rootElement.scrollLeft(), true)
			this.container.css("height", this.totalContentHeight);
			this.alterTransform();
		}

		if(this.isResizing){
			this.isResizing = false;
			this.currentResizeMode = this.ResizeMode.None;
			this.resizingCell.Node.removeClass("noselect");
			this.rootElement.css("cursor", "");
		}
	}

	onDocumentMouseMove(e){

		const getDirection = (e) => {

			const rect = this.rootNode.getBoundingClientRect();

			if(e.clientX < rect.left){
				return this.Direction.Left;
			}

			if(e.clientX > this.rootElement.width()){
				return this.Direction.Right;
			}

			if(e.clientY < rect.top){
				return this.Direction.Up;
			}

			if(e.clientY > rect.top){
				return this.Direction.Down;
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

		this.scrollInterval = window.setInterval(this.keepScroll.bind(this), 50, getDirection(e.originalEvent));
	}

	keepScroll(direction){

		const getNextCell = (direction) => {

			const row = this.last.Cell.RowIndex;
			const col = this.last.Cell.ColumnIndex;

			switch(direction){
				case this.Direction.Up:
					if(row > 0){
						return this.last.Node.parent().prev().children().eq(this.last.Node.index());
					}else{
						return null;
					}
				case this.Direction.Down:
					if(row < this.rows.length - 1){
						return this.last.Node.parent().next().children().eq(this.last.Node.index());
					}else{
						return null;
					}
				case this.Direction.Left:
					if(col > 0){
						return this.last.Node.prev();
					}else{
						return null;
					}
				case this.Direction.Right:
					if(col < this.header.length - 1){
						return this.last.Node.next();
					}else{
						return null;
					}
			}
		}

		const scrollToNextCell = (direction, nextCell) => {

			const nextCellNode = this.toCellNode(nextCell);
			let position;

			if(!nextCellNode.Node[0]){
				switch(direction){
					case this.Direction.Up:
						position = this.childPositions[this.startNode - 1];
						break;
					case this.Direction.Down:
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
				case this.Direction.Up:
					args.nextCell = this.visibleNodes[0].children().eq(this.last.Node.index());
					break;
				case this.Direction.Down:
					args.nextCell = this.visibleNodes[this.visibleNodes.length - 1].children().eq(this.last.Node.index());
					break;
			}
		}

		args.nextCell.trigger('mouseover');
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

	onCloneHeaderClick(e){
		if(this.isEditing){
			this.endEdit();
		}
		this.selectRow(this.rowHeaderCells[this.current.Node.parent().index()].get(0));
	}

	calculateEditorSize(value){

		const data = value.split("\n");
		const maxLengthValue = data.reduce((a,b) => Util.compareLength(a,b));
		let width = Util.getStringWidth(maxLengthValue, false, this.rootElement.css("font")) - 28;

		if(width <= this.current.Node.outerWidth(true)){
			width = this.current.Node.width(true);
		}

		let height = Util.measureHeight(this.calculator, value);
		if(height > this.sizeBase.heights[this.current.Cell.RowIndex]){
			this.sizeBase.heights[this.current.Cell.RowIndex] = height;
		}else{
			height = this.getChildHeight(this.current.Cell.RowIndex)
		}

		return {width, height}
	}

	onEditorKeydown(e){

		if(e.key == "Enter"){

			if(e.altKey || e.ctrlKey){
				const value = this.editor.val() + "\n";
				this.editor.val(value);
				const size = this.calculateEditorSize(value + "\n");
				this.editor.css("height", size.height);
			}else{
				this.endEdit();
				this.moveCellByArrowKey(this.Direction.Down, false);
			}

			return false;
		}

	}

	onEditorKeypress(e){
		const size = this.calculateEditorSize(this.editor.val() + e.key);
		this.editor.css("width",size.width);
		this.editor.css("height", size.height);
	}

	onFocusHolderpaste(e){
		const pastedData = this.getClipboardText(e);
		this.beginEdit(pastedData);
		const size = this.calculateEditorSize(this.editor.val());
		this.editor.css("width",size.width);
		this.editor.css("height",size.height);
		return false;
	}

	onEditorPaste(e){
		const pastedData = this.getClipboardText(e);
		const currentText = this.editor.val();
		const caretPosition = this.editor.prop("selectionStart");
		const newValue = currentText.slice(0, caretPosition) + pastedData + currentText.slice(caretPosition)
		this.editor.val(newValue);

		const size = this.calculateEditorSize(this.editor.val());
		this.editor.css("width",size.width);
		this.editor.css("height",size.height);
		return false;
	}

	getClipboardText(e){
		const clipboardData = e.originalEvent.clipboardData || window.clipboardData;
		return clipboardData.getData('Text');
	}

	onEditorBlur(e){
		if(this.isEditing){
			this.endEdit();
		}
	}

	beginEdit(value){
		if(this.readOnly) return;

		if(!this.current) return;

		if(this.readOnlyColumns.has(this.current.Cell.ColumnIndex)) return;

		this.isEditing = true;
		this.prepareEditor(value);
		this.history.begin(this.current, this.current.Node.html(), this.sizeBase.heights[this.current.Cell.RowIndex]);
		this.editor.focus();
	}

	prepareEditor(value){
		const position = { left:this.current.Node.position().left, top:this.childPositions[this.current.Cell.RowIndex] };

		this.inputHolder.css({
			position:"absolute",
			top: position.top + this.headerHeight,
			left: position.left,
		});

		const headerPosition = this.rowHeaderCells[this.current.Node.parent().index()].position();
		this.cloneHeader.css({
			position:"absolute",
			top: position.top + this.headerHeight,
			left: headerPosition.left,
			height: this.current.Node.height() + 1,
		});
		this.cloneHeader.html(this.current.Cell.RowIndex + 1)

		this.editor.css({
			width: this.current.Node.outerWidth(true),
			height: this.current.Node.height() + 1,
		})

		this.editor.val("");
		if(value){
			this.editor.val(value);
		}else{
			this.editor.val(this.current.Node.html());
		}
	}

	endEdit(){
		this.isEditing = false;
		this.current.Node.html(this.editor.val());
		this.history.end(this.editor.val(), this.sizeBase.heights[this.current.Cell.RowIndex]);
		this.initEditor();
		this.recalculateViewport();
		this.setFocus();
	}

	endUndoRedo(memento){
		this.sizeBase.heights[memento.CellNode.Cell.RowIndex] = memento.height;
		this.recalculateViewport();
	}

	initEditor(){
		this.editor.css({width:0,height:0})
		this.inputHolder.css({position:"fixed", top: -100, left: -100});
		this.cloneHeader.css({position:"fixed", top: -100, left: -100});
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

	recalculateViewport(){
		this.prepareVirtualScroll(this.rootElement.scrollTop(), this.rootElement.scrollLeft(), true)
		this.container.css("height", this.totalContentHeight);
		this.alterTransform();
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
			this.selectAll();
			return false;
		}

		if(e.ctrlKey && e.key === "z"){
			this.undoEdit();
			return false;
		}

		if(e.ctrlKey && e.key === "y"){
			this.redoEdit();
			return false;
		}

		if(e.key == "Enter"){
			this.moveCellByArrowKey(this.Direction.Down, false);
			return false;
		}

		if(e.ctrlKey){
			switch(e.key){
				case "End":
					this.moveCellByCtrlArrowKey(this.Direction.End, e.shiftKey);
					return false;
				case "Home":
					this.moveCellByCtrlArrowKey(this.Direction.Home, e.shiftKey);
					return false;
				case "ArrowLeft":
					this.moveCellByCtrlArrowKey(this.Direction.Left, e.shiftKey);
					return false;
				case "ArrowRight":
					this.moveCellByCtrlArrowKey(this.Direction.Right, e.shiftKey);
					return false;
				case "ArrowUp":
					this.moveCellByCtrlArrowKey(this.Direction.Up, e.shiftKey);
					return false;
				case "ArrowDown":
					this.moveCellByCtrlArrowKey(this.Direction.Down, e.shiftKey);
					return false;
			}
		}

		switch (e.key) {
			case "End":
				this.moveCellByArrowKey(this.Direction.End);
				return false;
			case "Home":
				this.moveCellByArrowKey(this.Direction.Home);
				return false;
			case "ArrowLeft":
				this.moveCellByArrowKey(this.Direction.Left, e.shiftKey);
				return false;
			case "ArrowRight":
				this.moveCellByArrowKey(this.Direction.Right, e.shiftKey);
				return false;
			case "ArrowUp":
				this.moveCellByArrowKey(this.Direction.Up, e.shiftKey);
				return false;
			case "ArrowDown":
				this.moveCellByArrowKey(this.Direction.Down, e.shiftKey);
				return false;
		}

	}

	onFocusHolderKeypress(e){
		this.beginEdit(e.key);
		this.onEditorKeypress(e);
		return false;
	}

	onCellDblClick(e){
		if(this.readOnly || this.readOnlyColumns.has($(e.target).index() - 1)){
			this.currentSelectionMode = this.SelectionMode.ContentSelectable;
			this.markCurrentCellAsSelectable();
		}else{
			this.beginEdit();
		}
	}

	onCellMouseUp(e) {
		this.isDragging = false;
	}

	onCellMouseDown(e) {

		this.setFocus();

		this.mouseButton = e.button;

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

		if(this.mouseButton != 0) return;

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
		this.sort($(e.target).parent().index() - 1);
	}

	// ---------------------------------

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
			const newRow = this.createRow(index);
			this.visibleNodes.push(newRow);
			this.viewport.append(newRow);
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

		this.sizeBase = Util.getSizeBase(this.header, this.rows, this.rootElement.css("font"), this.calculator, this.baseRowHeight);
		this.prepareVirtualScroll(this.rootElement.scrollTop(), this.rootElement.scrollLeft(), true);
		this.alterTransform();
		this.updateVirtualSelection();
		new Array(this.visibleNodesCount)
			.fill(null)
			.map((_, index) => getRowDataAt(index + this.startNode))
			.forEach((row, rowIndex) => changeRowValue(row, rowIndex));
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
		undo.CellNode.Node.html(undo.value);
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
		redo.CellNode.Node.html(redo.value);
		return redo;
	}

	clear(){
		this._undoStack = [];
		this._redoStack = [];
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

	static measureHeight(sample, text){
		sample.innerHTML= text;
		const height = this.height(sample);
		sample.innerHTML = "";
		return height;
	}

	static reduceRowHeights(a, b){
		this.baseElement.innerHTML = b;
		const len = this.height(this.baseElement);
		this.baseElement.innerHTML = "";

		return len > a ? len : a;
	}

	static getSizeBase(header, rows, font, baseElement, baseHeight){

		this.baseElement = baseElement;

		const heightBases = rows.map(item => {
			return item.reduce(this.reduceRowHeights.bind(this), baseHeight);
		});

		const _numberColumnWidth = this.getStringWidth(rows.length, false, font);
		const _maxLengthValues = this.reduceString([header].concat(rows));

		return {
			widths: [_numberColumnWidth].concat(_maxLengthValues.map(item => this.getStringWidth(item, true, font))),
			heights: heightBases
		};
	}

	static height(element){
		const className = "height";
		if(element.style[className]){
			return parseInt(element.style[className].replace("px", ""))
		}else{
			return parseInt(window.getComputedStyle(element)[className].replace("px", ""));
		}
	}
}