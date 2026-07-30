export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  UUID: { input: string; output: string; }
};

export type ArchivedPlayerVote = {
  __typename?: 'ArchivedPlayerVote';
  card?: Maybe<Scalars['String']['output']>;
  selections: Array<ArchivedVoteSelection>;
  userId: Scalars['UUID']['output'];
  username: Scalars['String']['output'];
  value?: Maybe<Scalars['Float']['output']>;
};

export type ArchivedVoteSelection = {
  __typename?: 'ArchivedVoteSelection';
  card: Scalars['String']['output'];
  phase: Scalars['Int']['output'];
  value?: Maybe<Scalars['Float']['output']>;
};

/** A chat message within a room. */
export type ChatMessage = {
  __typename?: 'ChatMessage';
  /** The plain-text version of the message (for search and fallback rendering) */
  content: Scalars['String']['output'];
  /** Message type: "text", "html", "gif", "image", etc. */
  contentType: Scalars['String']['output'];
  /** Optional formatted (HTML or Markdown) version of the message */
  formattedContent?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  position?: Maybe<ChatPosition>;
  roomId: Scalars['UUID']['output'];
  timestamp: Scalars['DateTime']['output'];
  userId: Scalars['UUID']['output'];
  username: Scalars['String']['output'];
};

export type ChatPosition = {
  __typename?: 'ChatPosition';
  height: Scalars['Float']['output'];
  width: Scalars['Float']['output'];
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

export type ChatPositionInput = {
  height: Scalars['Float']['input'];
  width: Scalars['Float']['input'];
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type Deck = {
  __typename?: 'Deck';
  cards: Array<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
};

export type Game = {
  __typename?: 'Game';
  id: Scalars['UUID']['output'];
  table: Array<UserCard>;
};

export type MutationRoot = {
  __typename?: 'MutationRoot';
  addVoteQueueItem: Room;
  banUser: Room;
  cancelRevealCountdown: Room;
  createRoom: Room;
  createUser: User;
  editUser: User;
  joinRoom: Room;
  kickUser: Room;
  leaveRoom: Room;
  logout: Scalars['Boolean']['output'];
  markChatSeen: Room;
  pickCard: Room;
  removeVoteQueueItem: Room;
  renameRoom: Room;
  renameVoteQueueItem: Room;
  reorderVoteQueueItem: Room;
  resetGame: Room;
  returnCurrentVoteQueueItem: Room;
  sendChatMessage: ChatMessage;
  sendReaction: RoomReaction;
  setCurrentIssueTitle: Room;
  setRoomOwner: Room;
  setVoteUncensored: Room;
  showCards: Room;
  startNextQueueItem: Room;
  startRevealCountdown: Room;
  startRevote: Room;
  startVoteQueueItem: Room;
  toggleCensorVotes: Room;
  toggleConfirmNewGame: Room;
  toggleCountdownOption: Room;
  toggleLockVotes: Room;
  toggleShowVoteChanges: Room;
  unbanUser: Room;
  updateDeck: Room;
};


export type MutationRootAddVoteQueueItemArgs = {
  roomId: Scalars['UUID']['input'];
  title: Scalars['String']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootBanUserArgs = {
  roomId: Scalars['UUID']['input'];
  targetUserId: Scalars['UUID']['input'];
};


export type MutationRootCancelRevealCountdownArgs = {
  roomId: Scalars['UUID']['input'];
  userId?: InputMaybe<Scalars['UUID']['input']>;
};


export type MutationRootCreateRoomArgs = {
  cards: Array<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  roomId?: InputMaybe<Scalars['UUID']['input']>;
};


export type MutationRootCreateUserArgs = {
  username: Scalars['String']['input'];
};


export type MutationRootEditUserArgs = {
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
  username: Scalars['String']['input'];
};


export type MutationRootJoinRoomArgs = {
  roomId: Scalars['UUID']['input'];
  roomOwnerId?: InputMaybe<Scalars['UUID']['input']>;
  user: UserInput;
};


export type MutationRootKickUserArgs = {
  roomId: Scalars['UUID']['input'];
  targetUserId: Scalars['UUID']['input'];
};


export type MutationRootLeaveRoomArgs = {
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootLogoutArgs = {
  userId?: InputMaybe<Scalars['UUID']['input']>;
};


export type MutationRootMarkChatSeenArgs = {
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootPickCardArgs = {
  card: Scalars['String']['input'];
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootRemoveVoteQueueItemArgs = {
  itemId: Scalars['UUID']['input'];
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootRenameRoomArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
  roomId: Scalars['UUID']['input'];
};


export type MutationRootRenameVoteQueueItemArgs = {
  itemId: Scalars['UUID']['input'];
  roomId: Scalars['UUID']['input'];
  title: Scalars['String']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootReorderVoteQueueItemArgs = {
  itemId: Scalars['UUID']['input'];
  roomId: Scalars['UUID']['input'];
  toIndex: Scalars['Int']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootResetGameArgs = {
  roomId: Scalars['UUID']['input'];
};


export type MutationRootReturnCurrentVoteQueueItemArgs = {
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootSendChatMessageArgs = {
  input: SendChatInput;
};


export type MutationRootSendReactionArgs = {
  reaction: ReactionKind;
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootSetCurrentIssueTitleArgs = {
  roomId: Scalars['UUID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['UUID']['input'];
};


export type MutationRootSetRoomOwnerArgs = {
  roomId: Scalars['UUID']['input'];
  userId?: InputMaybe<Scalars['UUID']['input']>;
};


export type MutationRootSetVoteUncensoredArgs = {
  roomId: Scalars['UUID']['input'];
  uncensored: Scalars['Boolean']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootShowCardsArgs = {
  roomId: Scalars['UUID']['input'];
};


export type MutationRootStartNextQueueItemArgs = {
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootStartRevealCountdownArgs = {
  roomId: Scalars['UUID']['input'];
  userId?: InputMaybe<Scalars['UUID']['input']>;
};


export type MutationRootStartRevoteArgs = {
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootStartVoteQueueItemArgs = {
  itemId: Scalars['UUID']['input'];
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootToggleCensorVotesArgs = {
  enabled: Scalars['Boolean']['input'];
  roomId: Scalars['UUID']['input'];
};


export type MutationRootToggleConfirmNewGameArgs = {
  enabled: Scalars['Boolean']['input'];
  roomId: Scalars['UUID']['input'];
};


export type MutationRootToggleCountdownOptionArgs = {
  enabled: Scalars['Boolean']['input'];
  roomId: Scalars['UUID']['input'];
};


export type MutationRootToggleLockVotesArgs = {
  enabled: Scalars['Boolean']['input'];
  roomId: Scalars['UUID']['input'];
};


export type MutationRootToggleShowVoteChangesArgs = {
  enabled: Scalars['Boolean']['input'];
  roomId: Scalars['UUID']['input'];
};


export type MutationRootUnbanUserArgs = {
  roomId: Scalars['UUID']['input'];
  targetUserId: Scalars['UUID']['input'];
};


export type MutationRootUpdateDeckArgs = {
  input: UpdateDeckInput;
};

export type QueryRoot = {
  __typename?: 'QueryRoot';
  roomById?: Maybe<Room>;
  rooms: Array<Room>;
  userRooms: Array<Room>;
};


export type QueryRootRoomByIdArgs = {
  roomId: Scalars['UUID']['input'];
};


export type QueryRootUserRoomsArgs = {
  userId: Scalars['UUID']['input'];
};

export enum ReactionKind {
  Celebrate = 'CELEBRATE',
  Confused = 'CONFUSED',
  Heart = 'HEART',
  Laugh = 'LAUGH',
  RaiseHand = 'RAISE_HAND',
  ThumbsUp = 'THUMBS_UP'
}

export type Room = {
  __typename?: 'Room';
  bannedUsers: Array<Scalars['UUID']['output']>;
  censorVotes: Scalars['Boolean']['output'];
  chatHistory: Array<ChatMessage>;
  confirmNewGame: Scalars['Boolean']['output'];
  countdownEnabled: Scalars['Boolean']['output'];
  countdownValue?: Maybe<Scalars['Int']['output']>;
  currentIssueTitle?: Maybe<Scalars['String']['output']>;
  currentQueueItemId?: Maybe<Scalars['UUID']['output']>;
  deck: Deck;
  game: Game;
  hasUnreadChat?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['UUID']['output'];
  isGameOver: Scalars['Boolean']['output'];
  lockVotes: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  previousRound?: Maybe<RoundVoteHistory>;
  revealStage?: Maybe<Scalars['String']['output']>;
  roomOwnerId?: Maybe<Scalars['UUID']['output']>;
  showVoteChanges: Scalars['Boolean']['output'];
  unreadChatCount?: Maybe<Scalars['Int']['output']>;
  users: Array<User>;
  voteHistory: Array<RoundVoteHistory>;
  voteHistoryRevision?: Maybe<Scalars['String']['output']>;
  voteQueue: Array<VoteQueueItem>;
};


export type RoomHasUnreadChatArgs = {
  userId: Scalars['UUID']['input'];
};


export type RoomUnreadChatCountArgs = {
  userId?: InputMaybe<Scalars['UUID']['input']>;
};

export type RoomEvent = {
  __typename?: 'RoomEvent';
  eventType: Scalars['String']['output'];
  room: Room;
  roomId: Scalars['UUID']['output'];
  targetUserId?: Maybe<Scalars['UUID']['output']>;
};

export type RoomReaction = {
  __typename?: 'RoomReaction';
  id: Scalars['UUID']['output'];
  reaction: ReactionKind;
  roomId: Scalars['UUID']['output'];
  userId: Scalars['UUID']['output'];
};

export type RoundVoteHistory = {
  __typename?: 'RoundVoteHistory';
  completedAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  issueTitle?: Maybe<Scalars['String']['output']>;
  revoteCount: Scalars['Int']['output'];
  roundNumber: Scalars['Int']['output'];
  votes: Array<ArchivedPlayerVote>;
};

export type SendChatInput = {
  content: Scalars['String']['input'];
  contentType: Scalars['String']['input'];
  formattedContent?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<ChatPositionInput>;
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
  username: Scalars['String']['input'];
};

export type SubscriptionRoot = {
  __typename?: 'SubscriptionRoot';
  room: Room;
  roomChat: ChatMessage;
  roomEvents: RoomEvent;
  roomReactions: RoomReaction;
};


export type SubscriptionRootRoomArgs = {
  roomId: Scalars['UUID']['input'];
};


export type SubscriptionRootRoomChatArgs = {
  roomId: Scalars['UUID']['input'];
};


export type SubscriptionRootRoomEventsArgs = {
  roomId: Scalars['UUID']['input'];
};


export type SubscriptionRootRoomReactionsArgs = {
  roomId: Scalars['UUID']['input'];
};

export type UpdateDeckInput = {
  cards: Array<Scalars['String']['input']>;
  roomId: Scalars['UUID']['input'];
};

export type User = {
  __typename?: 'User';
  handRaised: Scalars['Boolean']['output'];
  id: Scalars['UUID']['output'];
  lastCardPicked?: Maybe<Scalars['String']['output']>;
  lastCardValue?: Maybe<Scalars['Float']['output']>;
  lastSeenChatMessageId?: Maybe<Scalars['UUID']['output']>;
  previousCardPicked?: Maybe<Scalars['String']['output']>;
  previousCardValue?: Maybe<Scalars['Float']['output']>;
  username: Scalars['String']['output'];
  voteUncensored: Scalars['Boolean']['output'];
};

export type UserCard = {
  __typename?: 'UserCard';
  card?: Maybe<Scalars['String']['output']>;
  userId: Scalars['UUID']['output'];
};

export type UserInput = {
  id: Scalars['UUID']['input'];
  lastCardPicked?: InputMaybe<Scalars['String']['input']>;
  roomName?: InputMaybe<Scalars['String']['input']>;
  username: Scalars['String']['input'];
};

export type VoteQueueItem = {
  __typename?: 'VoteQueueItem';
  id: Scalars['UUID']['output'];
  title: Scalars['String']['output'];
};
