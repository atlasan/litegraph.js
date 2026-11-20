import { LiteGraph } from "../litegraph.js";

// built-in pack: node types registered below belong to "litegraph/watch" (see LiteGraph.packs)
LiteGraph.setupPlatform();
LiteGraph.packs.open({ id: "litegraph/watch", version: LiteGraph.VERSION, title: "Watch", builtin: true });

class WatchValue {

    static fontSize = 16;
    static fontFamily = "Arial";
    static lineHeight = this.fontSize + 4;
    static padding = 10;
    
    static COLORS = {
        key: "#9cdcfe",
        string: "#ce9178",
        number: "#b5cea8",
        boolean: "#569cd6",
        null: "#569cd6",
        bracket: "#d4d4d4",
        hover: "#ffffff",
        loadMore: "#ffa500",
    };
    
    // static myCanvas = null;

    // canvas events
    // myCanvas.addEventListener("wheel", e => {
    //     this.state.scrollOffset += e.deltaY;
    //     this.render();
    // });

    // myCanvas.addEventListener("mousemove", handleMouseMove);
    // myCanvas.addEventListener("click", handleClick);
    
    constructor() {
        this.addInput("data", "", { label: "" });
        this.value = null;
        this.state = {
            scrollOffset: 0,
            expandedNodes: new Set(),
            hoverNodeId: null,
            maxChildren: 6, // Default limit for displayed children
            expandDepth: 2, // Default depth to expand
            loadMoreNodes: new Set(), // Tracks nodes with "Load More" clicked
        };
        this.clickRegions = [];
        this.ctx = null;
        this.properties = {"clip_area": true}
        this.clip_area = true;
    }

    onExecute() {
        // update values here
        this.updateInputData();
    }
    onAction() {
        // should probably execute on action
    }
    onGetInputs() {
        // return [["in", 0]];
    }
    onGetOutputs() {
        // return [["out", 0]];
    }
    getTitle() {
        if (this.flags?.collapsed) {
            return this.inputs[0].label;
        }
        return this.title;
    }
    onPropertyChanged(name, value, prev_value){
        // this.widget.value = value;
        if(name=="clip_area"){
            this.clip_area = value;
        }
    }
    onMouseDown(e, pos, node){
        console.debug(this.title,this.id,"onMouseDown",arguments);
        this.handleClick(pos);
    }
    onConnectionsChange(connection, slot, connected, link_info) {
        // only process the inputs
        if (connection != LiteGraph.INPUT) {
            return;
        }
        this.value = this.getInputData(0,true); // force update
    }
    onDrawBackground(ctx, graphcanvas, canvas, pos) {
        // render ctx
        this.ctx = ctx;
        // myCanvas = canvas;
        this.render();
    }

    updateInputData(){
        if (this.inputs[0]) {
            this.value = this.getInputData(0);
        }
    }

