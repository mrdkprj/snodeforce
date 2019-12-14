/*
const VirtualScroll = ({
	renderItem,
	itemCount,
	viewportHeight,
	rowHeight,
	nodePadding,
  }) => {
	const totalContentHeight = itemCount * rowHeight;
  
	let startNode = Math.floor(scrollTop / rowHeight) - nodePadding;
	startNode = Math.max(0, startNode);
  
	let visibleNodesCount = Math.ceil(viewportHeight / rowHeight) + 2 * nodePadding;
	visibleNodesCount = Math.min(itemCount - startNode, visibleNodesCount);
  
	const offsetY = startNode * rowHeight;
  
	const visibleChildren = new Array(visibleNodeCount)
	  .fill(null)
	  .map((_, index) => renderItem(index + startNode));
  
	return `
	  <div ${ viewport }
		style="
		  height: ${viewportHeight};
		  overflow: "auto";
		"
	  >
		<div ${ content }
		  style="
			height: ${totalContentHeight};
			overflow: "hidden";
		  "
		>
		  <div ${ offset for visible nodes }
			style="
			  transform: translateY(${offsetY}px);
			"
		  >
			${visibleChildren}  ${ actual nodes }
		  </div>
		</div>
	  </div>
	);
  };

  */