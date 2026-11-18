import { LiteGraph } from "../litegraph.js";

export let registerExtension_keyhelper = function(graphcanvas){

    // enable only if debugging CallbackHandler itself
    // graphcanvas.cb_handler.debug = true;

    // oCbInfo is first passed parameter and contains infos about the event execution chain 
    let ext = "key_helper";
    let debug = false;

    // onKeyDown
    graphcanvas.registerCallbackHandler("onKeyDown",function(oCbInfo, keyEvent){
        if(debug) console.info(ext, "*** onKeyDown handler ***",...arguments);

        let nSel = Object.keys(graphcanvas.selected_nodes).length;
        var aNodesFrom = [];
        var nodeX = false;
        var return_value = null;
        let moved = false;
        if(nSel){
            for(let iO in graphcanvas.selected_nodes){
                aNodesFrom.push(graphcanvas.selected_nodes[iO]);
            }
            nodeX = aNodesFrom[0];
        }

        switch(keyEvent.keyCode){
            case 39: //ArrowRight
                if(nSel){

                    // ---- ADD NEW NODE CONNECTED TO SELECTED ONE  ----
                    if(keyEvent.shiftKey || keyEvent.ctrlKey){

                        // skip from second event on
                        if(keyEvent.repeat){
                            return;
                        }

                        // simulate position via event (little hack, should implement that on prompt itself)
                        /* const mouseCoord = graphcanvas.getMouseCoordinates();
                        const gloCoord = graphcanvas.convertOffsetToEditorArea(mouseCoord);
                        // need prompt to be absolute positioned relative to editor-area that needs relative positioning
                        keyEvent.clientX = gloCoord[0];
                        keyEvent.clientY = gloCoord[1]; */
                        const gloCoord = graphcanvas.convertOffsetToEditorArea(nodeX.pos);
                        keyEvent.clientX = gloCoord[0] + nodeX.size[0] + 33;
                        keyEvent.clientY = gloCoord[1];
                        keyEvent.canvasX = nodeX.pos[0] + nodeX.size[0] + 33;
                        keyEvent.canvasY = nodeX.pos[1];

                        if(nodeX.outputs && nodeX.outputs[0]){
                            if(keyEvent.shiftKey){
                                if(debug) console.debug(ext, "dbg: show search (using first slot)", nodeX, keyEvent);
                                graphcanvas.showSearchBox(keyEvent, {node_from: nodeX, slot_from: nodeX.outputs[0], type_filter_in: nodeX.outputs[0].type});
                            }else if(keyEvent.ctrlKey){
                                if(debug) console.debug(ext, "dbg: show connection menu (using first slot)", nodeX, keyEvent);
                                graphcanvas.showConnectionMenu({nodeFrom: nodeX, slotFrom: nodeX.outputs[0], e: keyEvent, isCustomEvent: true});
                            }
                        }else{
                            if(debug) console.debug(ext, "dbg: no output for node");
                        }
                        
                    }else{

                        // move nodes right
                        for(let iN=0;iN<aNodesFrom.length;iN++){
                            aNodesFrom[iN].alignToGrid();
                            aNodesFrom[iN].pos[0] += LiteGraph.CANVAS_GRID_SIZE;
                            moved = true;
                            aNodesFrom[iN].processCallbackHandlers("onMoved",{
                                def_cb: aNodesFrom[iN].onMoved
                            });
                        }

                    }

                }
            break;
            case 37: // ArrowLeft
                // move nodes left
                if(nSel){
                    for(let iN=0;iN<aNodesFrom.length;iN++){
                        aNodesFrom[iN].alignToGrid();
                        aNodesFrom[iN].pos[0] -= LiteGraph.CANVAS_GRID_SIZE;
                        moved = true;
                            aNodesFrom[iN].processCallbackHandlers("onMoved",{
                            def_cb: aNodesFrom[iN].onMoved
                        });
                    }
                }
            break;
            case 38: // ArrowUp
                if(nSel){
                    // move nodes up
                    // check if ctrlKey
                    if(keyEvent.ctrlKey){
                        // ---- select sibiling node, adding if shift ----
                        // skip from second event on
                        if(keyEvent.repeat){
                            return;
                        }
                        if(nodeX.inputs && nodeX.inputs.length){
                            const parentNode = nodeX.getInputNode(0);
                            if(!parentNode) return;
                            let found = false;
                            let foundNode = false;
                            for(let iO=parentNode.outputs.length-1; iO>=0; iO--){
                                let outNodes = parentNode.getOutputNodes(iO);
                                if(!outNodes) continue;
                                for(let ioN=outNodes.length-1; ioN>=0; ioN--){
                                    if(found){
                                        // found prev cycle
                                        foundNode = outNodes[ioN];
                                        break;
                                    }
                                    if(nodeX.id === outNodes[ioN].id){
                                        found = true;
                                        // will get next in cycle
                                    }
                                }
                                if(found){
                                    break;
                                }
                            }
                            if(foundNode){
                                if(keyEvent.shiftKey){
                                    graphcanvas.selectNode(foundNode, true);
                                }else{
                                    graphcanvas.selectNodes([foundNode]);
                                }
                            }
                        }
                    }else{
                        for(let iN=0;iN<aNodesFrom.length;iN++){
                            aNodesFrom[iN].alignToGrid();
                            aNodesFrom[iN].pos[1] -= LiteGraph.CANVAS_GRID_SIZE;
                            moved = true;
                            aNodesFrom[iN].processCallbackHandlers("onMoved",{
                                def_cb: aNodesFrom[iN].onMoved
                            });
                        }
                    }
                }
            break;
            case 40: // ArrowDown
                if(nSel){
                    // check if ctrlKey
                    if(keyEvent.ctrlKey){
                        // ---- select sibiling node, adding if shift ----
                        // skip from second event on
                        if(keyEvent.repeat){
                            return;
                        }
                        if(nodeX.inputs && nodeX.inputs.length){
                            const parentNode = nodeX.getInputNode(0);
                            if(!parentNode) return;
                            let found = false;
                            let foundNode = false;
                            for(let iO in parentNode.outputs){
                                let outNodes = parentNode.getOutputNodes(iO);
                                if(!outNodes) continue;
                                for(let ioN in outNodes){
                                    if(found){
                                        // found prev cycle
                                        foundNode = outNodes[ioN];
                                        break;
                                    }
                                    if(nodeX.id === outNodes[ioN].id){
                                        found = true;
                                        // will get next in cycle
                                    }
                                }
                                if(found){
                                    break;
                                }
                            }
                            if(foundNode){
                                if(keyEvent.shiftKey){
                                    graphcanvas.selectNode(foundNode, true);
                                }else{
                                    graphcanvas.selectNodes([foundNode]);
                                }
                            }
                        }
                    }else{
                        // move nodes down
                        for(let iN=0;iN<aNodesFrom.length;iN++){
                            aNodesFrom[iN].alignToGrid();
                            aNodesFrom[iN].pos[1] += LiteGraph.CANVAS_GRID_SIZE;
                            moved = true;
                            aNodesFrom[iN].processCallbackHandlers("onMoved",{
                                def_cb: aNodesFrom[iN].onMoved
                            });
                        }
                    }
                }
            break;
            case 9: // TAB
                // next node (connected to selected, or previous w shift)
                if(nSel){
                    let nextNode = false;
                    if(keyEvent.shiftKey){
                        if(nodeX.inputs && nodeX.inputs.length && nodeX.inputs[0].link && nodeX.inputs[0].link!==null){
                            nextNode = nodeX.getInputNode(0);
                            graphcanvas.selectNodes([nextNode]);
                        }
                    }else{
                        if(nodeX.outputs && nodeX.outputs.length && nodeX.outputs[0].links && nodeX.outputs[0].links.length){
                            nextNode = nodeX.getOutputNodes(0)[0];
                            graphcanvas.selectNodes([nextNode]);
                        }
                    }
                    return_value = true;
                }
            break;
            case 70: // F
                // focus on node
                if(nSel){
                    graphcanvas.centerOnNode(nodeX);
                    // TODO graphcanvas.centerOnSelection();
                }else{
                    graphcanvas.recenter();
                }
            break;
            default:
                if(debug) console.debug(ext, "dbg: ignore",keyEvent.keyCode);
            break;
        }

        if (moved) graphcanvas.graph?.onGraphChanged({action: "keyboardMove"}); // undoable

        return {
            return_value: return_value,
            //prevent_default: true,
            //stop_replication: true
        };
    });

}

if(typeof(graphcanvas)!=="undefined"){
    registerExtension_keyhelper(graphcanvas);
}

LiteGraph.registerCallbackHandler("on_lgraphcanvas_construct",function(oCbInfo, graphcanvas){
    registerExtension_keyhelper(graphcanvas);
});