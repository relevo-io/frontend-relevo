export type AssistantMode = 'PUBLIC' | 'AUTHENTICATED';

export interface AssistantChatRequest {
  message: string;
}

export interface AssistantSource {
  kind: 'PLATFORM_INFO' | 'OFFER';
  sourceId: string;
  title: string;
}

export interface AssistantChatResponse {
  answer: string;
  mode: AssistantMode;
  sources: AssistantSource[];
}
