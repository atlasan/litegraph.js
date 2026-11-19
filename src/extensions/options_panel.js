// --- WIP --- extracted and cleaned from library
// this is more a demo and a dev and debugging tool
// giving ability to show and edit graphcanvas options


import { LiteGraph } from "../litegraph.js";
import { LGraphCanvas } from "../lgraphcanvas.js";


LiteGraph.showCanvasOptions = true; // [true!] customize availableCanvasOptions
LiteGraph.availableCanvasOptions = [
    "allow_addOutSlot_onExecuted",
    "free_resize",  
    "highquality_render",
    "use_gradients", // set to true to render titlebar with gradients
    "pause_rendering",
    "clear_background",
    "read_only", // if set to true users cannot modify the graph
    // "render_only_selected", // not implemented
    "live_mode",
    "show_info",
    "allow_dragcanvas",
    "allow_dragnodes",
    "allow_interaction", // allow to control widgets, buttons, collapse, etc
    "allow_searchbox",
    "move_destination_link_without_shift", // rename: old allow_reconnect_links //allows to change a connection, no need to hold shift
    "set_canvas_dirty_on_mouse_event", // forces to redraw the canvas if the mouse does anything
    "always_render_background",
    "render_shadows",
    "render_canvas_border",
    "render_connections_shadows", // too much cpu
    "render_connections_border",
    // ,"render_curved_connections", // always on, or specific fixed graph
    "render_connection_arrows",
    "render_collapsed_slots",
    "render_execution_order",
    "render_title_colored",
    "render_link_tooltip",
];


// ---- IMPLEMENT in getCanvasMenuOptions ----
// if (LiteGraph.showCanvasOptions) {
//     options.push({ content: "Options", callback: this.showShowGraphOptionsPanel });
// }

// ---- IMPLEMENT in processKey ----
// if(this.options_panel) this.options_panel.close();



LGraphCanvas.showShowGraphOptionsPanel = function(refOpts, obEv) {
    let graphcanvas;
    if(this.constructor && this.constructor.name == "HTMLDivElement") {
        // assume coming from the menu event click
        if (! obEv?.event?.target?.lgraphcanvas) {
            LiteGraph.log_warn("References not found to add optionPanel",refOpts, obEv); // need a ref to canvas obj
            if (LiteGraph.debug)
                LiteGraph.log_debug("!obEv || !obEv.event || !obEv.event.target || !obEv.event.target.lgraphcanvas",obEv,obEv.event,obEv.event.target,obEv.event.target.lgraphcanvas);
            return;
        }
        graphcanvas = obEv.event.target.lgraphcanvas;
    }else{
        // assume called internally
        graphcanvas = this;
    }
    graphcanvas.closePanels();
    var ref_window = graphcanvas.getCanvasWindow();
    var panel = graphcanvas.createPanel("Options",{
        closable: true,
        window: ref_window,
        onOpen: function() {
            graphcanvas.OPTIONPANEL_IS_OPEN = true;
        },
        onClose: function() {
            graphcanvas.OPTIONPANEL_IS_OPEN = false;
            graphcanvas.options_panel = null;
        },
    });
    graphcanvas.options_panel = panel;
    panel.id = "option-panel";
    panel.classList.add("settings");

    function inner_refresh() {

        panel.content.innerHTML = ""; // clear

        const fUpdate = (name, value, options) => {
            switch(name) {
                /* case "Render mode":
                    // Case ""..
                    if (options.values && options.key){
                        var kV = Object.values(options.values).indexOf(value);
                        if (kV>=0 && options.values[kV]){
                            LiteGraph.log_debug("update graph options: "+options.key+": "+kV);
                            graphcanvas[options.key] = kV;
                            //LiteGraph.log_debug(graphcanvas);
                            break;
                        }
                    }
                    LiteGraph.log_warn("unexpected options");
                    LiteGraph.log_debug(options);
                    break;*/
                default:
                    // LiteGraph.log_debug("want to update graph options: "+name+": "+value);
                    if (options && options.key) {
                        name = options.key;
                    }
                    if (options.values) {
                        value = Object.values(options.values).indexOf(value);
                    }
                    // LiteGraph.log_debug("update graph option: "+name+": "+value);
                    graphcanvas[name] = value;
                    break;
            }
        };

        // panel.addWidget( "string", "Graph name", "", {}, fUpdate); // implement

        var aProps = LiteGraph.availableCanvasOptions;
        aProps.sort();
        for(var pI in aProps) {
            var pX = aProps[pI];
            panel.addWidget( "boolean", pX, graphcanvas[pX], {key: pX, on: "True", off: "False"}, fUpdate);
        }

        panel.addWidget( "combo", "Render mode", LiteGraph.LINK_RENDER_MODES[graphcanvas.links_render_mode], {key: "links_render_mode", values: LiteGraph.LINK_RENDER_MODES}, fUpdate);

        panel.addSeparator();

        panel.footer.innerHTML = ""; // clear

    }
    inner_refresh();

    graphcanvas.canvas.parentNode.appendChild( panel );
}
