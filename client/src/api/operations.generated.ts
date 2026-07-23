/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '../types/types.generated';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type ChatPositionInput = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type ReactionKind =
  | 'CELEBRATE'
  | 'CONFUSED'
  | 'HEART'
  | 'LAUGH'
  | 'RAISE_HAND';

export type UserInput = {
  id: string;
  lastCardPicked?: string | null | undefined;
  roomName?: string | null | undefined;
  username: string;
};

export type UserFragmentFragment = { id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean };

export type DeckFragmentFragment = { id: string, cards: Array<string> };

export type UserCardFragmentFragment = { userId: string, card: string | null };

export type GameFragmentFragment = { id: string, table: Array<{ userId: string, card: string | null }> };

export type ChatPositionFragmentFragment = { x: number, y: number, width: number, height: number };

export type ChatMessageFragmentFragment = { id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null };

export type RoomFragmentFragment = { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> };

export type RoomEventFragmentFragment = { roomId: string, eventType: string, targetUserId: string | null, room: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type RoomReactionFragmentFragment = { id: string, roomId: string, userId: string, reaction: Types.ReactionKind };

export type CreateRoomMutationVariables = Exact<{
  roomId?: string | null | undefined;
  name?: string | null | undefined;
  cards: Array<string> | string;
}>;


export type CreateRoomMutation = { createRoom: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type CreateUserMutationVariables = Exact<{
  username: string;
}>;


export type CreateUserMutation = { createUser: { id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean } };

export type JoinRoomMutationVariables = Exact<{
  roomId: string;
  user: Types.UserInput;
  roomOwnerId?: string | null | undefined;
}>;


export type JoinRoomMutation = { joinRoom: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type UpdateDeckMutationVariables = Exact<{
  roomId: string;
  cards: Array<string> | string;
}>;


export type UpdateDeckMutation = { updateDeck: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type RenameRoomMutationVariables = Exact<{
  roomId: string;
  name?: string | null | undefined;
}>;


export type RenameRoomMutation = { renameRoom: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type ToggleCountdownOptionMutationVariables = Exact<{
  roomId: string;
  enabled: boolean;
}>;


export type ToggleCountdownOptionMutation = { toggleCountdownOption: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type StartRevealCountdownMutationVariables = Exact<{
  roomId: string;
  userId?: string | null | undefined;
}>;


export type StartRevealCountdownMutation = { startRevealCountdown: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type CancelRevealCountdownMutationVariables = Exact<{
  roomId: string;
  userId?: string | null | undefined;
}>;


export type CancelRevealCountdownMutation = { cancelRevealCountdown: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type SetRoomOwnerMutationVariables = Exact<{
  roomId: string;
  userId?: string | null | undefined;
}>;


export type SetRoomOwnerMutation = { setRoomOwner: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type EditUserMutationVariables = Exact<{
  userId: string;
  username: string;
}>;


export type EditUserMutation = { editUser: { id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean } };

export type LogoutMutationVariables = Exact<{
  userId: string;
}>;


export type LogoutMutation = { logout: boolean };

export type PickCardMutationVariables = Exact<{
  userId: string;
  roomId: string;
  card: string;
}>;


export type PickCardMutation = { pickCard: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type ShowCardsMutationVariables = Exact<{
  roomId: string;
}>;


export type ShowCardsMutation = { showCards: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type ResetGameMutationVariables = Exact<{
  roomId: string;
}>;


export type ResetGameMutation = { resetGame: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type KickUserMutationVariables = Exact<{
  roomId: string;
  targetUserId: string;
}>;


export type KickUserMutation = { kickUser: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type BanUserMutationVariables = Exact<{
  roomId: string;
  targetUserId: string;
}>;


export type BanUserMutation = { banUser: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type UnbanUserMutationVariables = Exact<{
  roomId: string;
  targetUserId: string;
}>;


export type UnbanUserMutation = { unbanUser: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type ToggleConfirmNewGameMutationVariables = Exact<{
  roomId: string;
  enabled: boolean;
}>;


export type ToggleConfirmNewGameMutation = { toggleConfirmNewGame: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type ToggleShowVoteChangesMutationVariables = Exact<{
  roomId: string;
  enabled: boolean;
}>;


export type ToggleShowVoteChangesMutation = { toggleShowVoteChanges: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type ToggleCensorVotesMutationVariables = Exact<{
  roomId: string;
  enabled: boolean;
}>;


export type ToggleCensorVotesMutation = { toggleCensorVotes: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type SetVoteUncensoredMutationVariables = Exact<{
  roomId: string;
  userId: string;
  uncensored: boolean;
}>;


export type SetVoteUncensoredMutation = { setVoteUncensored: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type SendChatMessageMutationVariables = Exact<{
  roomId: string;
  userId: string;
  username: string;
  content: string;
  formattedContent?: string | null | undefined;
  contentType: string;
  position?: Types.ChatPositionInput | null | undefined;
}>;


export type SendChatMessageMutation = { sendChatMessage: { id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null } };

export type MarkChatSeenMutationVariables = Exact<{
  roomId: string;
  userId: string;
}>;


export type MarkChatSeenMutation = { markChatSeen: { id: string, hasUnreadChat: boolean | null } };

export type SendReactionMutationVariables = Exact<{
  roomId: string;
  userId: string;
  reaction: Types.ReactionKind;
}>;


export type SendReactionMutation = { sendReaction: { id: string, roomId: string, userId: string, reaction: Types.ReactionKind } };

export type RoomSubscriptionVariables = Exact<{
  roomId: string;
}>;


export type RoomSubscription = { room: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } };

export type RoomChatSubscriptionVariables = Exact<{
  roomId: string;
}>;


export type RoomChatSubscription = { roomChat: { id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null } };

export type RoomEventsSubscriptionVariables = Exact<{
  roomId: string;
}>;


export type RoomEventsSubscription = { roomEvents: { roomId: string, eventType: string, targetUserId: string | null, room: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } } };

export type RoomReactionsSubscriptionVariables = Exact<{
  roomId: string;
}>;


export type RoomReactionsSubscription = { roomReactions: { id: string, roomId: string, userId: string, reaction: Types.ReactionKind } };

export type RoomUnreadSubscriptionVariables = Exact<{
  roomId: string;
  userId: string;
}>;


export type RoomUnreadSubscription = { room: { id: string, hasUnreadChat: boolean | null } };

export type GetRoomQueryVariables = Exact<{
  roomId: string;
}>;


export type GetRoomQuery = { roomById: { id: string, name: string | null, isGameOver: boolean, roomOwnerId: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage: string | null, countdownValue: number | null, confirmNewGame: boolean, showVoteChanges: boolean, censorVotes: boolean, users: Array<{ id: string, username: string, lastCardPicked: string | null, lastCardValue: number | null, previousCardPicked: string | null, previousCardValue: number | null, lastSeenChatMessageId: string | null, handRaised: boolean, voteUncensored: boolean }>, deck: { id: string, cards: Array<string> }, game: { id: string, table: Array<{ userId: string, card: string | null }> }, chatHistory: Array<{ id: string, roomId: string, userId: string, username: string, content: string, formattedContent: string | null, contentType: string, timestamp: string, position: { x: number, y: number, width: number, height: number } | null }> } | null };

export type GetRoomUnreadQueryVariables = Exact<{
  roomId: string;
  userId: string;
}>;


export type GetRoomUnreadQuery = { roomById: { id: string, hasUnreadChat: boolean | null } | null };

export const UserFragmentFragmentDoc = gql`
    fragment UserFragment on User {
  id
  username
  lastCardPicked
  lastCardValue
  previousCardPicked
  previousCardValue
  lastSeenChatMessageId
  handRaised
  voteUncensored
}
    `;
export const DeckFragmentFragmentDoc = gql`
    fragment DeckFragment on Deck {
  id
  cards
}
    `;
export const UserCardFragmentFragmentDoc = gql`
    fragment UserCardFragment on UserCard {
  userId
  card
}
    `;
export const GameFragmentFragmentDoc = gql`
    fragment GameFragment on Game {
  id
  table {
    ...UserCardFragment
  }
}
    ${UserCardFragmentFragmentDoc}`;
export const ChatPositionFragmentFragmentDoc = gql`
    fragment ChatPositionFragment on ChatPosition {
  x
  y
  width
  height
}
    `;
export const ChatMessageFragmentFragmentDoc = gql`
    fragment ChatMessageFragment on ChatMessage {
  id
  roomId
  userId
  username
  content
  formattedContent
  contentType
  timestamp
  position {
    ...ChatPositionFragment
  }
}
    ${ChatPositionFragmentFragmentDoc}`;
export const RoomFragmentFragmentDoc = gql`
    fragment RoomFragment on Room {
  id
  name
  isGameOver
  roomOwnerId
  users {
    ...UserFragment
  }
  bannedUsers
  deck {
    ...DeckFragment
  }
  game {
    ...GameFragment
  }
  countdownEnabled
  revealStage
  countdownValue
  confirmNewGame
  showVoteChanges
  censorVotes
  chatHistory {
    ...ChatMessageFragment
  }
}
    ${UserFragmentFragmentDoc}
${DeckFragmentFragmentDoc}
${GameFragmentFragmentDoc}
${ChatMessageFragmentFragmentDoc}`;
export const RoomEventFragmentFragmentDoc = gql`
    fragment RoomEventFragment on RoomEvent {
  roomId
  eventType
  targetUserId
  room {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export const RoomReactionFragmentFragmentDoc = gql`
    fragment RoomReactionFragment on RoomReaction {
  id
  roomId
  userId
  reaction
}
    `;
export const CreateRoomDocument = gql`
    mutation CreateRoom($roomId: UUID, $name: String, $cards: [String!]!) {
  createRoom(roomId: $roomId, name: $name, cards: $cards) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type CreateRoomMutationFn = Apollo.MutationFunction<CreateRoomMutation, CreateRoomMutationVariables>;

/**
 * __useCreateRoomMutation__
 *
 * To run a mutation, you first call `useCreateRoomMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateRoomMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRoomMutation, { data, loading, error }] = useCreateRoomMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      name: // value for 'name'
 *      cards: // value for 'cards'
 *   },
 * });
 */
export function useCreateRoomMutation(baseOptions?: Apollo.MutationHookOptions<CreateRoomMutation, CreateRoomMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateRoomMutation, CreateRoomMutationVariables>(CreateRoomDocument, options);
      }
export type CreateRoomMutationHookResult = ReturnType<typeof useCreateRoomMutation>;
export type CreateRoomMutationResult = Apollo.MutationResult<CreateRoomMutation>;
export type CreateRoomMutationOptions = Apollo.BaseMutationOptions<CreateRoomMutation, CreateRoomMutationVariables>;
export const CreateUserDocument = gql`
    mutation CreateUser($username: String!) {
  createUser(username: $username) {
    ...UserFragment
  }
}
    ${UserFragmentFragmentDoc}`;
export type CreateUserMutationFn = Apollo.MutationFunction<CreateUserMutation, CreateUserMutationVariables>;

/**
 * __useCreateUserMutation__
 *
 * To run a mutation, you first call `useCreateUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUserMutation, { data, loading, error }] = useCreateUserMutation({
 *   variables: {
 *      username: // value for 'username'
 *   },
 * });
 */
export function useCreateUserMutation(baseOptions?: Apollo.MutationHookOptions<CreateUserMutation, CreateUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateUserMutation, CreateUserMutationVariables>(CreateUserDocument, options);
      }
export type CreateUserMutationHookResult = ReturnType<typeof useCreateUserMutation>;
export type CreateUserMutationResult = Apollo.MutationResult<CreateUserMutation>;
export type CreateUserMutationOptions = Apollo.BaseMutationOptions<CreateUserMutation, CreateUserMutationVariables>;
export const JoinRoomDocument = gql`
    mutation JoinRoom($roomId: UUID!, $user: UserInput!, $roomOwnerId: UUID) {
  joinRoom(roomId: $roomId, user: $user, roomOwnerId: $roomOwnerId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type JoinRoomMutationFn = Apollo.MutationFunction<JoinRoomMutation, JoinRoomMutationVariables>;

/**
 * __useJoinRoomMutation__
 *
 * To run a mutation, you first call `useJoinRoomMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJoinRoomMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [joinRoomMutation, { data, loading, error }] = useJoinRoomMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      user: // value for 'user'
 *      roomOwnerId: // value for 'roomOwnerId'
 *   },
 * });
 */
export function useJoinRoomMutation(baseOptions?: Apollo.MutationHookOptions<JoinRoomMutation, JoinRoomMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<JoinRoomMutation, JoinRoomMutationVariables>(JoinRoomDocument, options);
      }
export type JoinRoomMutationHookResult = ReturnType<typeof useJoinRoomMutation>;
export type JoinRoomMutationResult = Apollo.MutationResult<JoinRoomMutation>;
export type JoinRoomMutationOptions = Apollo.BaseMutationOptions<JoinRoomMutation, JoinRoomMutationVariables>;
export const UpdateDeckDocument = gql`
    mutation UpdateDeck($roomId: UUID!, $cards: [String!]!) {
  updateDeck(input: {roomId: $roomId, cards: $cards}) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type UpdateDeckMutationFn = Apollo.MutationFunction<UpdateDeckMutation, UpdateDeckMutationVariables>;

/**
 * __useUpdateDeckMutation__
 *
 * To run a mutation, you first call `useUpdateDeckMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateDeckMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateDeckMutation, { data, loading, error }] = useUpdateDeckMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      cards: // value for 'cards'
 *   },
 * });
 */
export function useUpdateDeckMutation(baseOptions?: Apollo.MutationHookOptions<UpdateDeckMutation, UpdateDeckMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateDeckMutation, UpdateDeckMutationVariables>(UpdateDeckDocument, options);
      }
export type UpdateDeckMutationHookResult = ReturnType<typeof useUpdateDeckMutation>;
export type UpdateDeckMutationResult = Apollo.MutationResult<UpdateDeckMutation>;
export type UpdateDeckMutationOptions = Apollo.BaseMutationOptions<UpdateDeckMutation, UpdateDeckMutationVariables>;
export const RenameRoomDocument = gql`
    mutation RenameRoom($roomId: UUID!, $name: String) {
  renameRoom(roomId: $roomId, name: $name) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type RenameRoomMutationFn = Apollo.MutationFunction<RenameRoomMutation, RenameRoomMutationVariables>;

/**
 * __useRenameRoomMutation__
 *
 * To run a mutation, you first call `useRenameRoomMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRenameRoomMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [renameRoomMutation, { data, loading, error }] = useRenameRoomMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useRenameRoomMutation(baseOptions?: Apollo.MutationHookOptions<RenameRoomMutation, RenameRoomMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RenameRoomMutation, RenameRoomMutationVariables>(RenameRoomDocument, options);
      }
export type RenameRoomMutationHookResult = ReturnType<typeof useRenameRoomMutation>;
export type RenameRoomMutationResult = Apollo.MutationResult<RenameRoomMutation>;
export type RenameRoomMutationOptions = Apollo.BaseMutationOptions<RenameRoomMutation, RenameRoomMutationVariables>;
export const ToggleCountdownOptionDocument = gql`
    mutation ToggleCountdownOption($roomId: UUID!, $enabled: Boolean!) {
  toggleCountdownOption(roomId: $roomId, enabled: $enabled) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type ToggleCountdownOptionMutationFn = Apollo.MutationFunction<ToggleCountdownOptionMutation, ToggleCountdownOptionMutationVariables>;

/**
 * __useToggleCountdownOptionMutation__
 *
 * To run a mutation, you first call `useToggleCountdownOptionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleCountdownOptionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleCountdownOptionMutation, { data, loading, error }] = useToggleCountdownOptionMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      enabled: // value for 'enabled'
 *   },
 * });
 */
export function useToggleCountdownOptionMutation(baseOptions?: Apollo.MutationHookOptions<ToggleCountdownOptionMutation, ToggleCountdownOptionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ToggleCountdownOptionMutation, ToggleCountdownOptionMutationVariables>(ToggleCountdownOptionDocument, options);
      }
export type ToggleCountdownOptionMutationHookResult = ReturnType<typeof useToggleCountdownOptionMutation>;
export type ToggleCountdownOptionMutationResult = Apollo.MutationResult<ToggleCountdownOptionMutation>;
export type ToggleCountdownOptionMutationOptions = Apollo.BaseMutationOptions<ToggleCountdownOptionMutation, ToggleCountdownOptionMutationVariables>;
export const StartRevealCountdownDocument = gql`
    mutation StartRevealCountdown($roomId: UUID!, $userId: UUID) {
  startRevealCountdown(roomId: $roomId, userId: $userId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type StartRevealCountdownMutationFn = Apollo.MutationFunction<StartRevealCountdownMutation, StartRevealCountdownMutationVariables>;

/**
 * __useStartRevealCountdownMutation__
 *
 * To run a mutation, you first call `useStartRevealCountdownMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStartRevealCountdownMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [startRevealCountdownMutation, { data, loading, error }] = useStartRevealCountdownMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useStartRevealCountdownMutation(baseOptions?: Apollo.MutationHookOptions<StartRevealCountdownMutation, StartRevealCountdownMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<StartRevealCountdownMutation, StartRevealCountdownMutationVariables>(StartRevealCountdownDocument, options);
      }
export type StartRevealCountdownMutationHookResult = ReturnType<typeof useStartRevealCountdownMutation>;
export type StartRevealCountdownMutationResult = Apollo.MutationResult<StartRevealCountdownMutation>;
export type StartRevealCountdownMutationOptions = Apollo.BaseMutationOptions<StartRevealCountdownMutation, StartRevealCountdownMutationVariables>;
export const CancelRevealCountdownDocument = gql`
    mutation CancelRevealCountdown($roomId: UUID!, $userId: UUID) {
  cancelRevealCountdown(roomId: $roomId, userId: $userId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type CancelRevealCountdownMutationFn = Apollo.MutationFunction<CancelRevealCountdownMutation, CancelRevealCountdownMutationVariables>;

/**
 * __useCancelRevealCountdownMutation__
 *
 * To run a mutation, you first call `useCancelRevealCountdownMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelRevealCountdownMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelRevealCountdownMutation, { data, loading, error }] = useCancelRevealCountdownMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useCancelRevealCountdownMutation(baseOptions?: Apollo.MutationHookOptions<CancelRevealCountdownMutation, CancelRevealCountdownMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CancelRevealCountdownMutation, CancelRevealCountdownMutationVariables>(CancelRevealCountdownDocument, options);
      }
export type CancelRevealCountdownMutationHookResult = ReturnType<typeof useCancelRevealCountdownMutation>;
export type CancelRevealCountdownMutationResult = Apollo.MutationResult<CancelRevealCountdownMutation>;
export type CancelRevealCountdownMutationOptions = Apollo.BaseMutationOptions<CancelRevealCountdownMutation, CancelRevealCountdownMutationVariables>;
export const SetRoomOwnerDocument = gql`
    mutation SetRoomOwner($roomId: UUID!, $userId: UUID) {
  setRoomOwner(roomId: $roomId, userId: $userId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type SetRoomOwnerMutationFn = Apollo.MutationFunction<SetRoomOwnerMutation, SetRoomOwnerMutationVariables>;

/**
 * __useSetRoomOwnerMutation__
 *
 * To run a mutation, you first call `useSetRoomOwnerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetRoomOwnerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setRoomOwnerMutation, { data, loading, error }] = useSetRoomOwnerMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useSetRoomOwnerMutation(baseOptions?: Apollo.MutationHookOptions<SetRoomOwnerMutation, SetRoomOwnerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetRoomOwnerMutation, SetRoomOwnerMutationVariables>(SetRoomOwnerDocument, options);
      }
export type SetRoomOwnerMutationHookResult = ReturnType<typeof useSetRoomOwnerMutation>;
export type SetRoomOwnerMutationResult = Apollo.MutationResult<SetRoomOwnerMutation>;
export type SetRoomOwnerMutationOptions = Apollo.BaseMutationOptions<SetRoomOwnerMutation, SetRoomOwnerMutationVariables>;
export const EditUserDocument = gql`
    mutation EditUser($userId: UUID!, $username: String!) {
  editUser(userId: $userId, username: $username) {
    ...UserFragment
  }
}
    ${UserFragmentFragmentDoc}`;
export type EditUserMutationFn = Apollo.MutationFunction<EditUserMutation, EditUserMutationVariables>;

/**
 * __useEditUserMutation__
 *
 * To run a mutation, you first call `useEditUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEditUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [editUserMutation, { data, loading, error }] = useEditUserMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *      username: // value for 'username'
 *   },
 * });
 */
export function useEditUserMutation(baseOptions?: Apollo.MutationHookOptions<EditUserMutation, EditUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EditUserMutation, EditUserMutationVariables>(EditUserDocument, options);
      }
export type EditUserMutationHookResult = ReturnType<typeof useEditUserMutation>;
export type EditUserMutationResult = Apollo.MutationResult<EditUserMutation>;
export type EditUserMutationOptions = Apollo.BaseMutationOptions<EditUserMutation, EditUserMutationVariables>;
export const LogoutDocument = gql`
    mutation Logout($userId: UUID!) {
  logout(userId: $userId)
}
    `;
export type LogoutMutationFn = Apollo.MutationFunction<LogoutMutation, LogoutMutationVariables>;

/**
 * __useLogoutMutation__
 *
 * To run a mutation, you first call `useLogoutMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogoutMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logoutMutation, { data, loading, error }] = useLogoutMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useLogoutMutation(baseOptions?: Apollo.MutationHookOptions<LogoutMutation, LogoutMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LogoutMutation, LogoutMutationVariables>(LogoutDocument, options);
      }
export type LogoutMutationHookResult = ReturnType<typeof useLogoutMutation>;
export type LogoutMutationResult = Apollo.MutationResult<LogoutMutation>;
export type LogoutMutationOptions = Apollo.BaseMutationOptions<LogoutMutation, LogoutMutationVariables>;
export const PickCardDocument = gql`
    mutation PickCard($userId: UUID!, $roomId: UUID!, $card: String!) {
  pickCard(userId: $userId, roomId: $roomId, card: $card) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type PickCardMutationFn = Apollo.MutationFunction<PickCardMutation, PickCardMutationVariables>;

/**
 * __usePickCardMutation__
 *
 * To run a mutation, you first call `usePickCardMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePickCardMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pickCardMutation, { data, loading, error }] = usePickCardMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *      roomId: // value for 'roomId'
 *      card: // value for 'card'
 *   },
 * });
 */
export function usePickCardMutation(baseOptions?: Apollo.MutationHookOptions<PickCardMutation, PickCardMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PickCardMutation, PickCardMutationVariables>(PickCardDocument, options);
      }
export type PickCardMutationHookResult = ReturnType<typeof usePickCardMutation>;
export type PickCardMutationResult = Apollo.MutationResult<PickCardMutation>;
export type PickCardMutationOptions = Apollo.BaseMutationOptions<PickCardMutation, PickCardMutationVariables>;
export const ShowCardsDocument = gql`
    mutation ShowCards($roomId: UUID!) {
  showCards(roomId: $roomId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type ShowCardsMutationFn = Apollo.MutationFunction<ShowCardsMutation, ShowCardsMutationVariables>;

/**
 * __useShowCardsMutation__
 *
 * To run a mutation, you first call `useShowCardsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useShowCardsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [showCardsMutation, { data, loading, error }] = useShowCardsMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *   },
 * });
 */
export function useShowCardsMutation(baseOptions?: Apollo.MutationHookOptions<ShowCardsMutation, ShowCardsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ShowCardsMutation, ShowCardsMutationVariables>(ShowCardsDocument, options);
      }
export type ShowCardsMutationHookResult = ReturnType<typeof useShowCardsMutation>;
export type ShowCardsMutationResult = Apollo.MutationResult<ShowCardsMutation>;
export type ShowCardsMutationOptions = Apollo.BaseMutationOptions<ShowCardsMutation, ShowCardsMutationVariables>;
export const ResetGameDocument = gql`
    mutation ResetGame($roomId: UUID!) {
  resetGame(roomId: $roomId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type ResetGameMutationFn = Apollo.MutationFunction<ResetGameMutation, ResetGameMutationVariables>;

/**
 * __useResetGameMutation__
 *
 * To run a mutation, you first call `useResetGameMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetGameMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetGameMutation, { data, loading, error }] = useResetGameMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *   },
 * });
 */
