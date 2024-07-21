export const LGraphEvents = {
  INPUT: 1,
  OUTPUT: 2,

  EVENT: -1, // for outputs
  ACTION: -1, // for inputs

  NODE_MODES: ['Always', 'On Event', 'Never', 'On Trigger'], // helper, will add "On Request" and more in the future
  NODE_MODES_COLORS: ['#666', '#422', '#333', '#224', '#626'], // use with node_box_coloured_by_mode
  ALWAYS: 0,
  ON_EVENT: 1,
  NEVER: 2,
  ON_TRIGGER: 3,
};
