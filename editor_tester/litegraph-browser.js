(function() {
    // Browser-compatible wrapper for LiteGraph
    
    // Global object helper functions
    function getGlobalObject(){if("undefined"!=typeof globalThis)return globalThis;if("undefined"!=typeof self)return self;if("undefined"!=typeof window)return window;if("undefined"!=typeof global)return global;throw new Error("Unable to determine global object")}
    function setGlobalVariable(key,value){getGlobalObject()[key]=value}
    function getGlobalVariable(key){return getGlobalObject()[key]}
    function isBrowser(){return"undefined"!=typeof window&&"undefined"!=typeof document}
    function isNode(){return"undefined"!=typeof process&&process.versions&&process.versions.node}
    function isBun(){return"undefined"!=typeof Bun}
    function getRuntime(){return isBrowser()?"browser":isBun()?"bun":isNode()?"node":"unknown"}

    // LiteGraph class definition
    class LiteGraphClass{
        VERSION="a0.11.1";
        LLink=null;
        LGraph=null;
        LGraphNode=null;
        LGraphGroup=null;
        LGraphCanvas=null;
        Subgraph=null;
        GraphInput=null;
        GraphOutput=null;
        DragAndScale=null;
        ContextMenuClass=null;
        ContextMenu=null;
        CallbackHandler=null;
        CANVAS_GRID_SIZE=10;
        NODE_TITLE_HEIGHT=30;
        NODE_TITLE_TEXT_Y=20;
        NODE_SLOT_HEIGHT=20;
        NODE_WIDGET_HEIGHT=20;
        NODE_WIDTH=140;
        NODE_MIN_WIDTH=50;
        NODE_MIN_SIZE=[50,0];
        NODE_COLLAPSED_RADIUS=10;
        NODE_COLLAPSED_WIDTH=80;
        NODE_TITLE_COLOR="#999";
        NODE_SELECTED_TITLE_COLOR="#FFF";
        NODE_TEXT_SIZE=14;
        NODE_TEXT_COLOR="#AAA";
        NODE_SUBTEXT_SIZE=12;
        NODE_DEFAULT_COLOR="#333";
        NODE_DEFAULT_BGCOLOR="#353535";
        NODE_DEFAULT_BOXCOLOR="#666";
        NODE_DEFAULT_SHAPE="box";
        NODE_BOX_OUTLINE_COLOR="#FFF";
        DEFAULT_SHADOW_COLOR="rgba(0,0,0,0.5)";
        DEFAULT_GROUP_FONT=24;
        WIDGET_BGCOLOR="#222";
        WIDGET_OUTLINE_COLOR="#666";
        WIDGET_TEXT_COLOR="#DDD";
        WIDGET_SECONDARY_TEXT_COLOR="#999";
        LINK_COLOR="#9A9";
        EVENT_LINK_COLOR="#A86";
        CONNECTING_LINK_COLOR="#AFA";
        MAX_NUMBER_OF_NODES=1e3;
        DEFAULT_POSITION=[100,100];
        VALID_SHAPES=["default","box","round","card"];
        BOX_SHAPE=1;
        ROUND_SHAPE=2;
        CIRCLE_SHAPE=3;
        CARD_SHAPE=4;
        ARROW_SHAPE=5;
        GRID_SHAPE=6;
        INPUT=1;
        OUTPUT=2;
        EVENT=-1;
        ACTION=-1;
        NODE_MODES=["Always","On Event","Never","On Trigger","On Request"];
        NODE_MODES_COLORS=["#666","#422","#333","#224","#626"];
        ALWAYS=0;
        ON_EVENT=1;
        NEVER=2;
        ON_TRIGGER=3;
        ON_REQUEST=4;
        UP=1;
        DOWN=2;
        LEFT=3;
        RIGHT=4;
        CENTER=5;
        LINK_RENDER_MODES=["Straight","Linear","Spline"];
        STRAIGHT_LINK=0;
        LINEAR_LINK=1;
        SPLINE_LINK=2;
        NORMAL_TITLE=0;
        NO_TITLE=1;
        TRANSPARENT_TITLE=2;
        AUTOHIDE_TITLE=3;
        VERTICAL_LAYOUT="vertical";
        
        constructor(){}
        
        initialize(){
            console.log("LiteGraph initialized");
        }
        
        registerNodeType(type, nodeClass) {
            console.log("Registering node type:", type);
        }
    }

    // Create and expose LiteGraph instance
    const LiteGraph = new LiteGraphClass();
    LiteGraph.initialize();
    
    // Make it globally available
    window.LiteGraph = LiteGraph;
    
    console.log("LiteGraph browser wrapper loaded successfully");
})();