export function useResetGameMutation(baseOptions?: Apollo.MutationHookOptions<ResetGameMutation, ResetGameMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetGameMutation, ResetGameMutationVariables>(ResetGameDocument, options);
      }
export type ResetGameMutationHookResult = ReturnType<typeof useResetGameMutation>;
export type ResetGameMutationResult = Apollo.MutationResult<ResetGameMutation>;
export type ResetGameMutationOptions = Apollo.BaseMutationOptions<ResetGameMutation, ResetGameMutationVariables>;
export const KickUserDocument = gql`
    mutation KickUser($roomId: UUID!, $targetUserId: UUID!) {
  kickUser(roomId: $roomId, targetUserId: $targetUserId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type KickUserMutationFn = Apollo.MutationFunction<KickUserMutation, KickUserMutationVariables>;

/**
 * __useKickUserMutation__
 *
 * To run a mutation, you first call `useKickUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useKickUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [kickUserMutation, { data, loading, error }] = useKickUserMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      targetUserId: // value for 'targetUserId'
 *   },
 * });
 */
export function useKickUserMutation(baseOptions?: Apollo.MutationHookOptions<KickUserMutation, KickUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<KickUserMutation, KickUserMutationVariables>(KickUserDocument, options);
      }
export type KickUserMutationHookResult = ReturnType<typeof useKickUserMutation>;
export type KickUserMutationResult = Apollo.MutationResult<KickUserMutation>;
export type KickUserMutationOptions = Apollo.BaseMutationOptions<KickUserMutation, KickUserMutationVariables>;
export const BanUserDocument = gql`
    mutation BanUser($roomId: UUID!, $targetUserId: UUID!) {
  banUser(roomId: $roomId, targetUserId: $targetUserId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type BanUserMutationFn = Apollo.MutationFunction<BanUserMutation, BanUserMutationVariables>;

/**
 * __useBanUserMutation__
 *
 * To run a mutation, you first call `useBanUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBanUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [banUserMutation, { data, loading, error }] = useBanUserMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      targetUserId: // value for 'targetUserId'
 *   },
 * });
 */
