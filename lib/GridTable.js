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

			this.animationFrame = null;
			this.rows = data.rows;
			this.header = data.header;
			this._rows = null;

			this.baseRowHeight = 22;
			this.itemCount = this.rows.length;
			this.totalContentHeight = 0;
			this.nodePadding = 1;
			this.childPositions = null;
			this.extraRowCount = 0;
			this.startNode = 0;
			this.visibleNodesCount = 0;
			this.nodeOffsetY = 0;
			this.nodeOffsetX = 0;
			this.headerHeight = 27;
			this.visibleViewportHeight = 0;
			this.barHeight = 0;

			this.sizeBase = Util.getSizeBase(this.header, this.rows, this.rootElement.css("font"));
			this.columnWidths = this.sizeBase.widths;

			this.lastPostion = {X:0,Y:0};
			this.scrollCallback = null;
			this.filtered = false;
			this.isDragging = false;
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
			this.preferredDirection = null;

			this.Delta = {
					Up:1,
					Down:2,
					Left:3,
					Right:4,
					Home:5,
					End:6
			};

			$(document).on("mousedown", this.onDocumentMouseDown.bind(this));
			$(document).on("mouseup", this.onDocumentMouseUp.bind(this));
			$(document).on("copy" , this.onDocumentCopy.bind(this));
			this.rootElement.on("scroll", this.onRootScroll.bind(this));

			this.initialize();
		}

		initialize(){
			this.rootElement.empty();
			this.rootElement.height(this.rootHeight + "px");
			this.rootElement.css("overflow","auto");

			this.prepareVirtualScroll(this.rootElement.scrollTop(), this.rootElement.scrollLeft(), true);
			this.createGridTable();
			this.barHeight = this.rootHeight - this.rootElement[0].clientHeight;
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

			const renderAhead = 1;

			if(reset){
				this.childPositions = getChildPositions(this.itemCount);
				this.totalContentHeight = this.childPositions[this.itemCount - 1] + this.getChildHeight(this.itemCount - 1) + 1;
			}

			const firstVisibleNode = findStartNode(scrollTop, this.childPositions, this.itemCount);

			this.startNode = Math.max(0, firstVisibleNode - renderAhead);

			const lastVisibleNode = findEndNode(this.childPositions, firstVisibleNode, this.itemCount, this.rootHeight);
			const endNode = Math.min(this.itemCount - 1, lastVisibleNode + renderAhead);

			this.visibleNodesCount = endNode - this.startNode + 1;

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

				const cornerCell = $("<div>", { class: "gtbl-header-cell gtbl-corner-cell stick"});
				cornerCell.width(this.columnWidths[0] + "px");
				cornerCell.css("min-width", this.columnWidths[0] + "px");
				cornerCell.on("click", this.onCornerCellClick.bind(this));
				columnHeader.append(cornerCell);

				this.header.forEach((item, index) => {
					const header = $("<div>", { class: "gtbl-header-cell gtbl-col-header-cell stick", text: item });
					header.width(this.columnWidths[index + 1] + "px");
					header.css("min-width", this.columnWidths[index + 1] + "px");
					columnHeader.append(header);
				});

				return columnHeader;
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
				const cell = $("<div>", { class: "gtbl-value-cell", text: cellvalue });
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

					if(shouldMarkAsCurrent(rowIndex, index)){
						this.markCurrent($(node), true);
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

			this.prepareVirtualScroll(e.target.scrollTop, e.target.scrollLeft);

			if(this.current){
				this.current.Node.removeClass("current");
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

		onCellDblClick(e){
			this.markCurrentCellAsSelectable();
		}

		onRootScroll(e){

			if (this.animationFrame) {
				window.cancelAnimationFrame(this.animationFrame);
			}

			this.animationFrame = window.requestAnimationFrame(() => this.doVirtualScroll(e));
		}

		onDocumentMouseDown(e) {
			this.isDragging = false;
		}

		onDocumentMouseUp(e) {
			this.isDragging = false;
		}

		onCornerCellClick(e){
			this.setFocus();
			this.selectAll();
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
						this.moveCurrentCellByCtrlArrowKey(this.Delta.End);
						return false;
					// Ctrl + Home
					case 36:
						this.moveCurrentCellByCtrlArrowKey(this.Delta.Home);
						return false;
					// Ctrl + Left
					case 37:
						this.moveCurrentCellByCtrlArrowKey(this.Delta.Left);
						return false;
					// Ctrl + Right
					case 39:
						this.moveCurrentCellByCtrlArrowKey(this.Delta.Right);
						return false;
					// Ctrl + Up
					case 38:
						this.moveCurrentCellByCtrlArrowKey(this.Delta.Up);
						return false;
					// Ctrl + Down
					case 40:
						this.moveCurrentCellByCtrlArrowKey(this.Delta.Down);
						return false;
				}
			}

			switch (e.keyCode) {
				// Left
				case 37:
					if(this.current.Cell.ColumnIndex  <= 0) return;

					this.moveCurrentCellByArrowKey(this.Delta.Left);
					return false;
				// Right
				case 39:
					if(this.current.Cell.ColumnIndex == this.header.length - 1) return;

					this.moveCurrentCellByArrowKey(this.Delta.Right);
					return false;
				// Up
				case 38:
					if(this.current.Cell.RowIndex  == 0) return;

					this.moveCurrentCellByArrowKey(this.Delta.Up);
					return false;
				// Down
				case 40:
					if(this.current.Cell.RowIndex + 1 == this.rows.length) return;

					this.moveCurrentCellByArrowKey(this.Delta.Down);
					return false;
			}

		}

		moveCurrentCellByCtrlArrowKey(direction){

			this.preventSelection = true;
			this.preferredDirection = direction;

			const scrollTop = this.rootElement.scrollTop();
			const scrollLeft = this.rootElement.scrollLeft();

			switch(direction){
				case this.Delta.End:
					this.rootElement.scrollTop(this.rootElement[0].scrollHeight);
					this.rootElement.scrollLeft(this.rootElement[0].scrollWidth);
					break;
				case this.Delta.Home:
					this.rootElement.scrollTop(0);
					this.rootElement.scrollLeft(0);
					break;
				case this.Delta.Left:
					this.rootElement.scrollLeft(0);
					break;
				case this.Delta.Right:
					this.rootElement.scrollLeft(this.rootElement[0].scrollWidth);
					break;
				case this.Delta.Up:
					this.rootElement.scrollTop(0);
					break;
				case this.Delta.Down:
					this.rootElement.scrollTop(this.rootElement[0].scrollHeight);
					break;
			}

			if(scrollTop != this.rootElement.scrollTop() || scrollLeft != this.rootElement.scrollLeft()){
				this.scrollCallback = this.changeCurrentByCtrlArrowKey;
			}else{
				this.changeCurrentByCtrlArrowKey();
			}
		}

		changeCurrentByCtrlArrowKey(){

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
					row = this.visibleNodes[this.current.Node.parent().index()];
					cell = row[0].children[1];
					break;
				case this.Delta.Right:
					row = this.visibleNodes[this.current.Node.parent().index()];
					cell = row[0].children[row[0].children.length - 1]
					break;
				case this.Delta.Up:
					row = this.visibleNodes[0];
					cell = row[0].children[this.current.Node.index()];
					break;
				case this.Delta.Down:
					row = this.visibleNodes[this.visibleNodes.length - 2];
					cell = row[0].children[this.current.Node.index()];
					break;
			}

			this.markCurrent($(cell));

		}

		moveCurrentCellByArrowKey(direction){

			this.preventSelection = true;
			this.preferredDirection = direction;

			if(this.shouldScrollToCurrent()){
				this.scrollCallback = this.changeCurrentByArrowKey;
			}else{
				this.changeCurrentByArrowKey();
			}
		}

		changeCurrentByArrowKey(){

			let cell;

			switch(this.preferredDirection){
				case this.Delta.Left:
					cell = this.current.Node.prev();;
					break;
				case this.Delta.Right:
					cell = this.current.Node.next();
					break;
				case this.Delta.Up:
					cell = this.current.Node.parent().prev().children().eq(this.current.Node.index());
					break;
				case this.Delta.Down:
					cell = this.current.Node.parent().next().children().eq(this.current.Node.index());
					break;
			}

			this.markCurrent(cell);
		}

		shouldScrollToCurrent(){

			// hidden below
			if(this.current.Cell.RowIndex > this.startNode + this.visibleNodesCount){
				const position = this.baseRowHeight * (this.current.Cell.RowIndex - (this.visibleNodesCount - 3));
				this.rootElement.scrollTop(this.rootElement.scrollTop() + position);
				return true;
			}

			// hidden above
			if(this.current.Cell.RowIndex < this.startNode){
				const position = this.baseRowHeight * this.current.Cell.RowIndex;
				this.rootElement.scrollTop(position);
				return true;
			}

			return false;
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
		}

		onCellMouseDown(e) {

			this.setFocus();

			const cell = $(e.target);

			if(cell.hasClass("selectable")){
				return true;
			}else{
				this.clearSelectable();
			}

			this.isDragging = true;
			this.isAllSelected = false;
			this.preventSelection = false;

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
			this.updateVirtualSelection(this.current);
		}

		selectByShift(cell){
			this.clearSelection();
			this.last = this.getCellNode(cell);
			this.updateVirtualSelection(this.last);
			this.updateSelection(this.current.Cell.RowIndex, this.last.Cell.RowIndex, this.current.Cell.ColumnIndex, this.last.Cell.ColumnIndex);
			this.changeHighlight(cell);
		}

		markCurrent(cell, preventScroll){

			this.clearSelection();

			if(this.current){
				this.current.Node.removeClass("current");
			}

			this.current = this.getCellNode(cell);

			this.current.Node.addClass("current");
			this.rowHeaderCells[cell.parent().index()].addClass("row-highlight");

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

		onCellMouseOver(e) {

			if (!this.isDragging) return;

			const cell = $(e.target);

			this.clearSelection();

			this.last = this.getCellNode(cell);

			if(this.current.Cell.equals(this.last.Cell)){
				this.rowHeaderCells[cell.parent().index()].addClass("row-highlight");
				return;
			}

			this.changeHighlight(cell);

			this.scrollHorizontally(cell, true);
			this.scrollVertically(cell, true);
		}

		changeHighlight(cell) {

			const container = this.container;
			const cellIndex = cell.index() - 1;
			const rowIndex = cell.parent().index();

			this.selection = new Selection();

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
				}
			}

			this.updateSelection(this.current.Cell.RowIndex, rowIndex + this.startNode, cellStart, cellEnd);
		}

		scrollHorizontally(target, padding){

			let pad = 0;

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
				this.rootElement.scrollLeft(this.rootElement[0].scrollWidth)
				return;
			}

			if(position.left - target.prev().outerWidth(true) == 0){
				this.rootElement.scrollLeft(0);
				return;
			}

			if(scrollLeft >= position.left){
				if(padding){
					pad = this.columnWidths[this.last.Cell.ColumnIndex]
				}
				this.rootElement.scrollLeft(position.left - this.columnWidths[0] - pad);
				return;
			}

			if(scrollLeft + this.rootElement.outerWidth(true) <= position.left + target.outerWidth(true) + this.barHeight){
				const by = ((position.left + target.outerWidth(true)) + this.barHeight) - (scrollLeft + this.rootElement.outerWidth(true));
				if(padding){
					pad = this.columnWidths[this.last.Cell.ColumnIndex + 1]
				}
				this.rootElement.scrollLeft(scrollLeft + by + pad);
				return;
			}

		}

		scrollVertically(target, padding){

			let pad = 0;

			const position = target.position();
			const scrollTop = this.rootElement.scrollTop();

			if(this.lastPostion.Y == position.top){
				return;
			}

			this.lastPostion.Y = position.top;

			if(scrollTop + position.top <= 0){
				return;
			}

			if(this.rootElement[0].scrollHeight == target.outerHeight(true) + position.top){
				this.rootElement.scrollTop(this.rootElement[0].scrollHeight)
				return;
			}

			if(position.top - this.headerHeight == 0){
				this.rootElement.scrollTop(0);
				return;
			}

			if(scrollTop >= position.top){
				if(padding){
					pad = this.getChildHeight(this.last.Cell.RowIndex - 1);
				}
				this.rootElement.scrollTop(position.top - pad);
				return;
			}

			if(scrollTop + this.visibleViewportHeight <= position.top + target.outerHeight(true) + this.barHeight){
				const by = (position.top + target.outerHeight(true)) - (scrollTop + this.visibleViewportHeight) + this.barHeight;
				if(padding){
					pad = this.getChildHeight(this.last.Cell.RowIndex + 1);
				}
				this.rootElement.scrollTop(scrollTop + by + pad);
				return;
			}

		}

		changeHighlightByScroll(){

			const changeHighlightRequired = () => {

				if(this.isAllSelected){
					return true;
				}

				if(this.preventSelection){
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

				if(this.isAllSelected){
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

			for (let i = rowStart; i <= rowEnd; i++) {

				const row = container.find(".gtbl-detail").eq(i);

				const rowCells = row.find(".gtbl-value-cell");

				this.rowHeaderCells[i].addClass("row-highlight");

				for (let j = cellStart; j <= cellEnd; j++) {
					rowCells.eq(j).addClass("highlight");
				}
			}
		}

		updateVirtualSelection(target){

			if(this.isAllSelected){
				this.virtualSelection.Start.RowIndex = 0;
				this.virtualSelection.End.RowIndex = this.visibleNodesCount - 1;
				this.virtualSelection.Start.ColumnIndex = 0;
				this.virtualSelection.End.ColumnIndex = this.header.length - 1;
				return;
			}

			// Upward selection
			if(this.current.Cell.RowIndex >= target.Cell.RowIndex){

				/*
				console.log("--------------")
				console.log(this.current.Cell.RowIndex)
				console.log(this.startNode)*/
				//this.virtualSelection.Start.RowIndex = Math.abs(this.startNode - this.current.Cell.RowIndex);
				this.virtualSelection.Start.RowIndex = Math.min(this.visibleNodesCount - 1, this.current.Cell.RowIndex - this.startNode);
				this.virtualSelection.End.RowIndex = Math.max(0, this.last.Cell.RowIndex - this.startNode);
			// Downward selection
			}else{

				this.virtualSelection.Start.RowIndex = Math.max(0, this.current.Cell.RowIndex - this.startNode);
				//this.virtualSelection.End.RowIndex = Math.abs(this.startNode - this.last.Cell.RowIndex);
				this.virtualSelection.End.RowIndex =Math.min(this.visibleNodesCount - 1, this.last.Cell.RowIndex - this.startNode);
			}

			this.virtualSelection.Start.ColumnIndex = this.current.Cell.ColumnIndex;
			this.virtualSelection.End.ColumnIndex = target.Cell.ColumnIndex;

			return true;
		}

		selectAll(){

			this.isAllSelected = true;

			Array.from(this.visibleNodes).forEach(node => {
				Array.from(node.children()).forEach((cell, index) => {
					if(index > 0){
						this.highlightSelection($(cell));
					}
				});
			})

			this.updateSelection(0, this.rows.length - 1, 0, this.header.length - 1);
		}

		onRowHeaderCellClick(e){
			this.highlightRow(e.target);
		}

		highlightRow(rowHeaderCell){

			this.markCurrent($(rowHeaderCell).next());
			this.last = this.getCellNode($(rowHeaderCell).parent().children().eq(this.header.length));

			rowHeaderCell.parentNode.childNodes.forEach((cell, index) => {

				if(index > 0){
					$(cell).addClass("highlight");
				}else{
					$(cell).addClass("row-highlight");
				}
			});

			const selectedRowIndex = parseInt(rowHeaderCell.innerHTML) - 1;
			this.updateSelection(selectedRowIndex, selectedRowIndex, 0, this.header.length - 1);
			this.setFocus();
		}

		highlightSelection(selectedCell){
			selectedCell.addClass("highlight");
			selectedCell.parent().children().eq(0).addClass("row-highlight");
		}

		clearSelection(){
			this.viewport.find(".highlight").removeClass("highlight");
			this.rowHeaderCells.forEach(cell => cell.removeClass("row-highlight"))
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

			const dataArray = [];

			for(let row = this.selection.Start.RowIndex; row <= this.selection.End.RowIndex; row++){
				dataArray.push(this.rows[row].slice(this.selection.Start.ColumnIndex, this.selection.End.ColumnIndex + 1).join("\t"));
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

		destroy(){
			this.rootElement.empty();
			this.rows = null;
			this.header = null;
			this._rows = null;
			this.childPositions = null;
			this.sizeBase = null;
			this.columnWidths = null;
			this.scrollCallback = null;
			this.container = null;
			this.table = null;
			this.viewport = null;
			this.visibleNodes = null;
			this.focusHolder = null;
			this.rowHeaderCells = null;
			this.current = null;
			this.last = null;
			this.selection = null;
			this.virtualSelection = null;
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
		return Object.keys(array[0]).map(key => {
			return array.map(item => {
				return item[key];
			});
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

	static reduceRowHeights(a, b){
		const len = b.split("\n").length;
		return len > a ? len : a;
	}

	static getSizeBase(header, rows, font){
		const heightBases = rows.map(item => {
			return item.reduce(this.reduceRowHeights, 1);
		});
		const _numberColumnWidth = this.getStringWidth(rows.length, false, font);
		const _maxLengthValues = this.reduceString([header].concat(rows));

		return {
			widths: [_numberColumnWidth].concat(_maxLengthValues.map(item => this.getStringWidth(item, true, font))),
			heights: heightBases
		};
	}
}


