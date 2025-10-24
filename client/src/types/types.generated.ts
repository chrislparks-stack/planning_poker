export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  UUID: { input: string; output: string; }
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
  banUser: Room;
  cancelRevealCountdown: Room;
  createRoom: Room;
  createUser: User;
  editUser: User;
  joinRoom: Room;
  kickUser: Room;
  logout: Scalars['Boolean']['output'];
  pickCard: Room;
  renameRoom: Room;
  resetGame: Room;
  setRoomOwner: Room;
  showCards: Room;
  startRevealCountdown: Room;
  toggleConfirmNewGame: Room;
  toggleCountdownOption: Room;
  unbanUser: Room;
  updateDeck: Room;
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


export type MutationRootLogoutArgs = {
  userId: Scalars['UUID']['input'];
};


export type MutationRootPickCardArgs = {
  card: Scalars['String']['input'];
  roomId: Scalars['UUID']['input'];
  userId: Scalars['UUID']['input'];
};


export type MutationRootRenameRoomArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
  roomId: Scalars['UUID']['input'];
};


export type MutationRootResetGameArgs = {
  roomId: Scalars['UUID']['input'];
};


export type MutationRootSetRoomOwnerArgs = {
  roomId: Scalars['UUID']['input'];
  userId?: InputMaybe<Scalars['UUID']['input']>;
};


export type MutationRootShowCardsArgs = {
  roomId: Scalars['UUID']['input'];
};


export type MutationRootStartRevealCountdownArgs = {
  roomId: Scalars['UUID']['input'];
  userId?: InputMaybe<Scalars['UUID']['input']>;
};


export type MutationRootToggleConfirmNewGameArgs = {
  enabled: Scalars['Boolean']['input'];
  roomId: Scalars['UUID']['input'];
};


export type MutationRootToggleCountdownOptionArgs = {
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

export type Room = {
  __typename?: 'Room';
  bannedUsers: Array<Scalars['UUID']['output']>;
  confirmNewGame: Scalars['Boolean']['output'];
  countdownEnabled: Scalars['Boolean']['output'];
  countdownValue?: Maybe<Scalars['Int']['output']>;
  deck: Deck;
  game: Game;
  id: Scalars['UUID']['output'];
  isGameOver: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  revealStage?: Maybe<Scalars['String']['output']>;
  roomOwnerId?: Maybe<Scalars['UUID']['output']>;
  users: Array<User>;
};

export type RoomEvent = {
  __typename?: 'RoomEvent';
  eventType: Scalars['String']['output'];
  room: Room;
  roomId: Scalars['UUID']['output'];
  targetUserId?: Maybe<Scalars['UUID']['output']>;
};

export type SubscriptionRoot = {
  __typename?: 'SubscriptionRoot';
  room: Room;
  roomEvents: RoomEvent;
};


export type SubscriptionRootRoomArgs = {
  roomId: Scalars['UUID']['input'];
};


export type SubscriptionRootRoomEventsArgs = {
  roomId: Scalars['UUID']['input'];
};

export type UpdateDeckInput = {
  cards: Array<Scalars['String']['input']>;
  roomId: Scalars['UUID']['input'];
};

export type User = {
  __typename?: 'User';
  id: Scalars['UUID']['output'];
  lastCardPicked?: Maybe<Scalars['String']['output']>;
  lastCardValue?: Maybe<Scalars['Float']['output']>;
  username: Scalars['String']['output'];
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