export function useBanUserMutation(baseOptions?: Apollo.MutationHookOptions<BanUserMutation, BanUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BanUserMutation, BanUserMutationVariables>(BanUserDocument, options);
      }
export type BanUserMutationHookResult = ReturnType<typeof useBanUserMutation>;
export type BanUserMutationResult = Apollo.MutationResult<BanUserMutation>;
export type BanUserMutationOptions = Apollo.BaseMutationOptions<BanUserMutation, BanUserMutationVariables>;
export const UnbanUserDocument = gql`
    mutation UnbanUser($roomId: UUID!, $targetUserId: UUID!) {
  unbanUser(roomId: $roomId, targetUserId: $targetUserId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type UnbanUserMutationFn = Apollo.MutationFunction<UnbanUserMutation, UnbanUserMutationVariables>;

/**
 * __useUnbanUserMutation__
 *
 * To run a mutation, you first call `useUnbanUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnbanUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unbanUserMutation, { data, loading, error }] = useUnbanUserMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      targetUserId: // value for 'targetUserId'
 *   },
 * });
 */
export function useUnbanUserMutation(baseOptions?: Apollo.MutationHookOptions<UnbanUserMutation, UnbanUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnbanUserMutation, UnbanUserMutationVariables>(UnbanUserDocument, options);
      }
