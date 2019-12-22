"use strict";
//import * from "./js/jquery-1.11.2.min.js";
//function Core(rootElement, userSettings) {
class GridTable {
	constructor(rootElement, data) {
		
		const _this = this;
		
		const instance = this;
			
		$(document).on("mousedown", onDocumentMouseDown);		
		$(document).on("mouseup", onDocumentMouseUp);
		$(document).on("keydown", onDocumentKeyDown);
		$(document).on("copy" , onDocumentCopy);

		this.rootElement = $(rootElement);
		this.rootElement.empty();
		
		this.rootDocument = rootElement.ownerDocument;
		
		this.isDestroyed = false;
		this.guid = "gtbl_".concat(generateUuid());

		//------------- scroll ----------------------
		this.rootElement.height("500px");
		this.rootElement.css("overflow","auto");
		this.data = data.rows;
		this.header = data.header;
		this.itemCount = data.rows.length;// - 1;
		this.rowHeight = 22;
		this.nodePadding = 1;
		const extraRowCount = 0;
		this.viewportHeight = this.rootElement.height();
		this.totalContentHeight = this.itemCount * this.rowHeight; //this.totalContentHeight += 27;// + 26;

		this.scrollTop = this.rootElement.scrollTop();

		this.startNode = Math.floor(this.scrollTop / this.rowHeight) - this.nodePadding;
		this.startNode = Math.max(0, this.startNode);

		this.visibleNodesCount = Math.ceil(this.viewportHeight / this.rowHeight) + extraRowCount * this.nodePadding;
		this.visibleNodesCount = Math.min(this.itemCount - this.startNode, this.visibleNodesCount);

		this.offsetY = this.startNode * this.rowHeight;

		this.rootElement.on("scroll", onScroll);
		function onScroll(e){

			_this.scrollTop = this.scrollTop;

			_this.startNode = Math.floor(_this.scrollTop / _this.rowHeight) - _this.nodePadding;
			_this.startNode = Math.max(0, _this.startNode);

			_this.offsetY = _this.startNode * _this.rowHeight;

			if(_this.currentCell){
				_this.currentCell.Node.removeClass("current");
			}

			_this.viewport.css("transform","translateY(" + _this.offsetY + "px)");

			const data = new Array(_this.visibleNodesCount)
			.fill(null)
			.map((_, index) => getRowAt(index + _this.startNode))
			//.filter(Boolean)
			.forEach((row, rowIndex) => changeRowValue(row, rowIndex));

			selectOnScroll(e);

			if(_this.scrollCallback){
				_this.scrollCallback();
				_this.scrollCallback = null;
			}
		}

		function getRowAt(i){
			/*
			if(i >= _this.data.length){				
				return null;
			}
			*/

			return [i + 1].concat(_this.data[i]);
		};

		//this.extraNodes = {};

		function changeRowValue(rowArray, arrayIndex){

			/*
			const rowNode = $(_this.nodes[arrayIndex][0]);

			if(!rowArray){
				_this.extraNodes[arrayIndex] = rowNode.detach();
				return
			}

			if(_this.extraNodes[arrayIndex]){
				_this.viewport.append(_this.extraNodes[arrayIndex]);
				delete _this.extraNodes[arrayIndex];
			}
			*/

			const rowIndex = arrayIndex + _this.startNode;

			rowArray.forEach((value, index) => {
				
				const node = _this.nodes[arrayIndex][0].childNodes[index];
				node.innerHTML = value;
				if(_this.currentCell && _this.currentCell.RowIndex == rowIndex && _this.currentCell.ColumnIndex == index){
					_this.currentCell = getCellNode($(node));
					_this.currentCell.Node.addClass("current");
				}
			});
		}
		
		//------------- scroll ----------------------

		//------------- data ----------------------
		this.widths = [];
		this.font = "12px Verdana";
		const size = getStringWidth(this.data.length, false);
		let arr = [this.header].concat(this.data);
		
		arr = reduceString(arr);

		this.widths = [size].concat(arr.map(item => getStringWidth(item, true)));

		function transpose(a) {
			return Object.keys(a[0]).map(function(c) {
				return a.map(function(r) { return r[c]; });
			});
		}

		function reduceString(a){
			return transpose(a).map(r => r.reduce(function (a, b) { return a.length > b.length ? a : b; }));
		}

		function getStringWidth(text, padding){
			// re-use canvas object for better performance
			var canvas = getStringWidth.canvas || (getStringWidth.canvas = document.createElement("canvas"));
			var context = canvas.getContext("2d");
			context.font = _this.font;
			var metrics = context.measureText(text);
			if(padding){
				return metrics.width + 32;
			}else{
				return metrics.width + 10;
			}
		}
		//------------- data ----------------------

		//------------- scroll ----------------------

		this.container = $("<div>", { css: {"height": this.totalContentHeight + "px", "overflow": "hidden", "display":"inline-block"}});
		this.container.id = this.guid;

		this.table = $("<div>", { class: "gtbl gtbl-grid" });
		if(data.rows.length){
			// remove if not to fill area
			//this.table.width("100%");
		}			
		
		this.rootElement.append(this.container);

		this.container.append(this.table);

		const thead = $("<div>", { class: "gtbl-row gtbl-row-header"});

		//this.table.append(thead);
		const cornerCell = $("<div>", { class: "gtbl-header-cell gtbl-corder-cell stick"});
		cornerCell.width(this.widths[0] + "px");
		thead.append(cornerCell);


		this.columnCount = data.header.length;
		
		data.header.forEach(function (item, index) {
			const header = $("<div>", { class: "gtbl-header-cell gtbl-col-header-cell stick", text: item });
			header.width(_this.widths[index + 1] + "px");
			thead.append(header);
		});

		const theadClone = thead[0].cloneNode(true);
		theadClone.classList.remove("gtbl-row-header");
		theadClone.classList.add("gtbl-hidden-row-header");
		this.rootElement.prepend(theadClone);
		
		 //unnecessary maybe
		 /*
		this.headers.forEach(function(header,index){
			if(index == _this.headers.length - 1){
				header.css("width","100%");
			}
		});
		*/
		
		this.viewport = $("<div>", { class: "node-container", css:{"transform": "translateY(" + this.offsetY + "px)"}});
		this.table.append(this.viewport);

		this.nodes = visibleChildren();
		this.viewport.append(this.nodes);

		this.focusHolder = $("<input id='focusHolder' type='text' value='' style='position:fixed;top:-100px;left:-100px;'/>");
		this.rootElement.append(this.focusHolder);

		function visibleChildren(){
			return new Array(_this.visibleNodesCount)
			.fill(null)
			.map((_, index) => renderItem(index + _this.startNode));
		}

		function renderItem(i){

			const row = _this.data[i];
			
			const rowDiv = $("<div>", { class: "gtbl-row gtbl-detail" });
			
			const numCol = $("<div>", { class: "gtbl-header-cell gtbl-row-header-cell", text: i + 1 });
			
			if(i == 0){
				numCol.width(_this.widths[0] + "px");
			}

			rowDiv.append( numCol);

			row.forEach(function (cellvalue, cellIndex) {
				const cell = $("<div>", { class: "gtbl-value-cell", text: cellvalue });
				cell.on("mousedown", onCellMouseDown);
				cell.on("mouseup", onCellMouseUp);
				cell.on("mouseover", onCellMouseOver);

				if(i == 0){
					cell.width(_this.widths[cellIndex + 1] + "px");
				}

				rowDiv.append(cell);
				
			});

			return rowDiv;
		};		

		// -------- selection -------------------------
		this.currentCell = null;
		this.selectedCells = [];
		this.isDragging = false;
		this.startRowIndex = null;
		this.startCellIndex = null;
		this.endRowIndex = null;

		function onDocumentMouseDown(e) {
			_this.isDragging = false;
			/*clearSelection();
			if(_this.currentCell){
				_this.currentCell.Node.removeClass("current");
				_this.currentCell = null;
			}*/
		};

		function onDocumentMouseUp(e) {
			_this.isDragging = false;
		};

		function onDocumentKeyDown(e){

			if(!_this.focusHolder.is(":focus")){
				return true;
			}

			if (e.ctrlKey && e.key === "a" && _this.currentCell) {
				e.preventDefault();
				selectAll();
			}

			// left
			if(e.keyCode == 37){
				if(_this.currentCell.ColumnIndex  == 0){
					return;
				}

				if(shouldScrollToCurrent()){
					_this.scrollCallback = moveLeft;
					return;
				}

				moveLeft();

			}

			// right
			if(e.keyCode == 39){

				if(_this.currentCell.ColumnIndex == _this.header.length){
					return;
				}

				if(shouldScrollToCurrent()){
					_this.scrollCallback = moveRight;
					return;
				}

				moveRight();
			}

			// up
			if(e.keyCode == 38){

				if(_this.currentCell.RowIndex  == 0){
					return;
				}

				if(shouldScrollToCurrent()){
					_this.scrollCallback = moveUp;
					return;
				}
				moveUp();
			}

			// down
			if(e.keyCode == 40){

				if(_this.currentCell.RowIndex + 1 == _this.data.length){
					return;
				}

				if(shouldScrollToCurrent()){
					_this.scrollCallback = moveDown;
					return;
				}
				moveDown();

			}

		}

		function shouldScrollToCurrent(){

			// hidden below
			if(_this.currentCell.RowIndex > _this.startNode + _this.visibleNodesCount){
				const position = _this.rowHeight * (_this.currentCell.RowIndex - (_this.visibleNodesCount - 3));				
				_this.rootElement.scrollTop(_this.rootElement.scrollTop() + position);
				return true;
			}

			// hidden above
			if(_this.currentCell.RowIndex < _this.startNode){
				const position = _this.rowHeight * _this.currentCell.RowIndex;
				_this.rootElement.scrollTop(position);
				return true;
			}

			return false;
		}

		function moveUp(){
			const up = _this.currentCell.Node.parent().prev().children().eq(_this.currentCell.Node.index());
			markCurrent(up);			
		}

		function moveDown(){
			const down = _this.currentCell.Node.parent().next().children().eq(_this.currentCell.Node.index());
			markCurrent(down);
		}

		function moveLeft(){
			const prev = _this.currentCell.Node.prev();
			markCurrent(prev)
		}

		function moveRight(){
			const next = _this.currentCell.Node.next();
			markCurrent(next)
		}

		function onDocumentCopy(e){
			if(_this.focusHolder.is(":focus")){
				copyToClipboard(e);
			}
		}

		function onCellMouseDown(e) {
			
			_this.focusHolder.focus();

			_this.isDragging = true;
			_this.isScrollSelecting = true;
			_this.isAllSelected = false;
			_this.lastMousePosition = { x: e.clientX, y: e.clientY};

			if (!e.shiftKey) {
				markCurrent($(e.target));
			}

			const cell = $(this);

			setSelectionDataRange(_this.currentCell.RowIndex, _this.currentCell.RowIndex,_this.currentCell.ColumnIndex - 1,_this.currentCell.ColumnIndex - 1);
			_this.lastSelectedCell = null;//_this.currentCell;		

			if (e.shiftKey) {
				clearSelection();
				_this.isDragging = false;
				_this.lastSelectedCell = getCellNode(cell);
				selectTo(cell);
			}
			else {
				_this.startCellIndex = cell.index() - 1;
				_this.startRowIndex = cell.parent().index();
			}
			
			return false;
		};

		function onCellMouseUp(e) {
			_this.isDragging = false;
			_this.isScrollSelecting = false;
		};

		this.isScrollSelecting = false;
		this.isAllSelected = false;

		function onCellMouseOver(e) {

			if (!_this.isDragging) {
				return;
			}

			if(_this.lastMousePosition.x == e.clientX){
				return;
			}

			const cell = $(this);
			
			clearSelection();

			_this.lastSelectedCell = getCellNode(cell);
			
			selectTo(cell);

			_this.isSelectingX = scrollX(cell);
			_this.isSelectingY = scrollY(cell);
			_this.isScrollSelecting = _this.isSelectingX || _this.isSelectingY;
		};

		function selectTo(cell) {

			const row = cell.parent();    
			const cellIndex = cell.index() - 1;
			const rowIndex = row.index();

			let rowStart, rowEnd, cellStart, cellEnd;
			
			_this.selectedCells = [];

			rowStart = Math.min(rowIndex, _this.startRowIndex);
			rowEnd = Math.max(rowIndex, _this.startRowIndex);
			cellStart = Math.min(cellIndex, _this.startCellIndex);
			cellEnd = Math.max(cellIndex, _this.startCellIndex);
			/*
			if (rowIndex < _this.startRowIndex) {
				rowStart = rowIndex;
				rowEnd = _this.startRowIndex;
			} else {
				rowStart = _this.startRowIndex;
				rowEnd = rowIndex;
			}
			
			if (cellIndex < _this.startCellIndex) {
				cellStart = cellIndex;
				cellEnd = _this.startCellIndex;
			} else {
				cellStart = _this.startCellIndex;
				cellEnd = cellIndex;
			}
			*/

			for (var i = rowStart; i <= rowEnd; i++) {

				const row = _this.container.find(".gtbl-detail").eq(i);

				if(row.hasClass("filtered")){
					continue;
				}

				const rowCells = row.find(".gtbl-value-cell");
				for (var j = cellStart; j <= cellEnd; j++) {
					rowCells.eq(j).addClass("highlight");
				}
			}

			const selectionStartRow = _this.currentCell.RowIndex;
			const selectionEndRow = rowIndex + _this.startNode;
			
			setSelectionDataRange(selectionStartRow, selectionEndRow,
				cellStart, cellEnd);			
		};


		this.isSelectingX = false;
		this.isSelectingY = false;
		this.lastMousePosition = null;

		function markCurrent(target){

			clearSelection();

			if(_this.currentCell){
				_this.currentCell.Node.removeClass("current");
			}

			_this.currentCell = getCellNode(target);

			_this.currentCell.Node.addClass("current");

			_this.isSelectingX = scrollX(target);
			_this.isSelectingY = scrollY(target);
			_this.isScrollSelecting = _this.isSelectingX || _this.isSelectingY;

		};

		this.headerHeight = 27;

		this.visibleViewportHeight = (this.rowHeight * (this.visibleNodesCount - 2)) - this.headerHeight;

		function scrollX(target){
			const position = target.position();
			const scrollLeft = _this.rootElement.scrollLeft();
			
			if(scrollLeft + position.left - _this.widths[0] <= 0){				
				return false;
			}

			if(position.left - target.prev().outerWidth() == 0){
				_this.rootElement.scrollLeft(0);
				return true;
			}

			if(scrollLeft >= position.left){
				_this.rootElement.scrollLeft(scrollLeft - target.width());
				return true;
			}

			if(scrollLeft + position.left + target.width() >= _this.rootElement.width()){
				_this.rootElement.scrollLeft(scrollLeft + target.width());
				return true;
			}

			return false;
		}

		function scrollY(target){
			const pad = 0;//10;
			const position = target.position();
			const scrollTop = _this.rootElement.scrollTop();
			
			if(scrollTop + position.top == 0 || scrollTop + position.top + _this.rowHeight == _this.totalContentHeight){
				return false;
			}

			if(position.top - _this.headerHeight == 0){
				_this.rootElement.scrollTop(0);
				return true;
			}

			if(scrollTop >= position.top + pad){
				_this.rootElement.scrollTop(scrollTop - _this.rowHeight);
				return true;
			}

			if(position.top + _this.rowHeight == _this.totalContentHeight){
				_this.rootElement.scrollTop(_this.totalContentHeight);
				return true;
			}

			if(scrollTop +  _this.visibleViewportHeight + pad <= position.top){
				_this.rootElement.scrollTop(scrollTop + _this.rowHeight);
				return true;
			}

			return false;
		}
		
		this.lastSelectedCell = null;

		const Delta = {
			Up:1,
			Down:2,
			Left:3,
			Right:4
		}

		function selectOnScroll(e){

			if(!_this.isScrollSelecting){
				_this.isDragging = false;
			}

			if(_this.isAllSelected){
				return true;
			}
			
			if(_this.lastSelectedCell){
				
				clearSelection();

				virtualSelectTo(_this.container, _this.lastSelectedCell, true);
			}			
		}
		
		function virtualSelectTo(table, cell) {

			const endRowIndex = cell.RowIndex;
			let rowIndex, startRowIndex;
			let dir;
			// up
			if(_this.currentCell.RowIndex >= endRowIndex){
				if(_this.currentCell.RowIndex < _this.startNode){
					return;
				}
				dir = Delta.Up;
				rowIndex = Math.abs(_this.startNode - _this.currentCell.RowIndex);
				startRowIndex = Math.max(0, _this.lastSelectedCell.RowIndex - _this.startNode);
			// down
			}else{
				if(cell.RowIndex < _this.startNode){
					return;
				}
				dir = Delta.Down;
				rowIndex = Math.abs(_this.startNode - _this.lastSelectedCell.RowIndex);
				startRowIndex = Math.max(0, _this.currentCell.RowIndex - _this.startNode);
			}
			
			const startCellIndex = _this.currentCell.ColumnIndex - 1;
			const cellIndex = cell.ColumnIndex - 1;			

			let rowStart, rowEnd, cellStart, cellEnd;
			
			rowStart = Math.min(rowIndex, startRowIndex);
			rowEnd = Math.max(rowIndex, startRowIndex);
			if(dir == Delta.Up){
				_this.startRowIndex = rowEnd;
			}else{
				_this.startRowIndex = rowStart;
			}
			cellStart = Math.min(cellIndex, startCellIndex);
			cellEnd = Math.max(cellIndex,startCellIndex);
			/*
			if (rowIndex < _this.startRowIndex) {
				rowStart = rowIndex;
				rowEnd = _this.startRowIndex;
			} else {
				rowStart = _this.startRowIndex;
				rowEnd = rowIndex;
			}
			
			if (cellIndex < _this.startCellIndex) {
				cellStart = cellIndex;
				cellEnd = _this.startCellIndex;
			} else {
				cellStart = _this.startCellIndex;
				cellEnd = cellIndex;
			}
			*/

			for (var i = rowStart; i <= rowEnd; i++) {

				const row = table.find(".gtbl-detail").eq(i);

				if(row.hasClass("filtered")){
					continue;
				}

				const rowCells = row.find(".gtbl-value-cell");

				for (var j = cellStart; j <= cellEnd; j++) {
					rowCells.eq(j).addClass("highlight");
				}
			}
		};

		function selectAll(){

			_this.isAllSelected = true;

			Array.from(_this.nodes).forEach(node => {
				Array.from(node.children()).forEach((cell, index) => {
					if(index > 0){
						$(cell).addClass("highlight");
					}
				});
			})

			setSelectionDataRange(0, _this.data.length - 1, 0, _this.header.length - 1);
		};

		function clearSelection(){
			$(".highlight").removeClass("highlight");
		}

		function getCellNode(cell){
			return	{
				Node: cell,
				RowIndex: cell.parent().index() + _this.startNode,
				ColumnIndex: cell.index()
			};
		}
		
		function setSelectionDataRange(startRow, endRow, startCol, endCol){
			_this.selectedCells = {
				StartRow: Math.min(startRow, endRow),
				EndRow: Math.max(startRow, endRow),
				StartColumn: Math.min(startCol,endCol),
				EndColumn: Math.max(startCol,endCol)
			}

		}

		// -------- selection -------------------------

		function copyToClipboard(e){

			e.preventDefault();

			const dataArray = [];

			for(let row = _this.selectedCells.StartRow; row <= _this.selectedCells.EndRow; row++){
				dataArray.push(_this.data[row].slice(_this.selectedCells.StartColumn, _this.selectedCells.EndColumn + 1).join("\t"));
			}

			const clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
			
			clipboardData.setData("text/plain" , dataArray.join("\n"));

		}

		function generateUuid() {
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
		};

		function getDelta(e){
			//check to make sure there is data to compare against
			if (_this.lastMousePosition) {

				//get the change from last position to this position
				const deltaX = _this.lastMousePosition.x - e.clientX;
				const deltaY = _this.lastMousePosition.y - e.clientY;

				_this.lastMousePosition.x = e.clientX;
				_this.lastMousePosition.y = e.clientY;

				//check which direction had the highest amplitude and then figure out direction by checking if the value is greater or less than zero
				if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
					return "l";
				} else if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
					return "r";
				} else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 0) {
					return "u";
				} else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < 0) {
					return "d";
				}
			}	
		}		
	}

	filter(columnIndex, value){
		this.rows.forEach(function(row){

			row.children().each(function(){{

				if($(this).index() == columnIndex && $(this).html() != value){
					row.addClass("filtered");
					return false;
				}

			}});

		});
	}

	clearFilter(){
		$(".filtered").removeClass("filtered");
	}

}

