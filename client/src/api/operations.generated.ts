import * as Types from '../types/types.generated';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type UserFragmentFragment = { __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null };

export type DeckFragmentFragment = { __typename?: 'Deck', id: string, cards: Array<string> };

export type UserCardFragmentFragment = { __typename?: 'UserCard', userId: string, card?: string | null };

export type GameFragmentFragment = { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> };

export type ChatPositionFragmentFragment = { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number };

export type ChatMessageFragmentFragment = { __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null };

export type RoomFragmentFragment = { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> };

export type RoomEventFragmentFragment = { __typename?: 'RoomEvent', roomId: string, eventType: string, targetUserId?: string | null, room: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type CreateRoomMutationVariables = Types.Exact<{
  roomId?: Types.InputMaybe<Types.Scalars['UUID']['input']>;
  name?: Types.InputMaybe<Types.Scalars['String']['input']>;
  cards: Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input'];
}>;


export type CreateRoomMutation = { __typename?: 'MutationRoot', createRoom: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type CreateUserMutationVariables = Types.Exact<{
  username: Types.Scalars['String']['input'];
}>;


export type CreateUserMutation = { __typename?: 'MutationRoot', createUser: { __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null } };

export type JoinRoomMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  user: Types.UserInput;
  roomOwnerId?: Types.InputMaybe<Types.Scalars['UUID']['input']>;
}>;


export type JoinRoomMutation = { __typename?: 'MutationRoot', joinRoom: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type UpdateDeckMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  cards: Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input'];
}>;


export type UpdateDeckMutation = { __typename?: 'MutationRoot', updateDeck: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type RenameRoomMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  name?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type RenameRoomMutation = { __typename?: 'MutationRoot', renameRoom: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type ToggleCountdownOptionMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  enabled: Types.Scalars['Boolean']['input'];
}>;


export type ToggleCountdownOptionMutation = { __typename?: 'MutationRoot', toggleCountdownOption: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type StartRevealCountdownMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  userId?: Types.InputMaybe<Types.Scalars['UUID']['input']>;
}>;


export type StartRevealCountdownMutation = { __typename?: 'MutationRoot', startRevealCountdown: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type CancelRevealCountdownMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  userId?: Types.InputMaybe<Types.Scalars['UUID']['input']>;
}>;


export type CancelRevealCountdownMutation = { __typename?: 'MutationRoot', cancelRevealCountdown: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type SetRoomOwnerMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  userId?: Types.InputMaybe<Types.Scalars['UUID']['input']>;
}>;


export type SetRoomOwnerMutation = { __typename?: 'MutationRoot', setRoomOwner: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type EditUserMutationVariables = Types.Exact<{
  userId: Types.Scalars['UUID']['input'];
  username: Types.Scalars['String']['input'];
}>;


export type EditUserMutation = { __typename?: 'MutationRoot', editUser: { __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null } };

export type LogoutMutationVariables = Types.Exact<{
  userId: Types.Scalars['UUID']['input'];
}>;


export type LogoutMutation = { __typename?: 'MutationRoot', logout: boolean };

export type PickCardMutationVariables = Types.Exact<{
  userId: Types.Scalars['UUID']['input'];
  roomId: Types.Scalars['UUID']['input'];
  card: Types.Scalars['String']['input'];
}>;


export type PickCardMutation = { __typename?: 'MutationRoot', pickCard: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type ShowCardsMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
}>;


export type ShowCardsMutation = { __typename?: 'MutationRoot', showCards: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type ResetGameMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
}>;


export type ResetGameMutation = { __typename?: 'MutationRoot', resetGame: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type KickUserMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  targetUserId: Types.Scalars['UUID']['input'];
}>;


export type KickUserMutation = { __typename?: 'MutationRoot', kickUser: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type BanUserMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  targetUserId: Types.Scalars['UUID']['input'];
}>;


export type BanUserMutation = { __typename?: 'MutationRoot', banUser: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type UnbanUserMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  targetUserId: Types.Scalars['UUID']['input'];
}>;


export type UnbanUserMutation = { __typename?: 'MutationRoot', unbanUser: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type ToggleConfirmNewGameMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  enabled: Types.Scalars['Boolean']['input'];
}>;


export type ToggleConfirmNewGameMutation = { __typename?: 'MutationRoot', toggleConfirmNewGame: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type SendChatMessageMutationVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
  userId: Types.Scalars['UUID']['input'];
  username: Types.Scalars['String']['input'];
  content: Types.Scalars['String']['input'];
  formattedContent?: Types.InputMaybe<Types.Scalars['String']['input']>;
  contentType: Types.Scalars['String']['input'];
  position?: Types.InputMaybe<Types.ChatPositionInput>;
}>;


export type SendChatMessageMutation = { __typename?: 'MutationRoot', sendChatMessage: { __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null } };

export type RoomChatSubscriptionVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
}>;


export type RoomChatSubscription = { __typename?: 'SubscriptionRoot', roomChat: { __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null } };

export type RoomSubscriptionVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
}>;


export type RoomSubscription = { __typename?: 'SubscriptionRoot', room: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } };

export type RoomEventsSubscriptionVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
}>;


export type RoomEventsSubscription = { __typename?: 'SubscriptionRoot', roomEvents: { __typename?: 'RoomEvent', roomId: string, eventType: string, targetUserId?: string | null, room: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } } };

export type GetRoomQueryVariables = Types.Exact<{
  roomId: Types.Scalars['UUID']['input'];
}>;


export type GetRoomQuery = { __typename?: 'QueryRoot', roomById?: { __typename?: 'Room', id: string, name?: string | null, isGameOver: boolean, roomOwnerId?: string | null, bannedUsers: Array<string>, countdownEnabled: boolean, revealStage?: string | null, countdownValue?: number | null, confirmNewGame: boolean, users: Array<{ __typename?: 'User', id: string, username: string, lastCardPicked?: string | null, lastCardValue?: number | null }>, deck: { __typename?: 'Deck', id: string, cards: Array<string> }, game: { __typename?: 'Game', id: string, table: Array<{ __typename?: 'UserCard', userId: string, card?: string | null }> }, chatHistory: Array<{ __typename?: 'ChatMessage', id: string, roomId: string, userId: string, username: string, content: string, formattedContent?: string | null, contentType: string, timestamp: string, position?: { __typename?: 'ChatPosition', x: number, y: number, width: number, height: number } | null }> } | null };

export const UserFragmentFragmentDoc = gql`
    fragment UserFragment on User {
  id
  username
  lastCardPicked
  lastCardValue
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
export function useRoomChatSubscription(baseOptions: Apollo.SubscriptionHookOptions<RoomChatSubscription, RoomChatSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<RoomChatSubscription, RoomChatSubscriptionVariables>(RoomChatDocument, options);
      }
export type RoomChatSubscriptionHookResult = ReturnType<typeof useRoomChatSubscription>;
export type RoomChatSubscriptionResult = Apollo.SubscriptionResult<RoomChatSubscription>;
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
export function useRoomSubscription(baseOptions: Apollo.SubscriptionHookOptions<RoomSubscription, RoomSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<RoomSubscription, RoomSubscriptionVariables>(RoomDocument, options);
      }
export type RoomSubscriptionHookResult = ReturnType<typeof useRoomSubscription>;
export type RoomSubscriptionResult = Apollo.SubscriptionResult<RoomSubscription>;
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
export function useRoomEventsSubscription(baseOptions: Apollo.SubscriptionHookOptions<RoomEventsSubscription, RoomEventsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<RoomEventsSubscription, RoomEventsSubscriptionVariables>(RoomEventsDocument, options);
      }
export type RoomEventsSubscriptionHookResult = ReturnType<typeof useRoomEventsSubscription>;
export type RoomEventsSubscriptionResult = Apollo.SubscriptionResult<RoomEventsSubscription>;
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
export function useGetRoomQuery(baseOptions: Apollo.QueryHookOptions<GetRoomQuery, GetRoomQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetRoomQuery, GetRoomQueryVariables>(GetRoomDocument, options);
      }
export function useGetRoomLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetRoomQuery, GetRoomQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetRoomQuery, GetRoomQueryVariables>(GetRoomDocument, options);
        }
export type GetRoomQueryHookResult = ReturnType<typeof useGetRoomQuery>;
export type GetRoomLazyQueryHookResult = ReturnType<typeof useGetRoomLazyQuery>;
export type GetRoomQueryResult = Apollo.QueryResult<GetRoomQuery, GetRoomQueryVariables>;