export type UnbanUserMutationHookResult = ReturnType<typeof useUnbanUserMutation>;
export type UnbanUserMutationResult = Apollo.MutationResult<UnbanUserMutation>;
export type UnbanUserMutationOptions = Apollo.BaseMutationOptions<UnbanUserMutation, UnbanUserMutationVariables>;
export const ToggleConfirmNewGameDocument = gql`
    mutation ToggleConfirmNewGame($roomId: UUID!, $enabled: Boolean!) {
  toggleConfirmNewGame(roomId: $roomId, enabled: $enabled) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type ToggleConfirmNewGameMutationFn = Apollo.MutationFunction<ToggleConfirmNewGameMutation, ToggleConfirmNewGameMutationVariables>;

/**
 * __useToggleConfirmNewGameMutation__
 *
 * To run a mutation, you first call `useToggleConfirmNewGameMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleConfirmNewGameMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleConfirmNewGameMutation, { data, loading, error }] = useToggleConfirmNewGameMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      enabled: // value for 'enabled'
 *   },
 * });
 */
export function useToggleConfirmNewGameMutation(baseOptions?: Apollo.MutationHookOptions<ToggleConfirmNewGameMutation, ToggleConfirmNewGameMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ToggleConfirmNewGameMutation, ToggleConfirmNewGameMutationVariables>(ToggleConfirmNewGameDocument, options);
      }
