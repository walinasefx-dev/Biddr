import type {
  PostRecord,
  FollowRecord,
  PostCommentRecord,
  LiveChatMessage,
  PostType,
  MediaType,
} from '@/types';

export type {
  PostRecord,
  FollowRecord,
  PostCommentRecord,
  LiveChatMessage,
  PostType,
  MediaType,
};

export interface CreatePostInput {
  caption?: string;
  mediaUrls: string[];
  mediaType: MediaType;
  postType: PostType;
  dropId?: string;
  sessionId?: string;
}

export interface ToggleFollowResult {
  following: boolean;
  followerCount: number;
}

export interface ToggleLikeResult {
  liked: boolean;
  likeCount: number;
}

export interface SocialFeedFilter {
  tab: 'for_you' | 'following';
  postType?: PostType | 'all';
}
