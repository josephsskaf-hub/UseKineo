export const PUBLISH_KIT_BUSINESS_PATH_VERSION = 'publish_kit_business_path_v1'
export const PUBLISH_KIT_BUSINESS_PATH_DESTINATION = '/business-video-content-plan'

export type PublishKitBusinessPathEvent =
  | 'publish_kit_business_path_viewed'
  | 'publish_kit_business_creator_clicked'
  | 'publish_kit_business_path_clicked'

export type PublishKitBusinessChoice = 'creator' | 'planner'

const CHOICE_CONTEXT: Record<PublishKitBusinessChoice, Readonly<{
  placement: string
  destination: string
}>> = {
  creator: {
    placement: 'post_value_primary',
    destination: 'creator_signup',
  },
  planner: {
    placement: 'post_value_secondary',
    destination: 'business_video_content_plan',
  },
}

export function shouldShowPublishKitBusinessPath(
  generatedTone: string | null,
  hasGeneratedKit: boolean,
): boolean {
  return hasGeneratedKit && generatedTone === 'business'
}

export function publishKitBusinessViewSettlement(
  stored: boolean,
): 'recorded' | 'retryable' {
  return stored ? 'recorded' : 'retryable'
}

export function publishKitBusinessPathMetadata(
  choice: PublishKitBusinessChoice,
): Readonly<Record<string, string>> {
  const context = CHOICE_CONTEXT[choice]
  if (!context) throw new Error('Unknown Publish Kit business choice')
  return {
    version: PUBLISH_KIT_BUSINESS_PATH_VERSION,
    surface: 'youtube_shorts_publish_kit',
    ...context,
  }
}