export type ToggleConfirmNewGameMutationHookResult = ReturnType<typeof useToggleConfirmNewGameMutation>;
export type ToggleConfirmNewGameMutationResult = Apollo.MutationResult<ToggleConfirmNewGameMutation>;
export type ToggleConfirmNewGameMutationOptions = Apollo.BaseMutationOptions<ToggleConfirmNewGameMutation, ToggleConfirmNewGameMutationVariables>;
export const ToggleShowVoteChangesDocument = gql`
    mutation ToggleShowVoteChanges($roomId: UUID!, $enabled: Boolean!) {
  toggleShowVoteChanges(roomId: $roomId, enabled: $enabled) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type ToggleShowVoteChangesMutationFn = Apollo.MutationFunction<ToggleShowVoteChangesMutation, ToggleShowVoteChangesMutationVariables>;

/**
 * __useToggleShowVoteChangesMutation__
 *
 * To run a mutation, you first call `useToggleShowVoteChangesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleShowVoteChangesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleShowVoteChangesMutation, { data, loading, error }] = useToggleShowVoteChangesMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      enabled: // value for 'enabled'
 *   },
 * });
 */
export function useToggleShowVoteChangesMutation(baseOptions?: Apollo.MutationHookOptions<ToggleShowVoteChangesMutation, ToggleShowVoteChangesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ToggleShowVoteChangesMutation, ToggleShowVoteChangesMutationVariables>(ToggleShowVoteChangesDocument, options);
      }
