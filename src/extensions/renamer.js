import { LiteGraph } from "../litegraph.js";

export let registerExtension_renamer = function(graphcanvas){

    // enable only if debugging CallbackHandler itself
    // graphcanvas.cb_handler.debug = true;

    // oCbInfo is first passed parameter and contains infos about the event execution chain 

    let ext = "renamer";
    let debug = false;

    // onKeyDown
    graphcanvas.registerCallbackHandler("onKeyDown",function(oCbInfo, keyEvent){
        if(debug) console.info(ext, "*** renamer onKeyDown handler ***",...arguments);
        switch(keyEvent.keyCode){
            case 113: { // F2
                
                // skip from second event on
                if(keyEvent.repeat){
                    return;
                }

                // check selected nodes
                let nSel = Object.keys(graphcanvas.selected_nodes).length;
                
                // simulate position via event (little hack, should implement that on prompt itself)
                const mouseCoord = graphcanvas.getMouseCoordinates();
                const gloCoord = graphcanvas.convertOffsetToEditorArea(mouseCoord);
                // need prompt to be absolute positioned relative to editor-area that needs relative positioning
                keyEvent.clientX = gloCoord[0];
                keyEvent.clientY = gloCoord[1];

                if(nSel){

                    // get actual title
                    let actT = nSel == 1
                                ? graphcanvas.selected_nodes[Object.keys(graphcanvas.selected_nodes)[0]].title
                                : "titleForMany";
                    
                    // set update function
                    const fCB = function(tIn){
                        for(let iN in graphcanvas.selected_nodes){
                            graphcanvas.selected_nodes[iN].title = tIn;
                        }
                    }
                    
                    // open prompt
                    graphcanvas.prompt(
                        "Title",actT,fCB,keyEvent //,w.options ? w.options.multiline : false,
                    );

                }else{
                    
                    // check is over Group (Note)
                    const groupOver = graphcanvas.graph.getGroupOnPos( mouseCoord[0], mouseCoord[1] );
                    if(groupOver){
                        if(debug) console.warn(ext, "dbg: group to rename",groupOver);
                        // set update function
                        const fCB = function(tIn){
                            groupOver.title = tIn;
                        }
                        // open prompt
                        graphcanvas.prompt(
                            "Title",groupOver.title,fCB,keyEvent //,w.options ? w.options.multiline : false,
                        );
                    }else{

                        if(debug) console.warn(ext, "dbg: nothing to rename");

                    }
                }
            break;
            }
            default:
                if(debug) console.debug("dbg: ignore key",keyEvent.keyCode);
            break;
        }
    });

}

if(typeof(graphcanvas)!=="undefined"){
    registerExtension_renamer(graphcanvas);
}

LiteGraph.registerCallbackHandler("on_lgraphcanvas_construct",function(oCbInfo, graphcanvas){
    registerExtension_renamer(graphcanvas);
});