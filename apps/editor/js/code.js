
import { LiteGraph } from "../../../src/litegraph.js";
import { Editor } from "../../../src/litegraph-editor.js";
import { fetchExampleManifest, exampleGroups, fillDemoSelect } from "./examples.js";

export var gl = null; // webgl_canvas

// remove to prevent access from the console (why should?)
// if (typeof(global)=="object") global.LiteGraph = LiteGraph;
// if (typeof(window)=="object") window.LiteGraph = LiteGraph;

LiteGraph.log_info("LiteGraph included");
LiteGraph.initialize();

var webgl_canvas = null;

LiteGraph.node_images_path = "../nodes_data/";

var editor = new Editor("main",{miniwindow:false});
window.graphcanvas = editor.graphcanvas;
window.graph = editor.graph;
updateEditorHiPPICanvas();
window.addEventListener("resize", function() { 
 	editor.graphcanvas.resize();
  	updateEditorHiPPICanvas();
});
//window.addEventListener("keydown", editor.graphcanvas.processKey.bind(editor.graphcanvas) );
window.onbeforeunload = function(){
	var data = JSON.stringify( graph.serialize() );
	localStorage.setItem("litegraphg demo backup", data );
}

function updateEditorHiPPICanvas() {
  	const ratio = window.devicePixelRatio;
  	if(ratio == 1) { 
		return 
	}
  	const rect = editor.canvas.parentNode.getBoundingClientRect();
  	const { width, height } = rect;
  	editor.canvas.width = width * ratio;
  	editor.canvas.height = height * ratio;
  	editor.canvas.style.width = width + "px";
  	editor.canvas.style.height = height + "px";
  	editor.canvas.getContext("2d").scale(ratio, ratio);
  	return editor.canvas;
}

// allow_scripts is decided by js/defaults.js (on for the default page, off for the mobile and
// event_based presets); do not set it here, this script runs after the presets.

//test
//editor.graphcanvas.viewport = [200,200,400,400];

var dom_demo_select;

window.addEventListener("load", (event) => {
		
	//create scene selector
	var elem = document.createElement("span");
	elem.id = "LGEditorTopBarSelector";
	elem.className = "selector";
	elem.innerHTML = "";
	elem.innerHTML += "Demo <select><option>Empty</option></select> <button class='btn' id='save'>Save</button><button class='btn' id='load'>Load</button><button class='btn' id='download'>Download</button> | <button class='btn' id='webgl'>WebGL</button> <button class='btn' id='multiview'>Multiview</button>";
	editor.tools.appendChild(elem);
	dom_demo_select = elem.querySelector("select");
	dom_demo_select.addEventListener("change", function(e){
		var option = this.options[this.selectedIndex];
		var url = option.dataset["url"];
		
		if(url){
			LiteGraph.log_info("Editor:","Loading",url);
			graph.load( url );
		}else if(option.exampleData){
			LiteGraph.log_info("Editor:","Loading pack template",option.dataset["example"]);
			graph.configure( option.exampleData );
		}else if(option.callback){
			LiteGraph.log_info("Editor:","callback");
			option.callback();
		}else{
			LiteGraph.log_info("Editor:","Clearing");
			graph.clear();
			graph.markSaved?.();
		}
	});

	elem.querySelector("#save").addEventListener("click",function(){
		console.log?.("saved");
		localStorage.setItem( "graphdemo_save", JSON.stringify( graph.serialize() ) );
		graph.markSaved?.();
	});

	elem.querySelector("#load").addEventListener("click",function(){
		var data = localStorage.getItem( "graphdemo_save" );
		if(data)
			graph.configure( JSON.parse( data ) );
		console.log?.("loaded");
	});

	elem.querySelector("#download").addEventListener("click",function(){
		var data = JSON.stringify( graph.serialize() );
		var file = new Blob( [ data ] );
		var url = URL.createObjectURL( file );
		var element = document.createElement("a");
		element.setAttribute('href', url);
		element.setAttribute('download', "graph.JSON" );
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
		graph.markSaved?.();
		setTimeout( function(){ URL.revokeObjectURL( url ); }, 1000*60 ); //wait one minute to revoke url	
	});

	elem.querySelector("#webgl").addEventListener("click", enableWebGL );
	var is_multi_view = false;
	elem.querySelector("#multiview").addEventListener("click", function(){
		if(!is_multi_view){
			editor.toggleMultiview();
			is_multi_view = true;
		}else{
			// toggling
			editor.toggleMultiview(); //removeMultiView();
			is_multi_view = false;
		}
	} );

	// the examples library (examples/index.json) and the active packs' templates, grouped by category;
	// the example files keep their paths, so old links to them still work
	fetchExampleManifest("examples/").then((manifest) => {
		fillDemoSelect(dom_demo_select, exampleGroups(manifest, LiteGraph.packs?.listTemplates?.() ?? []));
	}).catch((error) => LiteGraph.log_warn("Editor:", "examples manifest not loaded", error));
	addDemo("autobackup", function(){
		var data = localStorage.getItem("litegraphg demo backup");
		if(!data)
			return;
		var graph_data = JSON.parse(data);
		graph.configure( graph_data );
	});
});