export type ToggleShowVoteChangesMutationHookResult = ReturnType<typeof useToggleShowVoteChangesMutation>;
export type ToggleShowVoteChangesMutationResult = Apollo.MutationResult<ToggleShowVoteChangesMutation>;
export type ToggleShowVoteChangesMutationOptions = Apollo.BaseMutationOptions<ToggleShowVoteChangesMutation, ToggleShowVoteChangesMutationVariables>;
export const ToggleCensorVotesDocument = gql`
    mutation ToggleCensorVotes($roomId: UUID!, $enabled: Boolean!) {
  toggleCensorVotes(roomId: $roomId, enabled: $enabled) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type ToggleCensorVotesMutationFn = Apollo.MutationFunction<ToggleCensorVotesMutation, ToggleCensorVotesMutationVariables>;

/**
 * __useToggleCensorVotesMutation__
 *
 * To run a mutation, you first call `useToggleCensorVotesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleCensorVotesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleCensorVotesMutation, { data, loading, error }] = useToggleCensorVotesMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      enabled: // value for 'enabled'
 *   },
 * });
 */
export function useToggleCensorVotesMutation(baseOptions?: Apollo.MutationHookOptions<ToggleCensorVotesMutation, ToggleCensorVotesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ToggleCensorVotesMutation, ToggleCensorVotesMutationVariables>(ToggleCensorVotesDocument, options);
      }
export type ToggleCensorVotesMutationHookResult = ReturnType<typeof useToggleCensorVotesMutation>;
export type ToggleCensorVotesMutationResult = Apollo.MutationResult<ToggleCensorVotesMutation>;
export type ToggleCensorVotesMutationOptions = Apollo.BaseMutationOptions<ToggleCensorVotesMutation, ToggleCensorVotesMutationVariables>;
export const SetVoteUncensoredDocument = gql`
    mutation SetVoteUncensored($roomId: UUID!, $userId: UUID!, $uncensored: Boolean!) {
  setVoteUncensored(roomId: $roomId, userId: $userId, uncensored: $uncensored) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;
export type SetVoteUncensoredMutationFn = Apollo.MutationFunction<SetVoteUncensoredMutation, SetVoteUncensoredMutationVariables>;

/**
 * __useSetVoteUncensoredMutation__
 *
 * To run a mutation, you first call `useSetVoteUncensoredMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetVoteUncensoredMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setVoteUncensoredMutation, { data, loading, error }] = useSetVoteUncensoredMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      userId: // value for 'userId'
 *      uncensored: // value for 'uncensored'
 *   },
 * });
 */
export function useSetVoteUncensoredMutation(baseOptions?: Apollo.MutationHookOptions<SetVoteUncensoredMutation, SetVoteUncensoredMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetVoteUncensoredMutation, SetVoteUncensoredMutationVariables>(SetVoteUncensoredDocument, options);
      }
export type SetVoteUncensoredMutationHookResult = ReturnType<typeof useSetVoteUncensoredMutation>;
export type SetVoteUncensoredMutationResult = Apollo.MutationResult<SetVoteUncensoredMutation>;
export type SetVoteUncensoredMutationOptions = Apollo.BaseMutationOptions<SetVoteUncensoredMutation, SetVoteUncensoredMutationVariables>;
export const SendChatMessageDocument = gql`
    mutation SendChatMessage($roomId: UUID!, $userId: UUID!, $username: String!, $content: String!, $formattedContent: String, $contentType: String!, $position: ChatPositionInput) {
  sendChatMessage(
    input: {roomId: $roomId, userId: $userId, username: $username, content: $content, formattedContent: $formattedContent, contentType: $contentType, position: $position}
  ) {
    ...ChatMessageFragment
  }
}
    ${ChatMessageFragmentFragmentDoc}`;
export type SendChatMessageMutationFn = Apollo.MutationFunction<SendChatMessageMutation, SendChatMessageMutationVariables>;

/**
 * __useSendChatMessageMutation__
 *
 * To run a mutation, you first call `useSendChatMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendChatMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendChatMessageMutation, { data, loading, error }] = useSendChatMessageMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      userId: // value for 'userId'
 *      username: // value for 'username'
 *      content: // value for 'content'
 *      formattedContent: // value for 'formattedContent'
 *      contentType: // value for 'contentType'
 *      position: // value for 'position'
 *   },
 * });
 */
export function useSendChatMessageMutation(baseOptions?: Apollo.MutationHookOptions<SendChatMessageMutation, SendChatMessageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendChatMessageMutation, SendChatMessageMutationVariables>(SendChatMessageDocument, options);
      }
