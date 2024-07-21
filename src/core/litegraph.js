import { LGraph } from './LGraph';
import { CurveEditor } from './CurveEditor';
import { LLink } from './LLink';
import { ContextMenu } from './ContextMenu';
import { LGraphNode } from './LGraphNode';
import { LGraphEvents } from './events';
import { LGraphGroup } from './LGraphGroup';
import { DragAndScale } from './DragAndScale';
import { LGraphCanvas } from './LGraphCanvas';
import { console } from './Console';
import { PointerSettings } from './pointer_events';
import { LGraphStyles } from './styles';

// this variable name is only overridden locally.
console.level = 5;

const global = typeof (window) !== 'undefined' ? window : typeof (self) !== 'undefined' ? self : globalThis;

// *************************************************************
//   LiteGraph CLASS                                     *******
// *************************************************************

/**
     * The Global Scope. It contains all the registered node classes.
     *
     * @class LiteGraph
     * @constructor
     */

export const LiteGraph = {
  VERSION: 0.4,

  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get CANVAS_GRID_SIZE() { return LGraphStyles.CANVAS_GRID_SIZE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set CANVAS_GRID_SIZE(newValue) { LGraphStyles.CANVAS_GRID_SIZE = newValue; },

  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_TITLE_HEIGHT() { return LGraphStyles.NODE_TITLE_HEIGHT; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_TITLE_HEIGHT(newValue) { LGraphStyles.NODE_TITLE_HEIGHT = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_TITLE_TEXT_Y() { return LGraphStyles.NODE_TITLE_TEXT_Y; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_TITLE_TEXT_Y(newValue) { LGraphStyles.NODE_TITLE_TEXT_Y = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_SLOT_HEIGHT() { return LGraphStyles.NODE_SLOT_HEIGHT; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_SLOT_HEIGHT(newValue) { LGraphStyles.NODE_SLOT_HEIGHT = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_WIDGET_HEIGHT() { return LGraphStyles.NODE_WIDGET_HEIGHT; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_WIDGET_HEIGHT(newValue) { LGraphStyles.NODE_WIDGET_HEIGHT = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_WIDTH() { return LGraphStyles.NODE_WIDTH; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_WIDTH(newValue) { LGraphStyles.NODE_WIDTH = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_MIN_WIDTH() { return LGraphStyles.NODE_MIN_WIDTH; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_MIN_WIDTH(newValue) { LGraphStyles.NODE_MIN_WIDTH = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_COLLAPSED_RADIUS() { return LGraphStyles.NODE_COLLAPSED_RADIUS; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_COLLAPSED_RADIUS(newValue) { LGraphStyles.NODE_COLLAPSED_RADIUS = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_COLLAPSED_WIDTH() { return LGraphStyles.NODE_COLLAPSED_WIDTH; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_COLLAPSED_WIDTH(newValue) { LGraphStyles.NODE_COLLAPSED_WIDTH = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_TITLE_COLOR() { return LGraphStyles.NODE_TITLE_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_TITLE_COLOR(newValue) { LGraphStyles.NODE_TITLE_COLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_SELECTED_TITLE_COLOR() { return LGraphStyles.NODE_SELECTED_TITLE_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_SELECTED_TITLE_COLOR(newValue) { LGraphStyles.NODE_SELECTED_TITLE_COLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_TEXT_SIZE() { return LGraphStyles.NODE_TEXT_SIZE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_TEXT_SIZE(newValue) { LGraphStyles.NODE_TEXT_SIZE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_TEXT_COLOR() { return LGraphStyles.NODE_TEXT_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_TEXT_COLOR(newValue) { LGraphStyles.NODE_TEXT_COLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_SUBTEXT_SIZE() { return LGraphStyles.NODE_SUBTEXT_SIZE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_SUBTEXT_SIZE(newValue) { LGraphStyles.NODE_SUBTEXT_SIZE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_DEFAULT_COLOR() { return LGraphStyles.NODE_DEFAULT_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_DEFAULT_COLOR(newValue) { LGraphStyles.NODE_DEFAULT_COLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_DEFAULT_BGCOLOR() { return LGraphStyles.NODE_DEFAULT_BGCOLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_DEFAULT_BGCOLOR(newValue) { LGraphStyles.NODE_DEFAULT_BGCOLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_DEFAULT_BOXCOLOR() { return LGraphStyles.NODE_DEFAULT_BOXCOLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_DEFAULT_BOXCOLOR(newValue) { LGraphStyles.NODE_DEFAULT_BOXCOLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_DEFAULT_SHAPE() { return LGraphStyles.NODE_DEFAULT_SHAPE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_DEFAULT_SHAPE(newValue) { LGraphStyles.NODE_DEFAULT_SHAPE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_BOX_OUTLINE_COLOR() { return LGraphStyles.NODE_BOX_OUTLINE_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_BOX_OUTLINE_COLOR(newValue) { LGraphStyles.NODE_BOX_OUTLINE_COLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get DEFAULT_SHADOW_COLOR() { return LGraphStyles.DEFAULT_SHADOW_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set DEFAULT_SHADOW_COLOR(newValue) { LGraphStyles.DEFAULT_SHADOW_COLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get DEFAULT_GROUP_FONT() { return LGraphStyles.DEFAULT_GROUP_FONT; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set DEFAULT_GROUP_FONT(newValue) { LGraphStyles.DEFAULT_GROUP_FONT = newValue; },

  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get WIDGET_BGCOLOR() { return LGraphStyles.WIDGET_BGCOLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set WIDGET_BGCOLOR(newValue) { LGraphStyles.WIDGET_BGCOLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get WIDGET_OUTLINE_COLOR() { return LGraphStyles.WIDGET_OUTLINE_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set WIDGET_OUTLINE_COLOR(newValue) { LGraphStyles.WIDGET_OUTLINE_COLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get WIDGET_TEXT_COLOR() { return LGraphStyles.WIDGET_TEXT_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set WIDGET_TEXT_COLOR(newValue) { LGraphStyles.WIDGET_TEXT_COLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get WIDGET_SECONDARY_TEXT_COLOR() { return LGraphStyles.WIDGET_SECONDARY_TEXT_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set WIDGET_SECONDARY_TEXT_COLOR(newValue) { LGraphStyles.WIDGET_SECONDARY_TEXT_COLOR = newValue; },

  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get LINK_COLOR() { return LGraphStyles.LINK_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set LINK_COLOR(newValue) { LGraphStyles.LINK_COLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get EVENT_LINK_COLOR() { return LGraphStyles.EVENT_LINK_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set EVENT_LINK_COLOR(newValue) { LGraphStyles.EVENT_LINK_COLOR = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get CONNECTING_LINK_COLOR() { return LGraphStyles.CONNECTING_LINK_COLOR; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set CONNECTING_LINK_COLOR(newValue) { LGraphStyles.CONNECTING_LINK_COLOR = newValue; },

  MAX_NUMBER_OF_NODES: 1000, // avoid infinite loops
  DEFAULT_POSITION: [100, 100], // default node position

  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get VALID_SHAPES() { return LGraphStyles.VALID_SHAPES; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set VALID_SHAPES(newValue) { LGraphStyles.VALID_SHAPES = newValue; },

  // shapes are used for nodes but also for slots
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get BOX_SHAPE() { return LGraphStyles.BOX_SHAPE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set BOX_SHAPE(newValue) { LGraphStyles.BOX_SHAPE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get ROUND_SHAPE() { return LGraphStyles.ROUND_SHAPE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set ROUND_SHAPE(newValue) { LGraphStyles.ROUND_SHAPE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get CIRCLE_SHAPE() { return LGraphStyles.CIRCLE_SHAPE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set CIRCLE_SHAPE(newValue) { LGraphStyles.CIRCLE_SHAPE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get CARD_SHAPE() { return LGraphStyles.CARD_SHAPE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set CARD_SHAPE(newValue) { LGraphStyles.CARD_SHAPE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get ARROW_SHAPE() { return LGraphStyles.ARROW_SHAPE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set ARROW_SHAPE(newValue) { LGraphStyles.ARROW_SHAPE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get GRID_SHAPE() { return LGraphStyles.GRID_SHAPE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set GRID_SHAPE(newValue) { LGraphStyles.GRID_SHAPE = newValue; },

  // enums
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get INPUT() { return LGraphStyles.INPUT; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set INPUT(newValue) { LGraphStyles.INPUT = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get OUTPUT() { return LGraphStyles.OUTPUT; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set OUTPUT(newValue) { LGraphStyles.OUTPUT = newValue; },

  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get EVENT() { return LGraphStyles.EVENT; }, // for outputs
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set EVENT(newValue) { LGraphStyles.EVENT = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get ACTION() { return LGraphStyles.ACTION; }, // for inputs
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set ACTION(newValue) { LGraphStyles.ACTION = newValue; },

  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_MODES() { return LGraphStyles.NODE_MODES; }, // helper, will add "On Request" and more in the future
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_MODES(newValue) { LGraphStyles.NODE_MODES = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NODE_MODES_COLORS() { return LGraphStyles.NODE_MODES_COLORS; }, // use with node_box_coloured_by_mode
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NODE_MODES_COLORS(newValue) { LGraphStyles.NODE_MODES_COLORS = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get ALWAYS() { return LGraphStyles.ALWAYS; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set ALWAYS(newValue) { LGraphStyles.ALWAYS = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get ON_EVENT() { return LGraphStyles.ON_EVENT; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set ON_EVENT(newValue) { LGraphStyles.ON_EVENT = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NEVER() { return LGraphStyles.NEVER; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NEVER(newValue) { LGraphStyles.NEVER = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get ON_TRIGGER() { return LGraphStyles.ON_TRIGGER; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set ON_TRIGGER(newValue) { LGraphStyles.ON_TRIGGER = newValue; },

  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get LINK_RENDER_MODES() { return LGraphStyles.LINK_RENDER_MODES; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set LINK_RENDER_MODES(newValue) { LGraphStyles.LINK_RENDER_MODES = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get STRAIGHT_LINK() { return LGraphStyles.STRAIGHT_LINK; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set STRAIGHT_LINK(newValue) { LGraphStyles.STRAIGHT_LINK = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get LINEAR_LINK() { return LGraphStyles.LINEAR_LINK; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set LINEAR_LINK(newValue) { LGraphStyles.LINEAR_LINK = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get SPLINE_LINK() { return LGraphStyles.SPLINE_LINK; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set SPLINE_LINK(newValue) { LGraphStyles.SPLINE_LINK = newValue; },

  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NORMAL_TITLE() { return LGraphStyles.NORMAL_TITLE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NORMAL_TITLE(newValue) { LGraphStyles.NORMAL_TITLE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get NO_TITLE() { return LGraphStyles.NO_TITLE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set NO_TITLE(newValue) { LGraphStyles.NO_TITLE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get TRANSPARENT_TITLE() { return LGraphStyles.TRANSPARENT_TITLE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set TRANSPARENT_TITLE(newValue) { LGraphStyles.TRANSPARENT_TITLE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get AUTOHIDE_TITLE() { return LGraphStyles.AUTOHIDE_TITLE; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set AUTOHIDE_TITLE(newValue) { LGraphStyles.AUTOHIDE_TITLE = newValue; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  get VERTICAL_LAYOUT() { return LGraphStyles.VERTICAL_LAYOUT; },
  /** @deprecated */ // eslint-disable-next-line deprecation/deprecation
  set VERTICAL_LAYOUT(newValue) { LGraphStyles.VERTICAL_LAYOUT = newValue; },

  proxy: null, // used to redirect calls
  node_images_path: '',

  debug: false,
  catch_exceptions: true,
  throw_errors: true,
  allow_scripts: false, // if set to true some nodes like Formula would be allowed to evaluate code that comes from unsafe sources (like node configuration), which could lead to exploits
  use_deferred_actions: true, // executes actions during the graph execution flow
  registered_node_types: {}, // nodetypes by string
  node_types_by_file_extension: {}, // used for dropping files in the canvas
  Nodes: {}, // node types by classname
  Globals: {}, // used to store vars between graphs

  searchbox_extras: {}, // used to add extra features to the search box
  auto_sort_node_types: false, // [true!] If set to true, will automatically sort node types / categories in the context menus

  node_box_coloured_when_on: false, // [true!] this make the nodes box (top left circle) coloured when triggered (execute/action), visual feedback
  node_box_coloured_by_mode: false, // [true!] nodebox based on node mode, visual feedback

  dialog_close_on_mouse_leave: false, // [false on mobile] better true if not touch device, TODO add an helper/listener to close if false
  dialog_close_on_mouse_leave_delay: 500,

  shift_click_do_break_link_from: false, // [false!] prefer false if results too easy to break links - implement with ALT or TODO custom keys
  click_do_break_link_to: false, // [false!]prefer false, way too easy to break links

  search_hide_on_mouse_leave: true, // [false on mobile] better true if not touch device, TODO add an helper/listener to close if false
  search_filter_enabled: false, // [true!] enable filtering slots type in the search widget, !requires auto_load_slot_types or manual set registered_slot_[in/out]_types and slot_types_[in/out]
  search_show_all_on_open: true, // [true!] opens the results list when opening the search widget

  auto_load_slot_types: false, // [if want false, use true, run, get vars values to be statically set, than disable] nodes types and nodeclass association with node types need to be calculated, if dont want this, calculate once and set registered_slot_[in/out]_types and slot_types_[in/out]

  // set these values if not using auto_load_slot_types
  registered_slot_in_types: {}, // slot types for nodeclass
  registered_slot_out_types: {}, // slot types for nodeclass
  slot_types_in: [], // slot types IN
  slot_types_out: [], // slot types OUT
  slot_types_default_in: [], // specify for each IN slot type a(/many) default node(s), use single string, array, or object (with node, title, parameters, ..) like for search
  slot_types_default_out: [], // specify for each OUT slot type a(/many) default node(s), use single string, array, or object (with node, title, parameters, ..) like for search

  alt_drag_do_clone_nodes: false, // [true!] very handy, ALT click to clone and drag the new node

  do_add_triggers_slots: false, // [true!] will create and connect event slots when using action/events connections, !WILL CHANGE node mode when using onTrigger (enable mode colors), onExecuted does not need this

  allow_multi_output_for_events: true, // [false!] being events, it is strongly reccomended to use them sequentially, one by one

  middle_click_slot_add_default_node: false, // [true!] allows to create and connect a ndoe clicking with the third button (wheel)

  release_link_on_empty_shows_menu: false, // [true!] dragging a link to empty space will open a menu, add from list, search or defaults

  get pointerevents_method() { return PointerSettings.pointerevents_method; },
  set pointerevents_method(newMethod) { PointerSettings.pointerevents_method = newMethod; },

  ctrl_shift_v_paste_connect_unselected_outputs: true, // [true!] allows ctrl + shift + v to paste nodes with the outputs of the unselected nodes connected with the inputs of the newly pasted nodes

  // if true, all newly created nodes/links will use string UUIDs for their id fields instead of integers.
  // use this if you must have node IDs that are unique across all graphs and subgraphs.
  use_uuids: false,

  /**
         * Register a node class so it can be listed when the user wants to create a new one
         * @method registerNodeType
         * @param {String} type name of the node and path
         * @param {Class} base_class class containing the structure of a node
         */

  registerNodeType(type, base_class) {
    if (!base_class.prototype) {
      throw 'Cannot register a simple object, it must be a class with a prototype';
    }
    base_class.type = type;

    if (LiteGraph.debug) {
      console.log(`Node registered: ${type}`);
    }

    const classname = base_class.name;

    const pos = type.lastIndexOf('/');
    base_class.category = type.substring(0, pos);

    if (!base_class.title) {
      base_class.title = classname;
    }

    // extend class
    const propertyDescriptors = Object.getOwnPropertyDescriptors(LGraphNode.prototype);
    Object.keys(propertyDescriptors).forEach((propertyName) => {
      if (!base_class.prototype.hasOwnProperty(propertyName)) {
        Object.defineProperty(base_class.prototype, propertyName, propertyDescriptors[propertyName]);
      }
    });

    const prev = this.registered_node_types[type];
    if (prev) {
      console.log(`replacing node type: ${type}`);
    }
    if (!Object.prototype.hasOwnProperty.call(base_class.prototype, 'shape')) {
      Object.defineProperty(base_class.prototype, 'shape', {
        set(v) {
          switch (v) {
            case 'default':
              delete this._shape;
              break;
            case 'box':
              this._shape = LGraphStyles.BOX_SHAPE;
              break;
            case 'round':
              this._shape = LGraphStyles.ROUND_SHAPE;
              break;
            case 'circle':
              this._shape = LGraphStyles.CIRCLE_SHAPE;
              break;
            case 'card':
              this._shape = LGraphStyles.CARD_SHAPE;
              break;
            default:
              this._shape = v;
          }
        },
        get() {
          return this._shape;
        },
        enumerable: true,
        configurable: true,
      });

      // used to know which nodes to create when dragging files to the canvas
      if (base_class.supported_extensions) {
        for (const i in base_class.supported_extensions) {
          const ext = base_class.supported_extensions[i];
          if (ext && ext.constructor === String) {
            this.node_types_by_file_extension[ext.toLowerCase()] = base_class;
          }
        }
      }
    }

    this.registered_node_types[type] = base_class;
    if (base_class.constructor.name) {
      this.Nodes[classname] = base_class;
    }
    if (LiteGraph.onNodeTypeRegistered) {
      LiteGraph.onNodeTypeRegistered(type, base_class);
    }
    if (prev && LiteGraph.onNodeTypeReplaced) {
      LiteGraph.onNodeTypeReplaced(type, base_class, prev);
    }

    // warnings
    if (base_class.prototype.onPropertyChange) {
      console.warn(`LiteGraph node class ${type} has onPropertyChange method, it must be called onPropertyChanged with d at the end`);
    }

    // TODO one would want to know input and ouput :: this would allow through registerNodeAndSlotType to get all the slots types
    if (this.auto_load_slot_types) {
      // TODO: figure out a way to do this without instantiating a node instance.
      // new base_class(base_class.title || 'tmpnode');
    }
  },

  /**
         * removes a node type from the system
         * @method unregisterNodeType
         * @param {String|Object} type name of the node or the node constructor itself
         */
  unregisterNodeType(type) {
    const base_class = type.constructor === String
      ? this.registered_node_types[type]
      : type;
    if (!base_class) {
      throw `node type not found: ${type}`;
    }
    delete this.registered_node_types[base_class.type];
    if (base_class.constructor.name) {
      delete this.Nodes[base_class.constructor.name];
    }
  },

  /**
        * Save a slot type and his node
        * @method registerSlotType
        * @param {String|Object} type name of the node or the node constructor itself
        * @param {String} slot_type name of the slot type (variable type), eg. string, number, array, boolean, ..
        */
  registerNodeAndSlotType(type, slot_type, out) {
    out = out || false;
    const base_class = type.constructor === String
                && this.registered_node_types[type] !== 'anonymous'
      ? this.registered_node_types[type]
      : type;

    const class_type = base_class.constructor.type;

    let allTypes = [];
    if (typeof slot_type === 'string') {
      allTypes = slot_type.split(',');
    } else if (slot_type == LGraphEvents.EVENT || slot_type == LGraphEvents.ACTION) {
      allTypes = ['_event_'];
    } else {
      allTypes = ['*'];
    }

    for (let i = 0; i < allTypes.length; ++i) {
      let slotType = allTypes[i];
      if (slotType === '') {
        slotType = '*';
      }
      const registerTo = out
        ? 'registered_slot_out_types'
        : 'registered_slot_in_types';
      if (this[registerTo][slotType] === undefined) {
        this[registerTo][slotType] = { nodes: [] };
      }
      if (!this[registerTo][slotType].nodes.includes(class_type)) {
        this[registerTo][slotType].nodes.push(class_type);
      }

      // check if is a new type
      if (!out) {
        if (!this.slot_types_in.includes(slotType.toLowerCase())) {
          this.slot_types_in.push(slotType.toLowerCase());
          this.slot_types_in.sort();
        }
      } else if (!this.slot_types_out.includes(slotType.toLowerCase())) {
        this.slot_types_out.push(slotType.toLowerCase());
        this.slot_types_out.sort();
      }
    }
  },

  /**
         * Create a new nodetype by passing an object with some properties
         * like onCreate, inputs:Array, outputs:Array, properties, onExecute
         * @method buildNodeClassFromObject
         * @param {String} name node name with namespace (p.e.: 'math/sum')
         * @param {Object} object methods expected onCreate, inputs, outputs, properties, onExecute
         */
  buildNodeClassFromObject(
    name,
    object,
  ) {
    let ctor_code = '';
    if (object.inputs) {
      for (var i = 0; i < object.inputs.length; ++i) {
        var _name = object.inputs[i][0];
        var _type = object.inputs[i][1];
        if (_type && _type.constructor === String) _type = `"${_type}"`;
        ctor_code += `this.addInput('${_name}',${_type});\n`;
      }
    }
    if (object.outputs) {
      for (var i = 0; i < object.outputs.length; ++i) {
        var _name = object.outputs[i][0];
        var _type = object.outputs[i][1];
        if (_type && _type.constructor === String) _type = `"${_type}"`;
        ctor_code += `this.addOutput('${_name}',${_type});\n`;
      }
    }
    if (object.properties) {
      for (var i in object.properties) {
        let prop = object.properties[i];
        if (prop && prop.constructor === String) prop = `"${prop}"`;
        ctor_code += `this.addProperty('${i}',${prop});\n`;
      }
    }
    ctor_code += 'if(this.onCreate)this.onCreate()';
    const classobj = Function(ctor_code);
    for (var i in object) if (i != 'inputs' && i != 'outputs' && i != 'properties') classobj.prototype[i] = object[i];
    classobj.title = object.title || name.split('/').pop();
    classobj.desc = object.desc || 'Generated from object';
    this.registerNodeType(name, classobj);
    return classobj;
  },

  /**
         * Create a new nodetype by passing a function, it wraps it with a proper class and generates inputs according to the parameters of the function.
         * Useful to wrap simple methods that do not require properties, and that only process some input to generate an output.
         * @method wrapFunctionAsNode
         * @param {String} name node name with namespace (p.e.: 'math/sum')
         * @param {Function} func
         * @param {Array} param_types [optional] an array containing the type of every parameter, otherwise parameters will accept any type
         * @param {String} return_type [optional] string with the return type, otherwise it will be generic
         * @param {Object} properties [optional] properties to be configurable
         */
  wrapFunctionAsNode(
    name,
    func,
    param_types,
    return_type,
    properties,
  ) {
    const params = Array(func.length);
    let code = '';
    if (param_types !== null) // null means no inputs
    {
      const names = LiteGraph.getParameterNames(func);
      for (let i = 0; i < names.length; ++i) {
        let type = 0;
        if (param_types) {
          // type = param_types[i] != null ? "'" + param_types[i] + "'" : "0";
          if (param_types[i] != null && param_types[i].constructor === String) type = `'${param_types[i]}'`;
          else if (param_types[i] != null) type = param_types[i];
        }
        code
                        += `this.addInput('${
            names[i]
          }',${
            type
          });\n`;
      }
    }
    if (return_type !== null) // null means no output
    {
      code
                += `this.addOutput('out',${
          return_type != null ? (return_type.constructor === String ? `'${return_type}'` : return_type) : 0
        });\n`;
    }
    if (properties) {
      code
                    += `this.properties = ${JSON.stringify(properties)};\n`;
    }
    const classobj = Function(code);
    classobj.title = name.split('/').pop();
    classobj.desc = `Generated from ${func.name}`;
    classobj.prototype.onExecute = function onExecute() {
      for (let i = 0; i < params.length; ++i) {
        params[i] = this.getInputData(i);
      }
      const r = func.apply(this, params);
      this.setOutputData(0, r);
    };
    this.registerNodeType(name, classobj);
    return classobj;
  },

  /**
         * Removes all previously registered node's types
         */
  clearRegisteredTypes() {
    this.registered_node_types = {};
    this.node_types_by_file_extension = {};
    this.Nodes = {};
    this.searchbox_extras = {};
  },

  /**
         * Adds this method to all nodetypes, existing and to be created
         * (You can add it to LGraphNode.prototype but then existing node types wont have it)
         * @method addNodeMethod
         * @param {Function} func
         */
  addNodeMethod(name, func) {
    LGraphNode.prototype[name] = func;
    for (const i in this.registered_node_types) {
      const type = this.registered_node_types[i];
      if (type.prototype[name]) {
        type.prototype[`_${name}`] = type.prototype[name];
      } // keep old in case of replacing
      type.prototype[name] = func;
    }
  },

  /**
   * Create a node of a given type with a name. The node is not attached to any graph yet.
   * @method createNode
   * @param {String} type full name of the node class. p.e. "math/sin"
   * @param {String} name a name to distinguish from other nodes
   * @param {Object} options to set options
   */

  createNode(type, title, options) {
    const base_class = this.registered_node_types[type];
    if (!base_class) {
      console.warn('[LiteGraph]', '[createNode]', `GraphNode type "${type}" not registered.`);
      return null;
    }

    const prototype = base_class.prototype || base_class;

    title = title || base_class.title || type;

    let node = null;

    if (LiteGraph.catch_exceptions) {
      try {
        node = new base_class(title);
      } catch (err) {
        console.error('[LiteGraph]', '[createNode]', err);
        return null;
      }
    } else {
      node = new base_class(title);
    }

    node.type = type;

    if (!node.title && title) {
      node.title = title;
    }
    if (!node.properties) {
      node.properties = {};
    }
    if (!node.properties_info) {
      node.properties_info = [];
    }
    if (!node.flags) {
      node.flags = {};
    }
    if (!node.size) {
      node.size = node.computeSize();
      // call onresize?
    }
    if (!node.pos) {
      node.pos = LiteGraph.DEFAULT_POSITION.concat();
    }
    if (!node.mode) {
      node.mode = LGraphEvents.ALWAYS;
    }

    // extra options
    if (options) {
      for (const i in options) {
        node[i] = options[i];
      }
    }

    // callback
    if (node.onNodeCreated) {
      node.onNodeCreated();
    }

    return node;
  },

  /**
         * Returns a registered node type with a given name
         * @method getNodeType
         * @param {String} type full name of the node class. p.e. "math/sin"
         * @return {Class} the node class
         */
  getNodeType(type) {
    return this.registered_node_types[type];
  },

  /**
         * Returns a list of node types matching one category
         * @method getNodeType
         * @param {String} category category name
         * @return {Array} array with all the node classes
         */

  getNodeTypesInCategory(category, filter) {
    const r = [];
    for (const i in this.registered_node_types) {
      const type = this.registered_node_types[i];
      if (type.filter != filter) {
        continue;
      }

      if (category == '') {
        if (type.category == null) {
          r.push(type);
        }
      } else if (type.category == category) {
        r.push(type);
      }
    }

    if (this.auto_sort_node_types) {
      r.sort((a, b) => a.title.localeCompare(b.title));
    }

    return r;
  },

  /**
         * Returns a list with all the node type categories
         * @method getNodeTypesCategories
         * @param {String} filter only nodes with ctor.filter equal can be shown
         * @return {Array} array with all the names of the categories
         */
  getNodeTypesCategories(filter) {
    const categories = { '': 1 };
    for (var i in this.registered_node_types) {
      const type = this.registered_node_types[i];
      if (type.category && !type.skip_list) {
        if (type.filter != filter) continue;
        categories[type.category] = 1;
      }
    }
    const result = [];
    for (var i in categories) {
      result.push(i);
    }
    return this.auto_sort_node_types ? result.sort() : result;
  },

  // debug purposes: reloads all the js scripts that matches a wildcard
  reloadNodes(folder_wildcard) {
    const tmp = document.getElementsByTagName('script');
    // weird, this array changes by its own, so we use a copy
    const script_files = [];
    for (var i = 0; i < tmp.length; i++) {
      script_files.push(tmp[i]);
    }

    const docHeadObj = document.getElementsByTagName('head')[0];
    folder_wildcard = document.location.href + folder_wildcard;

    for (var i = 0; i < script_files.length; i++) {
      const { src } = script_files[i];
      if (
        !src
                    || src.substr(0, folder_wildcard.length) != folder_wildcard
      ) {
        continue;
      }

      try {
        if (LiteGraph.debug) {
          console.log(`Reloading: ${src}`);
        }
        const dynamicScript = document.createElement('script');
        dynamicScript.type = 'text/javascript';
        dynamicScript.src = src;
        docHeadObj.appendChild(dynamicScript);
        docHeadObj.removeChild(script_files[i]);
      } catch (err) {
        if (LiteGraph.throw_errors) {
          throw err;
        }
        if (LiteGraph.debug) {
          console.log(`Error while reloading ${src}`);
        }
      }
    }

    if (LiteGraph.debug) {
      console.log('Nodes reloaded');
    }
  },

  // separated just to improve if it doesn't work
  cloneObject(obj, target) {
    if (obj == null) {
      return null;
    }
    const r = JSON.parse(JSON.stringify(obj));
    if (!target) {
      return r;
    }

    for (const i in r) {
      target[i] = r[i];
    }
    return target;
  },

  /*
         * https://gist.github.com/jed/982883?permalink_comment_id=852670#gistcomment-852670
         */
  uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (a) => (a ^ Math.random() * 16 >> a / 4).toString(16));
  },

  /**
         * Returns if the types of two slots are compatible (taking into account wildcards, etc)
         * @method isValidConnection
         * @param {String} type_a
         * @param {String} type_b
         * @return {Boolean} true if they can be connected
         */
  isValidConnection(type_a, type_b) {
    if (type_a == '' || type_a === '*') type_a = 0;
    if (type_b == '' || type_b === '*') type_b = 0;
    if (
      !type_a // generic output
                || !type_b // generic input
                || type_a == type_b // same type (is valid for triggers)
                || (type_a == LGraphEvents.EVENT && type_b == LGraphEvents.ACTION)
    ) {
      return true;
    }

    // Enforce string type to handle toLowerCase call (-1 number not ok)
    type_a = String(type_a);
    type_b = String(type_b);
    type_a = type_a.toLowerCase();
    type_b = type_b.toLowerCase();

    // For nodes supporting multiple connection types
    if (type_a.indexOf(',') == -1 && type_b.indexOf(',') == -1) {
      return type_a == type_b;
    }

    // Check all permutations to see if one is valid
    const supported_types_a = type_a.split(',');
    const supported_types_b = type_b.split(',');
    for (let i = 0; i < supported_types_a.length; ++i) {
      for (let j = 0; j < supported_types_b.length; ++j) {
        if (this.isValidConnection(supported_types_a[i], supported_types_b[j])) {
          // if (supported_types_a[i] == supported_types_b[j]) {
          return true;
        }
      }
    }

    return false;
  },

  /**
         * Register a string in the search box so when the user types it it will recommend this node
         * @method registerSearchboxExtra
         * @param {String} node_type the node recommended
         * @param {String} description text to show next to it
         * @param {Object} data it could contain info of how the node should be configured
         * @return {Boolean} true if they can be connected
         */
  registerSearchboxExtra(node_type, description, data) {
    this.searchbox_extras[description.toLowerCase()] = {
      type: node_type,
      desc: description,
      data,
    };
  },

  /**
         * Wrapper to load files (from url using fetch or from file using FileReader)
         * @method fetchFile
         * @param {String|File|Blob} url the url of the file (or the file itself)
         * @param {String} type an string to know how to fetch it: "text","arraybuffer","json","blob"
         * @param {Function} on_complete callback(data)
         * @param {Function} on_error in case of an error
         * @return {FileReader|Promise} returns the object used to
         */
  fetchFile(url, type, on_complete, on_error) {
    const that = this;
    if (!url) return null;

    type = type || 'text';
    if (url.constructor === String) {
      if (url.substr(0, 4) == 'http' && LiteGraph.proxy) {
        url = LiteGraph.proxy + url.substr(url.indexOf(':') + 3);
      }
      return fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error('File not found'); // it will be catch below
          if (type == 'arraybuffer') return response.arrayBuffer();
          if (type == 'text' || type == 'string') return response.text();
          if (type == 'json') return response.json();
          if (type == 'blob') return response.blob();
        })
        .then((data) => {
          if (on_complete) on_complete(data);
        })
        .catch((error) => {
          console.error('error fetching file:', url);
          if (on_error) on_error(error);
        });
    }
    if (url.constructor === File || url.constructor === Blob) {
      const reader = new FileReader();
      reader.onload = function (e) {
        let v = e.target.result;
        if (type == 'json') v = JSON.parse(v);
        if (on_complete) on_complete(v);
      };
      if (type == 'arraybuffer') return reader.readAsArrayBuffer(url);
      if (type == 'text' || type == 'json') return reader.readAsText(url);
      if (type == 'blob') return reader.readAsBinaryString(url);
    }
    return null;
  },

  compareObjects(a, b) {
    for (const i in a) {
      if (a[i] != b[i]) {
        return false;
      }
    }
    return true;
  },

  distance(a, b) {
    return Math.sqrt(
      (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]),
    );
  },

  colorToString(c) {
    return (
      `rgba(${
        Math.round(c[0] * 255).toFixed()
      },${
        Math.round(c[1] * 255).toFixed()
      },${
        Math.round(c[2] * 255).toFixed()
      },${
        c.length == 4 ? c[3].toFixed(2) : '1.0'
      })`
    );
  },

  isInsideRectangle(x, y, left, top, width, height) {
    if (left < x && left + width > x && top < y && top + height > y) {
      return true;
    }
    return false;
  },

  // [minx,miny,maxx,maxy]
  growBounding(bounding, x, y) {
    if (x < bounding[0]) {
      bounding[0] = x;
    } else if (x > bounding[2]) {
      bounding[2] = x;
    }

    if (y < bounding[1]) {
      bounding[1] = y;
    } else if (y > bounding[3]) {
      bounding[3] = y;
    }
  },

  // point inside bounding box
  isInsideBounding(p, bb) {
    if (
      p[0] < bb[0][0]
              || p[1] < bb[0][1]
              || p[0] > bb[1][0]
              || p[1] > bb[1][1]
    ) {
      return false;
    }
    return true;
  },

  // bounding overlap, format: [ startx, starty, width, height ]
  overlapBounding(a, b) {
    const A_end_x = a[0] + a[2];
    const A_end_y = a[1] + a[3];
    const B_end_x = b[0] + b[2];
    const B_end_y = b[1] + b[3];

    if (
      a[0] > B_end_x
              || a[1] > B_end_y
              || A_end_x < b[0]
              || A_end_y < b[1]
    ) {
      return false;
    }
    return true;
  },

  // Convert a hex value to its decimal value - the inputted hex must be in the
  // format of a hex triplet - the kind we use for HTML colours. The function
  // will return an array with three values.
  hex2num(hex) {
    if (hex.charAt(0) == '#') {
      hex = hex.slice(1);
    } // Remove the '#' char - if there is one.
    hex = hex.toUpperCase();
    const hex_alphabets = '0123456789ABCDEF';
    const value = new Array(3);
    let k = 0;
    let int1; let
      int2;
    for (let i = 0; i < 6; i += 2) {
      int1 = hex_alphabets.indexOf(hex.charAt(i));
      int2 = hex_alphabets.indexOf(hex.charAt(i + 1));
      value[k] = int1 * 16 + int2;
      k++;
    }
    return value;
  },

  // Give a array with three values as the argument and the function will return
  // the corresponding hex triplet.
  num2hex(triplet) {
    const hex_alphabets = '0123456789ABCDEF';
    let hex = '#';
    let int1; let
      int2;
    for (let i = 0; i < 3; i++) {
      int1 = triplet[i] / 16;
      int2 = triplet[i] % 16;

      hex += hex_alphabets.charAt(int1) + hex_alphabets.charAt(int2);
    }
    return hex;
  },

  // @TODO: Obviously belongs with ContextMenu
  closeAllContextMenus(ref_window) {
    ref_window = ref_window || window;

    const elements = ref_window.document.querySelectorAll('.litecontextmenu');
    if (!elements.length) {
      return;
    }

    const result = [];
    for (var i = 0; i < elements.length; i++) {
      result.push(elements[i]);
    }

    for (var i = 0; i < result.length; i++) {
      if (result[i].close) {
        result[i].close();
      } else if (result[i].parentNode) {
        result[i].parentNode.removeChild(result[i]);
      }
    }
  },

  extendClass(target, origin) {
    // Copy static properties
    Object.getOwnPropertyNames(origin).forEach((prop) => {
      if (!target.hasOwnProperty(prop)) {
        Object.defineProperty(target, prop, Object.getOwnPropertyDescriptor(origin, prop));
      }
    });

    // Copy prototype properties
    if (origin.prototype) {
      Object.getOwnPropertyNames(origin.prototype).forEach((prop) => {
        if (!target.prototype.hasOwnProperty(prop)) {
          const descriptor = Object.getOwnPropertyDescriptor(origin.prototype, prop);
          if (descriptor.get || descriptor.set) {
            Object.defineProperty(target.prototype, prop, descriptor);
          } else {
            target.prototype[prop] = origin.prototype[prop];
          }
        }
      });
    }
  },

  // used to create nodes from wrapping functions
  getParameterNames(func) {
    return (`${func}`)
      .replace(/[/][/].*$/gm, '') // strip single-line comments
      .replace(/\s+/g, '') // strip white space
      .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments  /**/
      .split('){', 1)[0]
      .replace(/^[^(]*[(]/, '') // extract the parameters
      .replace(/=[^,]+/g, '') // strip any ES6 defaults
      .split(',')
      .filter(Boolean); // split & filter [""]
  },

  /* helper for interaction: pointer, touch, mouse Listeners used by LGraphCanvas DragAndScale ContextMenu */
  pointerListenerAdd(oDOM, sEvIn, fCall, capture = false) {
    if (!oDOM || !oDOM.addEventListener || !sEvIn || typeof fCall !== 'function') {
      console.log(`cant pointerListenerAdd ${oDOM}, ${sEvent}, ${fCall}`);
      return; // -- break --
    }

    let sMethod = LiteGraph.pointerevents_method;
    var sEvent = sEvIn;

    // UNDER CONSTRUCTION
    // convert pointerevents to touch event when not available
    if (sMethod == 'pointer' && !window.PointerEvent) {
      console.warn("sMethod=='pointer' && !window.PointerEvent");
      console.log(`Converting pointer[${sEvent}] : down move up cancel enter TO touchstart touchmove touchend, etc ..`);
      switch (sEvent) {
        case 'down': {
          sMethod = 'touch';
          sEvent = 'start';
          break;
        }
        case 'move': {
          sMethod = 'touch';
          // sEvent = "move";
          break;
        }
        case 'up': {
          sMethod = 'touch';
          sEvent = 'end';
          break;
        }
        case 'cancel': {
          sMethod = 'touch';
          // sEvent = "cancel";
          break;
        }
        case 'enter': {
          console.log('debug: Should I send a move event?'); // ??? Should you?
          break;
        }
        // case "over": case "out": not used at now
        default: {
          console.warn(`PointerEvent not available in this browser ? The event ${sEvent} would not be called`);
        }
      }
    }

    switch (sEvent) {
      // both pointer and move events
      case 'down':
      case 'up':
      case 'move':
      case 'over':
      case 'out':
      case 'enter':
        oDOM.addEventListener(sMethod + sEvent, fCall, capture);
        return;

        // only pointerevents
      case 'leave':
      case 'cancel':
      case 'gotpointercapture':
      case 'lostpointercapture':
        if (sMethod != 'mouse') {
          oDOM.addEventListener(sMethod + sEvent, fCall, capture);
          return;
        }
    }
    oDOM.addEventListener(sEvent, fCall, capture);
  },

  pointerListenerRemove(oDOM, sEvent, fCall, capture = false) {
    if (!oDOM || !oDOM.removeEventListener || !sEvent || typeof fCall !== 'function') {
      console.log(`cant pointerListenerRemove ${oDOM}, ${sEvent}, ${fCall}`);
      return;
    }
    switch (sEvent) {
      // both pointer and move events
      case 'down':
      case 'up':
      case 'move':
      case 'over':
      case 'out':
      case 'enter':
        if (LiteGraph.pointerevents_method == 'pointer' || LiteGraph.pointerevents_method == 'mouse') {
          oDOM.removeEventListener(LiteGraph.pointerevents_method + sEvent, fCall, capture);
        }
        return;

        // only pointerevents
      case 'leave':
      case 'cancel':
      case 'gotpointercapture':
      case 'lostpointercapture':
        if (LiteGraph.pointerevents_method == 'pointer') {
          oDOM.removeEventListener(LiteGraph.pointerevents_method + sEvent, fCall, capture);
        }
        return;
    }
    // not "pointer" || "mouse"
    oDOM.removeEventListener(sEvent, fCall, capture);
  },
};

export function clamp(v, a, b) {
  return a > v ? a : b < v ? b : v;
}

if (typeof window !== 'undefined' && !window.requestAnimationFrame) {
  window.requestAnimationFrame = window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || function (callback) {
      window.setTimeout(callback, 1000 / 60);
    };
}

// Bind things onto the LiteGraph object as necessary to match original:
LiteGraph.LGraph = LGraph; // OG
LiteGraph.CurveEditor = CurveEditor; // OG
LiteGraph.LLink = LLink; // OG
LiteGraph.ContextMenu = ContextMenu; // OG
LiteGraph.LGraphGroup = LGraphGroup; // OG
LiteGraph.DragAndScale = DragAndScale; // OG
LiteGraph.LGraphCanvas = LGraphCanvas;

// Bind things onto LiteGraph object as necessary to not break dep chains:

// Bind this here because otherwise LiteGraph.EVENT_LINK_COLOR doesn't resolve:
LGraphCanvas.link_type_colors = {
  '-1': LGraphStyles.EVENT_LINK_COLOR,
  number: '#AAA',
  node: '#DCA',
};

// timer that works everywhere
if (typeof performance !== 'undefined') {
  LiteGraph.getTime = performance.now.bind(performance);
} else if (typeof Date !== 'undefined' && Date.now) {
  LiteGraph.getTime = Date.now.bind(Date);
} else if (typeof process !== 'undefined') {
  LiteGraph.getTime = function () {
    const t = process.hrtime();
    return t[0] * 0.001 + t[1] * 1e-6;
  };
} else {
  LiteGraph.getTime = function getTime() {
    return new Date().getTime();
  };
}

// API *************************************************
function compareObjects(a, b) {
  for (const i in a) {
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}
LiteGraph.compareObjects = compareObjects;

function distance(a, b) {
  return Math.sqrt(
    (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]),
  );
}
LiteGraph.distance = distance;

function colorToString(c) {
  return (
    `rgba(${
      Math.round(c[0] * 255).toFixed()
    },${
      Math.round(c[1] * 255).toFixed()
    },${
      Math.round(c[2] * 255).toFixed()
    },${
      c.length == 4 ? c[3].toFixed(2) : '1.0'
    })`
  );
}
LiteGraph.colorToString = colorToString;

function isInsideRectangle(x, y, left, top, width, height) {
  if (left < x && left + width > x && top < y && top + height > y) {
    return true;
  }
  return false;
}
LiteGraph.isInsideRectangle = isInsideRectangle;

// [minx,miny,maxx,maxy]
function growBounding(bounding, x, y) {
  if (x < bounding[0]) {
    bounding[0] = x;
  } else if (x > bounding[2]) {
    bounding[2] = x;
  }

  if (y < bounding[1]) {
    bounding[1] = y;
  } else if (y > bounding[3]) {
    bounding[3] = y;
  }
}
LiteGraph.growBounding = growBounding;

// point inside bounding box
function isInsideBounding(p, bb) {
  if (
    p[0] < bb[0][0]
            || p[1] < bb[0][1]
            || p[0] > bb[1][0]
            || p[1] > bb[1][1]
  ) {
    return false;
  }
  return true;
}
LiteGraph.isInsideBounding = isInsideBounding;

// bounding overlap, format: [ startx, starty, width, height ]
function overlapBounding(a, b) {
  const A_end_x = a[0] + a[2];
  const A_end_y = a[1] + a[3];
  const B_end_x = b[0] + b[2];
  const B_end_y = b[1] + b[3];

  if (
    a[0] > B_end_x
            || a[1] > B_end_y
            || A_end_x < b[0]
            || A_end_y < b[1]
  ) {
    return false;
  }
  return true;
}
LiteGraph.overlapBounding = overlapBounding;

// Convert a hex value to its decimal value - the inputted hex must be in the
//    format of a hex triplet - the kind we use for HTML colours. The function
//    will return an array with three values.
function hex2num(hex) {
  if (hex.charAt(0) == '#') {
    hex = hex.slice(1);
  } // Remove the '#' char - if there is one.
  hex = hex.toUpperCase();
  const hex_alphabets = '0123456789ABCDEF';
  const value = new Array(3);
  let k = 0;
  let int1; let
    int2;
  for (let i = 0; i < 6; i += 2) {
    int1 = hex_alphabets.indexOf(hex.charAt(i));
    int2 = hex_alphabets.indexOf(hex.charAt(i + 1));
    value[k] = int1 * 16 + int2;
    k++;
  }
  return value;
}

LiteGraph.hex2num = hex2num;

// Give a array with three values as the argument and the function will return
//    the corresponding hex triplet.
function num2hex(triplet) {
  const hex_alphabets = '0123456789ABCDEF';
  let hex = '#';
  let int1; let
    int2;
  for (let i = 0; i < 3; i++) {
    int1 = triplet[i] / 16;
    int2 = triplet[i] % 16;

    hex += hex_alphabets.charAt(int1) + hex_alphabets.charAt(int2);
  }
  return hex;
}

LiteGraph.num2hex = num2hex;

/* LiteGraph GUI elements used for canvas editing ************************************ */

LiteGraph.closeAllContextMenus = function (ref_window) {
  ref_window = ref_window || window;

  const elements = ref_window.document.querySelectorAll('.litecontextmenu');
  if (!elements.length) {
    return;
  }

  const result = [];
  for (var i = 0; i < elements.length; i++) {
    result.push(elements[i]);
  }

  for (var i = 0; i < result.length; i++) {
    if (result[i].close) {
      result[i].close();
    } else if (result[i].parentNode) {
      result[i].parentNode.removeChild(result[i]);
    }
  }
};

LiteGraph.extendClass = function (target, origin) {
  for (var i in origin) {
    // copy class properties
    if (target.hasOwnProperty(i)) {
      continue;
    }
    target[i] = origin[i];
  }

  if (origin.prototype) {
    // copy prototype properties
    for (var i in origin.prototype) {
      // only enumerable
      if (!origin.prototype.hasOwnProperty(i)) {
        continue;
      }

      if (target.prototype.hasOwnProperty(i)) {
        // avoid overwriting existing ones
        continue;
      }

      // copy getters
      if (origin.prototype.__lookupGetter__(i)) {
        target.prototype.__defineGetter__(
          i,
          origin.prototype.__lookupGetter__(i),
        );
      } else {
        target.prototype[i] = origin.prototype[i];
      }

      // and setters
      if (origin.prototype.__lookupSetter__(i)) {
        target.prototype.__defineSetter__(
          i,
          origin.prototype.__lookupSetter__(i),
        );
      }
    }
  }
};

// used to create nodes from wrapping functions
LiteGraph.getParameterNames = function (func) {
  return (`${func}`)
    .replace(/[/][/].*$/gm, '') // strip single-line comments
    .replace(/\s+/g, '') // strip white space
    .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments  /**/
    .split('){', 1)[0]
    .replace(/^[^(]*[(]/, '') // extract the parameters
    .replace(/=[^,]+/g, '') // strip any ES6 defaults
    .split(',')
    .filter(Boolean); // split & filter [""]
};

global.clamp = clamp;