function addDemo( name, url ) {
	var option = document.createElement("option");
	if(url.constructor === String)
		option.dataset["url"] = url;
	else
		option.callback = url;
	option.innerHTML = name;
	if(dom_demo_select) dom_demo_select.appendChild( option );
	LiteGraph.log_info("Editor:","Add demo",name,url);
}


//allows to use the WebGL nodes like textures
let webgl_setup = null;
function enableWebGL() {
	if( webgl_canvas ) {
		webgl_canvas.style.display = (webgl_canvas.style.display == "none" ? "block" : "none");
		return Promise.resolve(gl);
	}
	// a second click while the libraries are still loading must not set up twice
	webgl_setup ??= setupWebGL().finally(() => { if(!gl) webgl_setup = null; });
	return webgl_setup;
}

async function setupWebGL() {
	// gl-matrix is a classic script every editor page loads before the modules
	if( typeof glMatrix == "undefined" ) {
		LiteGraph.log_warn("Editor:","WebGL needs gl-matrix (vendor/gl-matrix-min.js) loaded first");
		return null;
	}
	let GL;
	try {
		({ GL } = await import("../../../vendor/litegl.js"));
	} catch (error) {
		LiteGraph.log_error("Editor:","could not load litegl",error);
		return null;
	}

	const canvas = document.createElement("canvas");
	canvas.width = 400;
	canvas.height = 300;
	canvas.style.position = "absolute";
	canvas.style.top = "0px";
	canvas.style.right = "0px";
	canvas.style.border = "1px solid #AAA";
	canvas.addEventListener("click", function() {
		var rect = canvas.parentNode.getBoundingClientRect();
		if( canvas.width != rect.width ) {
			canvas.width = rect.width;
			canvas.height = rect.height;
		}
		else {
			canvas.width = 400;
			canvas.height = 300;
		}
	});

	let context = null;
	try {
		context = GL.create({ canvas: canvas }); // throws when WebGL is unavailable
	} catch (error) {
		LiteGraph.log_warn("Editor:","WebGL is not available in this browser",error);
		return null;
	}
	if( !context ) {
		LiteGraph.log_warn("Editor:","WebGL is not available in this browser");
		return null;
	}
	gl = context;
	webgl_canvas = canvas;
	// lets modules that loaded before litegl (geometry.js) register their WebGL nodes
	window.dispatchEvent(new Event("litegl:ready"));
	(document.querySelector(".editor-area") || document.body).appendChild( canvas );

	// module paths resolve from this file (editor/js/)
	for( const lib of [
		"../../../src/nodes/gltextures.js",
		"../../../src/nodes/glfx.js",
		"../../../src/nodes/glshaders.js",
		"../../../src/nodes/geometry.js",
	] ) {
		try {
			await import(lib);
		} catch (error) {
			LiteGraph.log_error("Editor:","could not load",lib,error);
		}
	}

	editor.graph.onBeforeStep = () => {
		gl.clearColor(0,0,0,0);
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
		gl.viewport(0,0,gl.canvas.width, gl.canvas.height );
	}

	LiteGraph.log_info("Editor:","WebGL ready");
	return gl;
}

// Tests
// CopyPasteWithConnectionToUnselectedOutputTest();
// demo();