    renderJSON(data, depth = 0, offsetY = 6, parentKey = "") {

        const drawText = (text, color, x, y) => {
            this.ctx.fillStyle = color;
            if(y < this.size[1]){
                this.ctx.fillText(text, x, y);
            }
        };
    
        const isExpandable = (value) => ["object","function"].indexOf(typeof(value))>-1 && value !== null;
    
        const renderKeyValue = (key, value, depth, y, parentKey) => {
            if(y >= this.size[1]){
                return y;
            }

            const x = WatchValue.padding + depth * 20;
        
            // console.debug("Render:",key,"::",parentKey,":value:",typeof(value),value);
            drawText(`"${key}":`, WatchValue.COLORS.key, x, y);
        
            if (isExpandable(value)) {
                const nodeId = `${parentKey}-${key}`;
                const isExpanded = this.state.expandedNodes.has(nodeId);
        
                const toggleX = x - 15;
                this.clickRegions.push({
                    x: toggleX,
                    y,
                    width: 10,
                    height: WatchValue.lineHeight,
                    nodeId,
                });
        
                const color = this.state.hoverNodeId === nodeId ? WatchValue.COLORS.hover : WatchValue.COLORS.bracket;
                drawText(isExpanded ? "-" : "+", color, toggleX, y);
        
                if (isExpanded) {
                    return this.renderJSON(value, depth + 1, y + WatchValue.lineHeight, nodeId);
                }

                if(typeof value === 'object') {
                    if(value.constructor === Array){
                        value = "array ["+value.length+"]";
                        // TODO should cut array (value)
                    }else{
                        if(Object.keys(value).length){
                            value = "object {"+Object.keys(value).length+"}"
                        }else{
                            value = "object " + String(value);
                        }
                    }
                }else if(typeof(value) == "function"){
                    value = "function";
                }

                drawValue(value, x + this.ctx.measureText(`"${key}": `).width, y);

            } else {
                drawValue(value, x + this.ctx.measureText(`"${key}": `).width, y);
            }
        
            return y + WatchValue.lineHeight;
        };
    
        const drawValue = (value, x, y) => {
            if (typeof value === "string") {
                drawText(`"${value}"`, WatchValue.COLORS.string, x, y);
            } else if (typeof value === "number") {
                drawText(value, WatchValue.COLORS.number, x, y);
            } else if (typeof value === "boolean") {
                drawText(value, WatchValue.COLORS.boolean, x, y);
            } else if (value === null) {
                drawText("null", WatchValue.COLORS.null, x, y);
            }
        };
    
        let currentY = offsetY;
    
        if (Array.isArray(data)) {
            drawText("[", WatchValue.COLORS.bracket, WatchValue.padding + depth * 20, currentY);
            currentY += WatchValue.lineHeight;
        
            const nodeId = parentKey; //`${parentKey}-array`;
            const maxChildren = this.state.loadMoreNodes.has(nodeId)
                ? data.length
                : this.state.maxChildren;
        
            data.slice(0, maxChildren).forEach((item, index) => {
                if(currentY >= this.size[1]){
                    return;
                }
                currentY = renderKeyValue(index, item, depth + 1, currentY, `${parentKey}`);
            });
        
            if (data.length > maxChildren && !this.state.loadMoreNodes.has(nodeId)) {
                const loadMoreY = currentY;
                drawText("... Load More", WatchValue.COLORS.loadMore, WatchValue.padding + (depth + 1) * 20, loadMoreY);
                this.clickRegions.push({
                    x: WatchValue.padding + (depth + 1) * 20,
                    y: loadMoreY,
                    width: this.ctx.measureText("... Load More").width,
                    height: WatchValue.lineHeight,
                    nodeId: `loadMore-${nodeId}`,
                });
                currentY += WatchValue.lineHeight;
            }
        
            drawText("]", WatchValue.COLORS.bracket, WatchValue.padding + depth * 20, currentY);

        } else if (["object","function"].indexOf(typeof(data))>-1 && data !== null) {

            drawText("{", WatchValue.COLORS.bracket, WatchValue.padding + depth * 20, currentY);
            currentY += WatchValue.lineHeight;
        
            const keys = Object.keys(data);
            const nodeId = parentKey; //`${parentKey}-object`;
            const maxChildren = this.state.loadMoreNodes.has(nodeId)
                ? keys.length
                : this.state.maxChildren;
        
            keys.slice(0, maxChildren).forEach((key) => {
                currentY = renderKeyValue(key, data[key], depth + 1, currentY, nodeId);
            });
        
            if (keys.length > maxChildren && !this.state.loadMoreNodes.has(nodeId)) {
                const loadMoreY = currentY;
                drawText("... Load More", WatchValue.COLORS.loadMore, WatchValue.padding + (depth + 1) * 20, loadMoreY);
                this.clickRegions.push({
                    x: WatchValue.padding + (depth + 1) * 20,
                    y: loadMoreY,
                    width: this.ctx.measureText("... Load More").width,
                    height: WatchValue.lineHeight,
                    nodeId: `loadMore-${nodeId}`,
                });
                currentY += WatchValue.lineHeight;
            }
        
            drawText("}", WatchValue.COLORS.bracket, WatchValue.padding + depth * 20, currentY);
        }else{
            let dataType = typeof(data);
            let dataColor = WatchValue.COLORS.string;
            if(dataType === "boolean"){
                dataType = "bool";
                dataColor = WatchValue.COLORS.boolean;
            }else if(data === null){
                dataType = "null";
                dataColor = WatchValue.COLORS.null;
            }else if (dataType === "string") {
                dataColor = WatchValue.COLORS.string;
            } else if (dataType === "number") {
                dataColor = WatchValue.COLORS.number;
            }
            if (dataType === "undefined") {
                dataColor = WatchValue.COLORS.null;
                dataType = "";
            }else{
                dataType = `"${dataType}": `;
                drawText(dataType, dataColor, 18, currentY);
            }
            drawText(data, dataColor, 18 + this.ctx.measureText(dataType).width, currentY);
        }
    
        return currentY + WatchValue.lineHeight;
    }
    
