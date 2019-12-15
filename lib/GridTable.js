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
		
		this.rootDocument = rootElement.ownerDocument;
		
		this.isDestroyed = false;
		this.guid = "gtbl_".concat(generateUuid());

		//------------- scroll ----------------------
		this.rootElement.height("500px");
		this.rootElement.css("overflow","auto");
		this.data = data.rows;
		this.header = data.header;
		this.itemCount = data.rows.length - 1;
		this.rowHeight = 22;
		this.nodePadding = 1;
		const viewportHeight = this.rootElement.height();
		this.totalContentHeight = this.itemCount * this.rowHeight; this.totalContentHeight += 27;// + 26;

		this.scrollTop = this.rootElement.scrollTop();

		this.startNode = Math.floor(this.scrollTop / this.rowHeight) - this.nodePadding;
		this.startNode = Math.max(0, this.startNode);

		this.visibleNodesCount = Math.ceil(viewportHeight / this.rowHeight) + 2 * this.nodePadding;
		this.visibleNodesCount = Math.min(this.itemCount - this.startNode, this.visibleNodesCount);

		this.offsetY = this.startNode * this.rowHeight;

		this.rootElement.on("scroll", onScroll);
		function onScroll(e){

			_this.scrollTop = this.scrollTop;

			_this.startNode = Math.floor(_this.scrollTop / _this.rowHeight) - _this.nodePadding;
			_this.startNode = Math.max(0, _this.startNode);

			_this.offsetY = _this.startNode * _this.rowHeight;

			if(_this.currentCell){
				_this.currentCell.CellNode.removeClass("current");
			}

			_this.viewport.css("transform","translateY(" + _this.offsetY + "px)");

			const data = new Array(_this.visibleNodesCount)
			.fill(null)
			.map((_, index) => getRowAt(index + _this.startNode))
			.filter(Boolean)
			.forEach((row, rowIndex) => changeRowValue(row, rowIndex));

			selectOnScroll();
		}

		function getRowAt(i){

			if(i >= _this.data.length){
				return;
			}

			return [i + 1].concat(_this.data[i]);
		};

		function changeRowValue(rowArray, arrayIndex){

			const rowIndex = arrayIndex + _this.startNode;

			rowArray.forEach((value, index) => {
				
				const node = _this.nodes[arrayIndex][0].childNodes[index];
				node.innerHTML = value;
				if(_this.currentCell && _this.currentCell.RowIndex == rowIndex && _this.currentCell.ColumnIndex == index){
					_this.currentCell = getCellNode($(node));
					_this.currentCell.CellNode.addClass("current");
				}
			});
		}
		
		//------------- scroll ----------------------

		//------------- data ----------------------
		

		//------------- scroll ----------------------

		this.container = $("<div>", { css: {"height": this.totalContentHeight + "px", "overflow": "hidden"}});
		this.container.id = this.guid;

		this.table = $("<div>", { class: "gtbl gtbl-grid" });
		if(data.rows.length){
			// remove if not to fill area
			//this.table.width("100%");
		}
		
		this.rootElement.empty();
		
		this.rootElement.append(this.container);

		this.container.append(this.table);

		const thead = $("<div>", { class: "gtbl-row gtbl-row-header"});

		this.table.append(thead);
		thead.append($("<div>", { class: "gtbl-header-cell gtbl-corder-cell"}))

		this.rows = [];

		this.columnCount = data.header.length;

		data.header.forEach(function (item, index) {
			const header = $("<div>", { class: "gtbl-header-cell gtbl-col-header-cell", text: item });
			thead.append(header);
		});
		
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

		function visibleChildren(){
			return new Array(_this.visibleNodesCount)
			.fill(null)
			.map((_, index) => renderItem(index + _this.startNode));
		}

		function renderItem(i){

			if(i >= _this.data.length){
				return false;
			}

			const row = _this.data[i];
			
			const rowDiv = $("<div>", { class: "gtbl-row gtbl-detail" });
			
			rowDiv.append( $("<div>", { class: "gtbl-header-cell gtbl-row-header-cell", text: i + 1 }));

			row.forEach(function (cellvalue, cellIndex) {
				const cell = $("<div>", { class: "gtbl-value-cell", text: cellvalue });
				cell.nodeValue = i + ":" + cellIndex;
				cell.on("mousedown", onCellMouseDown);
				cell.on("mouseup", onCellMouseUp);
				cell.on("mouseover", onCellMouseOver);
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

		function onDocumentMouseDown(e) {
			_this.isDragging = false;
			clearSelection();
			if(_this.currentCell){
				_this.currentCell.CellNode.removeClass("current");
				_this.currentCell = null;
			}
		};

		function onDocumentMouseUp(e) {
			_this.isDragging = false;
		};

		function onDocumentKeyDown(e){
			if (e.ctrlKey && e.key === "a" && _this.currentCell) {
				e.preventDefault();
				selectAll();
			}	
		}

		function onDocumentCopy(e){
			if(_this.currentCell){
				e.preventDefault();
				const array = _this.selectedCells.map(cell => cell.map(c => c.html()));
				const data = array.map(cell => cell.join("\t")).join("\n");
				const clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
				clipboardData.setData("text/plain" , data);
			}
		}

		function onCellMouseDown(e) {

			if (!e.shiftKey) {
				markCurrent(_this, $(e.target));
			}

			_this.isDragging = true;

			const cell = $(this);

			_this.selectedCells = [cell];
			_this.lastSelectedCell = null;

			clearSelection();

			if (e.shiftKey) {
				selectTo(_this, _this.container, cell);
			}
			else {
				_this.startCellIndex = cell.index() - 1;
				_this.startRowIndex = cell.parent().index();
			}
			
			return false;
		};

		function onCellMouseUp(e) {
			_this.isDragging = false;
		};

		function onCellMouseOver(e) {
			if (!_this.isDragging) {
				return;
			}

			clearSelection();
			selectTo(_this, _this.viewport, $(this));
		};

		function markCurrent(container, target){

			if(container.currentCell){
				container.currentCell.CellNode.removeClass("current");
			}

			container.currentCell = getCellNode(target);
			container.lastSelectedCell = container.currentCell;

			container.currentCell.CellNode.addClass("current");	
		};
		
		this.lastSelectedCell = null;
		function selectOnScroll(){
			
			if(_this.lastSelectedCell){
				console.log("scroll");

				clearSelection();
				//_this.startCellIndex = _this.currentCell.CellNode.index() - 1;
				//_this.startRowIndex = _this.currentCell.CellNode.parent().index();
				//_this.startCellIndex = _this.currentCell.ColumnIndex - 1;
				//_this.startRowIndex = _this.currentCell.RowIndex;
				
				//_this.lastSelectedCell.CellNode.parent().index(_this.lastSelectedCell. - _this.startNode);
				selectTo(_this, _this.container, _this.lastSelectedCell, true);
			}			
		}
		function selectTo(grid, table, cell, v) {
			
			

			const row = cell.parent();    
			let cellIndex = cell.index() - 1;
			let rowIndex = row.index();
			if(v){
				//rowIndex = row.index() - _this.startNode;
				console.log(row.index() - _this.startNode);
				console.log(row.index());
				if(row.index() > row.index() - _this.startNode){
					return;
				}
			}
			_this.lastSelectedCell = null;

			let rowStart, rowEnd, cellStart, cellEnd;
			
			grid.selectedCells = [];
			
			if (rowIndex < grid.startRowIndex) {
				rowStart = rowIndex;
				rowEnd = grid.startRowIndex;
			} else {
				rowStart = grid.startRowIndex;
				rowEnd = rowIndex;
			}
			
			if (cellIndex < grid.startCellIndex) {
				cellStart = cellIndex;
				cellEnd = grid.startCellIndex;
			} else {
				cellStart = grid.startCellIndex;
				cellEnd = cellIndex;
			}

			for (var i = rowStart; i <= rowEnd; i++) {

				const row = table.find(".gtbl-detail").eq(i);

				if(row.hasClass("filtered")){
					continue;
				}

				const rowCells = row.find(".gtbl-value-cell");
				const cells = [];
				for (var j = cellStart; j <= cellEnd; j++) {
					const cell = rowCells.eq(j);
					cell.addClass("highlight");
					cells.push(cell);
				}

				if(cells.length){
					grid.selectedCells.push(cells);
					_this.lastSelectedCell = cells[cells.length - 1];
					console.log("cell");
					console.log(_this.lastSelectedCell.parent().index());
				}
			}
		};

		function selectAll(){
			_this.selectedCells = [];
			for (var i = 0; i <= $(".gtbl-value-cell").last().parent().index() - 1 ; i++) {
				const rowCells = _this.container.find(".gtbl-detail").eq(i).find(".gtbl-value-cell");
				const cells = [];
				for (var j = 0; j <= _this.columnCount; j++) {
					const cell = rowCells.eq(j);
					cell.addClass("highlight");
					cells.push(cell);
				}
				_this.selectedCells.push(cells);
			}
		};

		function clearSelection(){
			$(".highlight").removeClass("highlight");
		}

		function getCellNode(cell){
			return	{
				CellNode: cell,
				RowIndex: cell.parent().children()[0].innerHTML - 1,
				ColumnIndex: cell.index()
			};
		}

		// -------- selection -------------------------


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