export type SendChatMessageMutationHookResult = ReturnType<typeof useSendChatMessageMutation>;
export type SendChatMessageMutationResult = Apollo.MutationResult<SendChatMessageMutation>;
export type SendChatMessageMutationOptions = Apollo.BaseMutationOptions<SendChatMessageMutation, SendChatMessageMutationVariables>;
export const MarkChatSeenDocument = gql`
    mutation MarkChatSeen($roomId: UUID!, $userId: UUID!) {
  markChatSeen(roomId: $roomId, userId: $userId) {
    id
    hasUnreadChat(userId: $userId)
  }
}
    `;
export type MarkChatSeenMutationFn = Apollo.MutationFunction<MarkChatSeenMutation, MarkChatSeenMutationVariables>;

/**
 * __useMarkChatSeenMutation__
 *
 * To run a mutation, you first call `useMarkChatSeenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkChatSeenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markChatSeenMutation, { data, loading, error }] = useMarkChatSeenMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useMarkChatSeenMutation(baseOptions?: Apollo.MutationHookOptions<MarkChatSeenMutation, MarkChatSeenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<MarkChatSeenMutation, MarkChatSeenMutationVariables>(MarkChatSeenDocument, options);
      }
export type MarkChatSeenMutationHookResult = ReturnType<typeof useMarkChatSeenMutation>;
export type MarkChatSeenMutationResult = Apollo.MutationResult<MarkChatSeenMutation>;
export type MarkChatSeenMutationOptions = Apollo.BaseMutationOptions<MarkChatSeenMutation, MarkChatSeenMutationVariables>;
export const SendReactionDocument = gql`
    mutation SendReaction($roomId: UUID!, $userId: UUID!, $reaction: ReactionKind!) {
  sendReaction(roomId: $roomId, userId: $userId, reaction: $reaction) {
    ...RoomReactionFragment
  }
}
    ${RoomReactionFragmentFragmentDoc}`;
export type SendReactionMutationFn = Apollo.MutationFunction<SendReactionMutation, SendReactionMutationVariables>;

/**
 * __useSendReactionMutation__
 *
 * To run a mutation, you first call `useSendReactionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendReactionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendReactionMutation, { data, loading, error }] = useSendReactionMutation({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      userId: // value for 'userId'
 *      reaction: // value for 'reaction'
 *   },
 * });
 */
export function useSendReactionMutation(baseOptions?: Apollo.MutationHookOptions<SendReactionMutation, SendReactionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendReactionMutation, SendReactionMutationVariables>(SendReactionDocument, options);
      }
export type SendReactionMutationHookResult = ReturnType<typeof useSendReactionMutation>;
export type SendReactionMutationResult = Apollo.MutationResult<SendReactionMutation>;
export type SendReactionMutationOptions = Apollo.BaseMutationOptions<SendReactionMutation, SendReactionMutationVariables>;
export const RoomDocument = gql`
    subscription Room($roomId: UUID!) {
  room(roomId: $roomId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;

/**
 * __useRoomSubscription__
 *
 * To run a query within a React component, call `useRoomSubscription` and pass it any options that fit your needs.
 * When your component renders, `useRoomSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoomSubscription({
 *   variables: {
 *      roomId: // value for 'roomId'
 *   },
 * });
 */
