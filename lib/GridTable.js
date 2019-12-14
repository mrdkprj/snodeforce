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
		//------------- scroll
		this.rootElement.height("500px");
		this.rootElement.css("overflow","auto");
		this.data = data.rows;
		this.itemCount = data.rows.length;
		const rowHeight = 22;
		const nodePadding = 1;
		const viewportHeight = this.rootElement.height();
		this.totalContentHeight = this.itemCount * rowHeight;
		this.scrollTop = this.rootElement.scrollTop();

		let startNode = Math.floor(this.scrollTop / rowHeight) - nodePadding;
		startNode = Math.max(0, startNode);

		let visibleNodesCount = Math.ceil(viewportHeight / rowHeight) + 2 * nodePadding;
		visibleNodesCount = Math.min(this.itemCount - startNode, visibleNodesCount);

		this.offsetY = startNode * rowHeight;
		this.isOffsetDone = false;
		//------------- scroll

		//this.container = $("<div>", { class: "tbl grid", css: `"height : ${this.totalContentHeight}; overflow: hidden"`});
		this.container = $("<div>", { css: {"height": this.totalContentHeight + "px", "overflow": "hidden"}});
		this.container.id = this.guid;

		this.table = $("<div>", { class: "tbl grid" });
		if(data.rows.length){
			//this.container.width("100%");
			this.table.width("100%");
		}				
		
		this.rootElement.empty();
		
		this.rootElement.append(this.container);

		this.container.append(this.table);
		
		const thead = $("<div>", { class: "row" });
		//thead.height("22px");

		//this.container.append(thead);
		this.table.append(thead);
		
		this.rows = [];
		this.headers = [];

		this.columnCount = data.header.length;

		data.header.forEach(function (item, index) {
			const header = $("<div>", { class: "header-cell", text: item });
			thead.append(header);
			_this.headers.push(header);
		});
		
		this.headers.forEach(function(header,index){
			if(index == _this.headers.length - 1){
				header.css("width","100%");
			}
		});
/*
		this.viewport = $("<span>", { class: "viewp", css: {"transform": "translateY(" + this.offsetY + "px)"} });

		this.container.append(this.viewport);

		this.contentTalbe = $("<div>", { class: "tbl grid"});
		
		this.viewport.append(this.contentTalbe);
*/		
		const visibleChildren = new Array(visibleNodesCount)
		.fill(null)
		.map((_, index) => renderItem(index + startNode));

		//visibleChildren[0].css("transform", "translateY(" + this.offsetY + "px)");
		//this.container.append(visibleChildren);
		this.table.append(visibleChildren);

		function renderItem(i){

			const row = _this.data[i];
			
			let rowDiv;

			if(_this.isOffsetDone){
				rowDiv = $("<div>", { class: "row detail" });
			}else{
				rowDiv = $("<div>", { class: "row detail", css: {"transform":_this.offsetY + "px"} });
			}
			
			//_this.container.append(rowDiv);

			row.forEach(function (cellvalue) {
				const cell = $("<div>", { class: "value-cell", text: cellvalue });				
				cell.on("mousedown", onCellMouseDown);
				cell.on("mouseup", onCellMouseUp);
				cell.on("mouseover", onCellMouseOver);
				rowDiv.append(cell);
				
			});

			_this.rows.push(rowDiv);

			return rowDiv;
		};
		/*
		data.rows.forEach(function (row1) {
			const row = $("<div>", { class: "row detail" });
			_this.container.append(row);
			row1.forEach(function (cellvalue) {
				const cell = $("<div>", { class: "value-cell", text: cellvalue });
				cell.on("mousedown", onCellMouseDown);
				cell.on("mouseup", onCellMouseUp);
				cell.on("mouseover", onCellMouseOver);
				row.append(cell);
			});
			_this.rows.push(row);
		});
		*/

		this.currentCell = null;
		this.selectedCells = [];
		this.isDragging = false;
		this.startRowIndex = null;
		this.startCellIndex = null;

		//  this.selection.addLocalHook('beforeSetRangeStart', function (cellCoords) {
		//    _this.runHooks('beforeSetRangeStart', cellCoords);

		function onDocumentMouseDown(e) {
			_this.isDragging = false;
			$(".highlight").removeClass("highlight");
			if(_this.currentCell){
				_this.currentCell.removeClass("current");
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
				markCurrent(_this, e.target);
			}

			_this.isDragging = true;

			const cell = $(this);

			_this.selectedCells = [cell];

			$(".highlight").removeClass("highlight");

			if (e.shiftKey) {
				selectTo(_this, _this.container, cell);
			}
			else {
				_this.startCellIndex = cell.index();
				_this.startRowIndex = cell.parent().index() - 1;
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

			$(".highlight").removeClass("highlight");
			selectTo(_this, _this.container, $(this));
		};

		function markCurrent(container, target){
			if(container.currentCell){
				container.currentCell.removeClass("current");
			}
		
			container.currentCell = $(target);
			container.currentCell.addClass("current");	
		};
		
		function selectTo(grid, table, cell) {
			
			const row = cell.parent();    
			const cellIndex = cell.index();
			const rowIndex = row.index() - 1;
			
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

				const row = table.find(".detail").eq(i);

				if(row.hasClass("filtered")){
					continue;
				}

				const rowCells = row.find(".value-cell");
				const cells = [];
				for (var j = cellStart; j <= cellEnd; j++) {
					const cell = rowCells.eq(j);
					cell.addClass("highlight");
					cells.push(cell);
				}

				grid.selectedCells.push(cells);
			}
		};

		function selectAll(){
			_this.selectedCells = [];
			for (var i = 0; i <= $(".value-cell").last().parent().index() - 1 ; i++) {
				const rowCells = _this.container.find(".detail").eq(i).find(".value-cell");
				const cells = [];
				for (var j = 0; j <= _this.columnCount; j++) {
					const cell = rowCells.eq(j);
					cell.addClass("highlight");
					cells.push(cell);
				}
				_this.selectedCells.push(cells);
			}
		};	

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

