export const FREE_FINISHED_SCRIPT_BRIDGE_VERSION = 'free_finished_script_bridge_v1' as const
export const FREE_FINISHED_SCRIPT_BRIDGE_DESTINATION = '/text-to-video-shorts#try-text-to-video-mode-heading' as const
export const FREE_FINISHED_SCRIPT_BRIDGE_PLACEMENT = 'before_topic_form' as const
export const FREE_FINISHED_SCRIPT_BRIDGE_VISIBLE_RATIO = 0.35
export const FREE_FINISHED_SCRIPT_BRIDGE_GATE_PEOPLE = 10

export const FREE_FINISHED_SCRIPT_BRIDGE_METADATA = {
  version: FREE_FINISHED_SCRIPT_BRIDGE_VERSION,
  destination: 'text_to_video_finished_script',
  placement: FREE_FINISHED_SCRIPT_BRIDGE_PLACEMENT,
} as const

export const FREE_FINISHED_SCRIPT_BRIDGE_VIEW_MARKER =
  `kineo:${FREE_FINISHED_SCRIPT_BRIDGE_VERSION}:viewed`