export function useRoomSubscription(baseOptions: Apollo.SubscriptionHookOptions<RoomSubscription, RoomSubscriptionVariables> & ({ variables: RoomSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<RoomSubscription, RoomSubscriptionVariables>(RoomDocument, options);
      }
export type RoomSubscriptionHookResult = ReturnType<typeof useRoomSubscription>;
export type RoomSubscriptionResult = Apollo.SubscriptionResult<RoomSubscription>;
export const RoomChatDocument = gql`
    subscription RoomChat($roomId: UUID!) {
  roomChat(roomId: $roomId) {
    ...ChatMessageFragment
  }
}
    ${ChatMessageFragmentFragmentDoc}`;

/**
 * __useRoomChatSubscription__
 *
 * To run a query within a React component, call `useRoomChatSubscription` and pass it any options that fit your needs.
 * When your component renders, `useRoomChatSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoomChatSubscription({
 *   variables: {
 *      roomId: // value for 'roomId'
 *   },
 * });
 */
export function useRoomChatSubscription(baseOptions: Apollo.SubscriptionHookOptions<RoomChatSubscription, RoomChatSubscriptionVariables> & ({ variables: RoomChatSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<RoomChatSubscription, RoomChatSubscriptionVariables>(RoomChatDocument, options);
      }
export type RoomChatSubscriptionHookResult = ReturnType<typeof useRoomChatSubscription>;
export type RoomChatSubscriptionResult = Apollo.SubscriptionResult<RoomChatSubscription>;
export const RoomEventsDocument = gql`
    subscription RoomEvents($roomId: UUID!) {
  roomEvents(roomId: $roomId) {
    ...RoomEventFragment
  }
}
    ${RoomEventFragmentFragmentDoc}`;

/**
 * __useRoomEventsSubscription__
 *
 * To run a query within a React component, call `useRoomEventsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useRoomEventsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoomEventsSubscription({
 *   variables: {
 *      roomId: // value for 'roomId'
 *   },
 * });
 */
export function useRoomEventsSubscription(baseOptions: Apollo.SubscriptionHookOptions<RoomEventsSubscription, RoomEventsSubscriptionVariables> & ({ variables: RoomEventsSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<RoomEventsSubscription, RoomEventsSubscriptionVariables>(RoomEventsDocument, options);
      }
export type RoomEventsSubscriptionHookResult = ReturnType<typeof useRoomEventsSubscription>;
export type RoomEventsSubscriptionResult = Apollo.SubscriptionResult<RoomEventsSubscription>;
export const RoomReactionsDocument = gql`
    subscription RoomReactions($roomId: UUID!) {
  roomReactions(roomId: $roomId) {
    ...RoomReactionFragment
  }
}
    ${RoomReactionFragmentFragmentDoc}`;

/**
 * __useRoomReactionsSubscription__
 *
 * To run a query within a React component, call `useRoomReactionsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useRoomReactionsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoomReactionsSubscription({
 *   variables: {
 *      roomId: // value for 'roomId'
 *   },
 * });
 */
export function useRoomReactionsSubscription(baseOptions: Apollo.SubscriptionHookOptions<RoomReactionsSubscription, RoomReactionsSubscriptionVariables> & ({ variables: RoomReactionsSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<RoomReactionsSubscription, RoomReactionsSubscriptionVariables>(RoomReactionsDocument, options);
      }
export type RoomReactionsSubscriptionHookResult = ReturnType<typeof useRoomReactionsSubscription>;
export type RoomReactionsSubscriptionResult = Apollo.SubscriptionResult<RoomReactionsSubscription>;
export const RoomUnreadDocument = gql`
    subscription RoomUnread($roomId: UUID!, $userId: UUID!) {
  room(roomId: $roomId) {
    id
    hasUnreadChat(userId: $userId)
  }
}
    `;

/**
 * __useRoomUnreadSubscription__
 *
 * To run a query within a React component, call `useRoomUnreadSubscription` and pass it any options that fit your needs.
 * When your component renders, `useRoomUnreadSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRoomUnreadSubscription({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useRoomUnreadSubscription(baseOptions: Apollo.SubscriptionHookOptions<RoomUnreadSubscription, RoomUnreadSubscriptionVariables> & ({ variables: RoomUnreadSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<RoomUnreadSubscription, RoomUnreadSubscriptionVariables>(RoomUnreadDocument, options);
      }
export type RoomUnreadSubscriptionHookResult = ReturnType<typeof useRoomUnreadSubscription>;
export type RoomUnreadSubscriptionResult = Apollo.SubscriptionResult<RoomUnreadSubscription>;
export const GetRoomDocument = gql`
    query GetRoom($roomId: UUID!) {
  roomById(roomId: $roomId) {
    ...RoomFragment
  }
}
    ${RoomFragmentFragmentDoc}`;

/**
 * __useGetRoomQuery__
 *
 * To run a query within a React component, call `useGetRoomQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRoomQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRoomQuery({
 *   variables: {
 *      roomId: // value for 'roomId'
 *   },
 * });
 */
export function useGetRoomQuery(baseOptions: Apollo.QueryHookOptions<GetRoomQuery, GetRoomQueryVariables> & ({ variables: GetRoomQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetRoomQuery, GetRoomQueryVariables>(GetRoomDocument, options);
      }
export function useGetRoomLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetRoomQuery, GetRoomQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetRoomQuery, GetRoomQueryVariables>(GetRoomDocument, options);
        }
// @ts-ignore
export function useGetRoomSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetRoomQuery, GetRoomQueryVariables>): Apollo.UseSuspenseQueryResult<GetRoomQuery, GetRoomQueryVariables>;
export function useGetRoomSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRoomQuery, GetRoomQueryVariables>): Apollo.UseSuspenseQueryResult<GetRoomQuery | undefined, GetRoomQueryVariables>;
export function useGetRoomSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRoomQuery, GetRoomQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetRoomQuery, GetRoomQueryVariables>(GetRoomDocument, options);
        }
export type GetRoomQueryHookResult = ReturnType<typeof useGetRoomQuery>;
export type GetRoomLazyQueryHookResult = ReturnType<typeof useGetRoomLazyQuery>;
export type GetRoomSuspenseQueryHookResult = ReturnType<typeof useGetRoomSuspenseQuery>;
export type GetRoomQueryResult = Apollo.QueryResult<GetRoomQuery, GetRoomQueryVariables>;
export const GetRoomUnreadDocument = gql`
    query GetRoomUnread($roomId: UUID!, $userId: UUID!) {
  roomById(roomId: $roomId) {
    id
    hasUnreadChat(userId: $userId)
  }
}
    `;

/**
 * __useGetRoomUnreadQuery__
 *
 * To run a query within a React component, call `useGetRoomUnreadQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRoomUnreadQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRoomUnreadQuery({
 *   variables: {
 *      roomId: // value for 'roomId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useGetRoomUnreadQuery(baseOptions: Apollo.QueryHookOptions<GetRoomUnreadQuery, GetRoomUnreadQueryVariables> & ({ variables: GetRoomUnreadQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetRoomUnreadQuery, GetRoomUnreadQueryVariables>(GetRoomUnreadDocument, options);
      }
export function useGetRoomUnreadLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetRoomUnreadQuery, GetRoomUnreadQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetRoomUnreadQuery, GetRoomUnreadQueryVariables>(GetRoomUnreadDocument, options);
        }
// @ts-ignore
export function useGetRoomUnreadSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetRoomUnreadQuery, GetRoomUnreadQueryVariables>): Apollo.UseSuspenseQueryResult<GetRoomUnreadQuery, GetRoomUnreadQueryVariables>;
export function useGetRoomUnreadSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRoomUnreadQuery, GetRoomUnreadQueryVariables>): Apollo.UseSuspenseQueryResult<GetRoomUnreadQuery | undefined, GetRoomUnreadQueryVariables>;
export function useGetRoomUnreadSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetRoomUnreadQuery, GetRoomUnreadQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetRoomUnreadQuery, GetRoomUnreadQueryVariables>(GetRoomUnreadDocument, options);
        }
export type GetRoomUnreadQueryHookResult = ReturnType<typeof useGetRoomUnreadQuery>;
export type GetRoomUnreadLazyQueryHookResult = ReturnType<typeof useGetRoomUnreadLazyQuery>;
export type GetRoomUnreadSuspenseQueryHookResult = ReturnType<typeof useGetRoomUnreadSuspenseQuery>;
export type GetRoomUnreadQueryResult = Apollo.QueryResult<GetRoomUnreadQuery, GetRoomUnreadQueryVariables>;