    // handleMouseMove(event) {
    //     const rect = myCanvas.getBoundingClientRect(); // Get the canvas's bounding rectangle
    //     const offsetX = event.clientX - rect.left; // Calculate X relative to the canvas
    //     const offsetY = event.clientY - rect.top + this.state.scrollOffset; // Calculate Y, adjusting for scroll
    
    //     let hoverNodeId = null;
    
    //     this.clickRegions.forEach(({ x, y, width, height, nodeId }) => {
    //         if (
    //             offsetX >= x &&
    //             offsetX <= x + width &&
    //             offsetY >= y &&
    //             offsetY <= y + height
    //         ) {
    //             hoverNodeId = nodeId;
    //         }
    //     });
    
    //     if (this.state.hoverNodeId !== hoverNodeId) {
    //         this.state.hoverNodeId = hoverNodeId;
    //         this.render();
    //     }
    // }
    
    handleClick(pos) {
        // const rect = myCanvas.getBoundingClientRect(); // Get the canvas's bounding rectangle
        // const offsetX = event.clientX - rect.left; // Calculate X relative to the canvas
        // const offsetY = event.clientY - rect.top + this.state.scrollOffset; // Calculate Y, adjusting for scroll
        
        const offsetX = pos[0];
        const offsetY = pos[1];
    
        this.clickRegions.forEach(({ x, y, width, height, nodeId }) => {
            if (
                offsetX >= x &&
                offsetX <= x + width &&
                offsetY >= y &&
                offsetY <= y + height
            ) {
                if (nodeId.startsWith("loadMore-")) {
                    const targetNode = nodeId.replace("loadMore-", "");
                    this.state.loadMoreNodes.add(targetNode);
                } else if (this.state.expandedNodes.has(nodeId)) {
                    this.state.expandedNodes.delete(nodeId);
                } else {
                    this.state.expandedNodes.add(nodeId);
                }
                this.render();
            }
        });
    }
    
    render() {
        // this.ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
        const ctxFont = this.ctx.font;
        const ctxBaseline = this.ctx.textBaseline
        this.ctx.font = `${WatchValue.fontSize}px ${WatchValue.fontFamily}`;
        this.ctx.textBaseline = "top";

        this.clickRegions = [];
        let totalHeight = this.renderJSON(this.value, 0, 6-this.state.scrollOffset);
        // Scroll boundaries
        // if (this.state.scrollOffset > totalHeight - myCanvas.height) {
        //     this.state.scrollOffset = Math.max(totalHeight - myCanvas.height, 0);
        // }
        // if (this.state.scrollOffset < 0) {
        //     this.state.scrollOffset = 0;
        // }

        // restore
        this.ctx.font = ctxFont;
        this.ctx.textBaseline = ctxBaseline;
    }
    
    expandUpToDepth(data, maxDepth, currentDepth = 0, parentKey = "") {
        if (currentDepth >= maxDepth) return;

        if (["object","function"].indexOf(typeof(data))>-1 && data !== null) {
            const nodeId = `${parentKey}`;
            this.state.expandedNodes.add(nodeId);

            Object.keys(data).forEach((key, index) => {
                const childNodeId = `${nodeId}-${key}`;
                console.debug(currentDepth+"::"+childNodeId);
                this.expandUpToDepth(data[key], maxDepth, currentDepth + 1, childNodeId);
            });
        }
    }
}
LiteGraph.registerNodeType("watch/value", WatchValue);

LiteGraph.packs.close("litegraph/watch");
